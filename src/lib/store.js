const DB_KEY = 'wamghomschool_db_v1'
const SESSION_KEY = 'wamghomschool_session_v1'
const SCHOOL_LOGO = '/images/school-logo.png'
const LEGACY_SCHOOL_LOGOS = new Set(['/icons/icon-512.png', '/icons/school-icon-512.png'])

function normalizeBranding(data) {
  if (!data?.school || !LEGACY_SCHOOL_LOGOS.has(data.school.logo)) return data
  return { ...data, school: { ...data.school, logo: SCHOOL_LOGO } }
}

export function hashPassword(value = '') {
  let hash = 2166136261
  const bytes = new TextEncoder().encode(value)
  for (const byte of bytes) {
    hash ^= byte
    hash = Math.imul(hash, 16777619)
  }
  return `local-${(hash >>> 0).toString(16)}`
}

export function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function loadDatabase(factory) {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) return normalizeBranding(JSON.parse(raw))
  } catch (error) {
    console.error('Impossible de lire la base locale', error)
  }
  const initial = factory()
  saveDatabase(initial)
  return initial
}

export function saveDatabase(data) {
  const branded = normalizeBranding(data)
  const next = { ...branded, meta: { ...branded.meta, updatedAt: new Date().toISOString() } }
  localStorage.setItem(DB_KEY, JSON.stringify(next))
  return next
}

export function getSession() {
  // Une nouvelle ouverture exige une authentification, y compris hors ligne.
  // Les données restent persistantes dans IndexedDB, mais pas la session UI.
  localStorage.removeItem(SESSION_KEY)
  return sessionStorage.getItem(SESSION_KEY)
}

export function setSession(userId) {
  if (userId) sessionStorage.setItem(SESSION_KEY, userId)
  else sessionStorage.removeItem(SESSION_KEY)
}

export function downloadBackup(data) {
  const date = new Date().toISOString().slice(0, 10)
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `wamghomschool-sauvegarde-${date}.json`
  link.click()
  URL.revokeObjectURL(url)
}

export async function readBackup(file) {
  const data = JSON.parse(await file.text())
  const required = ['school', 'users', 'students', 'subjects', 'classes', 'grades']
  if (!required.every((key) => Object.hasOwn(data, key))) {
    throw new Error('Ce fichier ne contient pas une sauvegarde WamghomSchool valide.')
  }
  return data
}

export function clearDatabase() {
  localStorage.removeItem(DB_KEY)
  localStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(SESSION_KEY)
}

export function addActivity(db, activity) {
  return {
    ...db,
    activities: [
      { id: uid('act'), at: new Date().toISOString(), ...activity },
      ...(db.activities || []),
    ].slice(0, 80),
  }
}
