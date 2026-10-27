import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Layout from './components/Layout'
import IntroSplash from './components/IntroSplash'
import Toast from './components/Toast'
import { createInitialDatabase } from './data/seed'
import { api, ApiError } from './lib/api'
import {
  clearConflict, clearPendingSnapshot, getConflict, getPendingSnapshot, getSyncMeta,
  initializeOfflineStore, persistDatabase, queueSnapshot, rememberOfflineLogin,
  saveConflict, saveSyncMeta, verifyOfflineLogin,
} from './lib/offlineDb'
import { downloadBackup, getSession, loadDatabase, saveDatabase, setSession } from './lib/store'
import Bulletins from './pages/Bulletins'
import Classes from './pages/Classes'
import Dashboard from './pages/Dashboard'
import Grades from './pages/Grades'
import Login from './pages/Login'
import Settings from './pages/Settings'
import Students from './pages/Students'
import Teachers from './pages/Teachers'
import Users from './pages/Users'

const allowedPages = {
  developer: ['dashboard', 'students', 'teachers', 'classes', 'grades', 'bulletins', 'users', 'settings'],
  administration: ['dashboard', 'teachers', 'bulletins', 'settings'],
  teacher: ['dashboard', 'grades'],
}

function mergeRemoteSnapshot(remote, current) {
  if (!remote) return current
  const localUsers = new Map((current?.users || []).map((item) => [item.id, item]))
  return {
    ...remote,
    users: (remote.users || []).map((item) => {
      const local = localUsers.get(item.id)
      return { ...local, ...item, passwordHash: item.passwordHash || local?.passwordHash }
    }),
  }
}

const initialSyncState = {
  online: navigator.onLine,
  status: navigator.onLine ? 'ready' : 'offline',
  pendingCount: 0,
  lastSyncedAt: null,
  message: navigator.onLine ? 'Prêt à synchroniser' : 'Travail hors connexion',
}

function shouldPlayIntro() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false
  try {
    return sessionStorage.getItem('wamghom_intro_seen_v1') !== 'yes'
  } catch {
    return true
  }
}

