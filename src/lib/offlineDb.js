const DATABASE_NAME = 'wamghomschool-offline'
const DATABASE_VERSION = 1
const STORE_NAME = 'keyval'

let connectionPromise
let snapshotQueue = Promise.resolve()

function openDatabase() {
  if (connectionPromise) return connectionPromise
  connectionPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return connectionPromise
}

async function transact(mode, operation) {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode)
    const store = transaction.objectStore(STORE_NAME)
    let request
    try {
      request = operation(store)
    } catch (error) {
      reject(error)
      return
    }
    transaction.oncomplete = () => resolve(request?.result)
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

export const localGet = (key) => transact('readonly', (store) => store.get(key))
export const localSet = (key, value) => transact('readwrite', (store) => store.put(value, key))
export const localDelete = (key) => transact('readwrite', (store) => store.delete(key))

export async function initializeOfflineStore(fallbackState) {
  const cached = await localGet('database')
  const state = cached || fallbackState
  if (!cached) await localSet('database', state)

  let meta = await localGet('sync-meta')
  if (!meta) {
    meta = {
      clientId: crypto.randomUUID?.() || `client-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      revision: 0,
      lastSyncedAt: null,
    }
    await localSet('sync-meta', meta)
  }
  return { state, meta, pending: await localGet('outbox'), conflict: await localGet('conflict') }
}

export async function persistDatabase(state) {
  await localSet('database', state)
}

export function queueSnapshot(snapshot, userId) {
  const operation = snapshotQueue.then(async () => {
    const current = await localGet('outbox')
    const queued = {
      id: current?.id || crypto.randomUUID?.() || `mutation-${Date.now()}`,
      snapshot,
      userId,
      changeCount: (current?.changeCount || 0) + 1,
      firstQueuedAt: current?.firstQueuedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await localSet('outbox', queued)
    return queued
  })
  snapshotQueue = operation.catch(() => {})
  return operation
}

export const getPendingSnapshot = () => localGet('outbox')
export const clearPendingSnapshot = () => localDelete('outbox')
export const getSyncMeta = () => localGet('sync-meta')
export const saveSyncMeta = (meta) => localSet('sync-meta', meta)
export const getConflict = () => localGet('conflict')
export const saveConflict = (conflict) => localSet('conflict', conflict)
export const clearConflict = () => localDelete('conflict')

function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...bytes))
}

async function passwordVerifier(password, saltBase64) {
  const encoder = new TextEncoder()
  const salt = Uint8Array.from(atob(saltBase64), (character) => character.charCodeAt(0))
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 180000 }, key, 256)
  return bytesToBase64(new Uint8Array(bits))
}

export async function rememberOfflineLogin(username, password, userId) {
  if (!crypto.subtle) return
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const saltBase64 = bytesToBase64(salt)
  const verifier = await passwordVerifier(password, saltBase64)
  await localSet(`credential:${username.toLowerCase()}`, { userId, salt: saltBase64, verifier })
}

export async function verifyOfflineLogin(username, password) {
  if (!crypto.subtle) return null
  const credential = await localGet(`credential:${username.toLowerCase()}`)
  if (!credential) return null
  const verifier = await passwordVerifier(password, credential.salt)
  return verifier === credential.verifier ? credential.userId : null
}

export async function clearOfflineStore() {
  if (connectionPromise) {
    const database = await connectionPromise
    database.close()
    connectionPromise = null
  }
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME)
    request.onsuccess = resolve
    request.onerror = () => reject(request.error)
    request.onblocked = resolve
  })
}