export default function App() {
  const [db, setDb] = useState(() => loadDatabase(createInitialDatabase))
  const [sessionId, setSessionId] = useState(() => getSession())
  const [page, setPage] = useState('dashboard')
  const [toast, setToast] = useState(null)
  const [syncState, setSyncState] = useState(initialSyncState)
  const [offlineReady, setOfflineReady] = useState(false)
  const [showIntro, setShowIntro] = useState(shouldPlayIntro)
  const dbRef = useRef(db)
  const sessionRef = useRef(sessionId)
  const syncLock = useRef(false)
  const syncTimer = useRef(null)
  const syncNowRef = useRef(null)
  const user = useMemo(() => db.users.find((item) => item.id === sessionId && item.active), [db.users, sessionId])

  useEffect(() => { dbRef.current = db }, [db])
  useEffect(() => { sessionRef.current = sessionId }, [sessionId])

  const notify = useCallback((type, title, message = '') => setToast({ id: Date.now(), type, title, message }), [])
  const completeIntro = useCallback(() => {
    try { sessionStorage.setItem('wamghom_intro_seen_v1', 'yes') } catch { /* stockage privé indisponible */ }
    setShowIntro(false)
  }, [])

  const applyRemoteDatabase = useCallback(async (snapshot) => {
    const merged = mergeRemoteSnapshot(snapshot, dbRef.current)
    const saved = saveDatabase(merged)
    dbRef.current = saved
    setDb(saved)
    await persistDatabase(saved)
    return saved
  }, [])

  useEffect(() => {
    let active = true
    initializeOfflineStore(dbRef.current).then(({ state, meta, pending, conflict }) => {
      if (!active) return
      const saved = saveDatabase(state)
      dbRef.current = saved
      setDb(saved)
      persistDatabase(saved).catch(console.error)
      setSyncState((current) => ({
        ...current,
        status: conflict ? 'conflict' : navigator.onLine ? (pending ? 'pending' : 'ready') : 'offline',
        pendingCount: pending?.changeCount || 0,
        lastSyncedAt: meta.lastSyncedAt,
        message: conflict ? 'Conflit à résoudre' : pending ? 'Modifications en attente' : navigator.onLine ? 'Données à jour' : 'Travail hors connexion',
      }))
      setOfflineReady(true)
    }).catch((error) => {
      console.error(error)
      setOfflineReady(true)
      notify('error', 'Stockage hors ligne indisponible', 'Le navigateur ne permet pas d’ouvrir IndexedDB.')
    })
    return () => { active = false }
  }, [notify])

  const syncNow = useCallback(async (force = false) => {
    const currentUser = dbRef.current.users.find((item) => item.id === sessionRef.current && item.active)
    if (!currentUser || syncLock.current) return false
    if (!navigator.onLine) {
      setSyncState((current) => ({ ...current, online: false, status: 'offline', message: 'Travail hors connexion' }))
      return false
    }

    syncLock.current = true
    setSyncState((current) => ({ ...current, online: true, status: 'syncing', message: 'Synchronisation…' }))
    try {
      const meta = await getSyncMeta()
      const pending = await getPendingSnapshot()
      const response = pending
        ? await api.push({ clientId: meta.clientId, mutationId: pending.id, baseRevision: meta.revision, snapshot: pending.snapshot, force })
        : await api.pull()

      if (response.conflict) {
        const conflict = { ...response, localSnapshot: pending?.snapshot || dbRef.current, detectedAt: new Date().toISOString() }
        await saveConflict(conflict)
        setSyncState((current) => ({ ...current, status: 'conflict', pendingCount: pending?.changeCount || 1, message: 'Conflit à résoudre' }))
        return false
      }

      if (response.snapshot) await applyRemoteDatabase(response.snapshot)
      if (pending) await clearPendingSnapshot()
      await clearConflict()
      const lastSyncedAt = new Date().toISOString()
      await saveSyncMeta({ ...meta, revision: response.revision ?? meta.revision, lastSyncedAt })
      setSyncState({ online: true, status: 'ready', pendingCount: 0, lastSyncedAt, message: 'Toutes les données sont à jour' })
      return true
    } catch (error) {
      const unauthorized = error instanceof ApiError && error.status === 401
      setSyncState((current) => ({
        ...current,
        online: navigator.onLine,
        status: unauthorized ? 'auth-required' : navigator.onLine ? 'error' : 'offline',
        message: unauthorized ? 'Reconnectez-vous pour synchroniser' : navigator.onLine ? 'Serveur temporairement indisponible' : 'Travail hors connexion',
      }))
      return false
    } finally {
      syncLock.current = false
    }
  }, [applyRemoteDatabase])

  useEffect(() => { syncNowRef.current = syncNow }, [syncNow])

  useEffect(() => {
    if (!offlineReady || !user) return undefined
    const online = () => { setSyncState((current) => ({ ...current, online: true, message: 'Connexion rétablie' })); syncNowRef.current?.() }
    const offline = () => setSyncState((current) => ({ ...current, online: false, status: 'offline', message: 'Travail hors connexion' }))
    const visible = () => document.visibilityState === 'visible' && navigator.onLine && syncNowRef.current?.()
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    document.addEventListener('visibilitychange', visible)
    const interval = window.setInterval(() => navigator.onLine && syncNowRef.current?.(), 45000)
    syncNowRef.current?.()
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
      document.removeEventListener('visibilitychange', visible)
      window.clearInterval(interval)
    }
  }, [offlineReady, user?.id])

  const updateDatabase = useCallback((updater) => {
    setDb((current) => {
      const next = saveDatabase(typeof updater === 'function' ? updater(current) : updater)
      dbRef.current = next
      persistDatabase(next).catch(console.error)
      if (sessionRef.current) {
        queueSnapshot(next, sessionRef.current).then((pending) => {
          setSyncState((state) => ({ ...state, status: navigator.onLine ? 'pending' : 'offline', pendingCount: pending.changeCount, message: navigator.onLine ? 'Modifications en attente' : `${pending.changeCount} modification(s) hors ligne` }))
          window.clearTimeout(syncTimer.current)
          syncTimer.current = window.setTimeout(() => syncNowRef.current?.(), 1200)
        }).catch(console.error)
      }
      return next
    })
  }, [])

  const replaceDatabase = useCallback((next) => updateDatabase(next), [updateDatabase])
  const resetDatabase = useCallback(() => {
    updateDatabase(createInitialDatabase())
    setPage('dashboard')
    notify('success', 'Application réinitialisée', 'Les données de démonstration seront synchronisées.')
  }, [notify, updateDatabase])

  const login = async (username, password) => {
    const normalized = username.trim().toLowerCase()
    if (navigator.onLine) {
      try {
        const response = await api.login(normalized, password)
        const pending = await getPendingSnapshot()
        if (!pending && response.snapshot) {
          await applyRemoteDatabase(response.snapshot)
          const meta = await getSyncMeta()
          await saveSyncMeta({ ...meta, revision: response.revision || 0, lastSyncedAt: new Date().toISOString() })
        }
        await rememberOfflineLogin(normalized, password, response.user.id)
        setSession(response.user.id)
        sessionRef.current = response.user.id
        setSessionId(response.user.id)
        setPage('dashboard')
        window.setTimeout(() => syncNowRef.current?.(), 100)
        return { ok: true }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return { ok: false, message: 'Identifiant ou mot de passe incorrect.' }
      }
    }

    const offlineUserId = await verifyOfflineLogin(normalized, password)
    const account = dbRef.current.users.find((item) => item.id === offlineUserId)
    if (!account || !account.active) return { ok: false, message: 'Connexion hors ligne impossible. Connectez-vous une première fois avec Internet.' }
    setSession(account.id)
    sessionRef.current = account.id
    setSessionId(account.id)
    setPage('dashboard')
    setSyncState((current) => ({ ...current, online: false, status: 'offline', message: 'Session hors ligne' }))
    return { ok: true }
  }

  const logout = () => {
    if (navigator.onLine) api.logout().catch(() => {})
    setSession(null)
    sessionRef.current = null
    setSessionId(null)
    setPage('dashboard')
  }

  const resolveConflict = async (choice) => {
    const conflict = await getConflict()
    if (!conflict) return
    if (choice === 'server') {
      await applyRemoteDatabase(conflict.serverSnapshot)
      await clearPendingSnapshot()
      await clearConflict()
      const meta = await getSyncMeta()
      const lastSyncedAt = new Date().toISOString()
      await saveSyncMeta({ ...meta, revision: conflict.revision, lastSyncedAt })
      setSyncState({ online: navigator.onLine, status: 'ready', pendingCount: 0, lastSyncedAt, message: 'Version du serveur conservée' })
      notify('success', 'Conflit résolu', 'La version enregistrée sur le serveur a été conservée.')
      return
    }
    const success = await syncNow(true)
    if (success) notify('success', 'Conflit résolu', 'Vos modifications locales ont été envoyées au serveur.')
  }

  const navigate = (nextPage) => {
    if (user && allowedPages[user.role]?.includes(nextPage)) setPage(nextPage)
  }

  if (showIntro) return <IntroSplash onComplete={completeIntro} />
  if (!offlineReady) return <div className="grid min-h-screen place-items-center bg-mist"><div className="text-center"><span className="mx-auto block size-9 animate-spin rounded-full border-4 border-brand/15 border-t-brand" /><p className="mt-4 text-xs font-bold text-brand">Ouverture de la base locale…</p></div></div>
  if (!user) return <Login school={db.school} onLogin={login} online={syncState.online} />

  const activePage = allowedPages[user.role].includes(page) ? page : 'dashboard'
  const shared = { db, onUpdate: updateDatabase, notify }
  let content
  switch (activePage) {
    case 'students': content = <Students {...shared} />; break
    case 'teachers': content = <Teachers {...shared} user={user} />; break
    case 'classes': content = <Classes {...shared} />; break
    case 'grades': content = <Grades {...shared} user={user} />; break
    case 'bulletins': content = <Bulletins db={db} onUpdate={updateDatabase} notify={notify} user={user} />; break
    case 'users': content = <Users {...shared} currentUser={user} />; break
    case 'settings': content = <Settings {...shared} user={user} onReplace={replaceDatabase} onReset={resetDatabase} />; break
    default: content = <Dashboard db={db} user={user} onNavigate={navigate} />
  }

  return (
    <>
      <Layout db={db} user={user} page={activePage} onNavigate={navigate} onLogout={logout} onBackup={() => { downloadBackup(db); notify('success', 'Sauvegarde téléchargée', 'Le fichier contient toutes les données locales.') }} syncState={syncState} onSync={() => syncNow()} onResolveConflict={resolveConflict}>
        {content}
      </Layout>
      {toast && <div className="fixed bottom-5 right-5 z-[200]"><Toast key={toast.id} toast={toast} onDone={() => setToast(null)} /></div>}
    </>
  )
}
