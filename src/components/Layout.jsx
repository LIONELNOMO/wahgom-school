import { useEffect, useState } from 'react'
import {
  FiAlertTriangle, FiBookOpen, FiCheckCircle, FiChevronRight, FiClipboard, FiCloud, FiDatabase, FiDownload, FiGrid,
  FiHome, FiLogOut, FiMenu, FiMoreHorizontal, FiPrinter, FiSettings, FiShield, FiUserCheck,
  FiRefreshCw, FiSmartphone, FiUsers, FiWifiOff, FiX,
} from 'react-icons/fi'

const navByRole = {
  developer: [
    { section: 'Vue générale' },
    { id: 'dashboard', label: 'Tableau de bord', icon: FiHome },
    { section: 'Gestion scolaire' },
    { id: 'students', label: 'Élèves', icon: FiUsers },
    { id: 'teachers', label: 'Enseignants', icon: FiUserCheck },
    { id: 'classes', label: 'Classes & séries', icon: FiGrid },
    { id: 'grades', label: 'Saisie des notes', icon: FiClipboard },
    { id: 'bulletins', label: 'Bulletins', icon: FiPrinter },
    { section: 'Administration' },
    { id: 'users', label: 'Utilisateurs', icon: FiShield },
    { id: 'settings', label: 'Paramètres', icon: FiSettings },
  ],
  administration: [
    { section: 'Vue générale' },
    { id: 'dashboard', label: 'Tableau de bord', icon: FiHome },
    { section: 'Documents' },
    { id: 'teachers', label: 'Enseignants', icon: FiUserCheck },
    { id: 'bulletins', label: 'Bulletins', icon: FiPrinter },
    { section: 'Configuration' },
    { id: 'settings', label: 'Paramètres', icon: FiSettings },
  ],
  teacher: [
    { section: 'Mon espace' },
    { id: 'dashboard', label: 'Tableau de bord', icon: FiHome },
    { id: 'grades', label: 'Saisie des notes', icon: FiClipboard },
  ],
}

// Barre de navigation du bas sur téléphone : au plus quatre entrées,
// les autres rubriques restant accessibles par le bouton « Plus ».
const mobileNavByRole = {
  developer: ['dashboard', 'students', 'grades', 'bulletins'],
  administration: ['dashboard', 'teachers', 'bulletins'],
  teacher: ['dashboard', 'grades'],
}

// Intitulés courts, lisibles sous une icône de barre d’onglets.
const mobileLabels = {
  dashboard: 'Accueil',
  students: 'Élèves',
  teachers: 'Profs',
  classes: 'Classes',
  grades: 'Notes',
  bulletins: 'Bulletins',
  users: 'Comptes',
  settings: 'Réglages',
}

const roleLabels = { developer: 'Développeur', administration: 'Administration', teacher: 'Enseignant' }
const applicationLogo = '/images/app-logo.png'

export default function Layout({ db, user, page, onNavigate, onLogout, onBackup, syncState, onSync, onResolveConflict, children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [conflictOpen, setConflictOpen] = useState(false)
  const nav = navByRole[user.role] || navByRole.administration
  const initials = user.name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  const navItems = nav.filter((item) => item.id)
  const mobileIds = mobileNavByRole[user.role] || mobileNavByRole.administration
  const mobileItems = mobileIds.map((id) => navItems.find((item) => item.id === id)).filter(Boolean)
  const extraItems = navItems.filter((item) => !mobileIds.includes(item.id))
  const extraActive = extraItems.some((item) => item.id === page)

  const go = (id) => {
    onNavigate(id)
    setMenuOpen(false)
  }

  useEffect(() => {
    const capturePrompt = () => setInstallPrompt(window.__wamghomInstallPrompt || null)
    const installed = () => setInstallPrompt(null)
    capturePrompt()
    window.addEventListener('wamghom:pwa-ready', capturePrompt)
    window.addEventListener('wamghom:pwa-installed', installed)
    return () => {
      window.removeEventListener('wamghom:pwa-ready', capturePrompt)
      window.removeEventListener('wamghom:pwa-installed', installed)
    }
  }, [])

  const installApp = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    await installPrompt.userChoice
    window.__wamghomInstallPrompt = null
    setInstallPrompt(null)
  }

  const syncVisual = syncState.status === 'offline'
    ? { icon: FiWifiOff, label: 'Hors ligne', detail: syncState.pendingCount ? `${syncState.pendingCount} en attente` : 'Données locales', style: 'bg-amber-50 text-amber-700' }
    : syncState.status === 'syncing'
      ? { icon: FiRefreshCw, label: 'Synchronisation', detail: 'En cours…', style: 'bg-blue-50 text-blue-700' }
      : syncState.status === 'pending'
        ? { icon: FiCloud, label: `${syncState.pendingCount} en attente`, detail: 'Envoi automatique', style: 'bg-amber-50 text-amber-700' }
        : syncState.status === 'conflict'
          ? { icon: FiAlertTriangle, label: 'Conflit', detail: 'Action requise', style: 'bg-red-50 text-red-700' }
          : syncState.status === 'error' || syncState.status === 'auth-required'
            ? { icon: FiAlertTriangle, label: 'Non synchronisé', detail: syncState.message, style: 'bg-red-50 text-red-700' }
            : { icon: FiCheckCircle, label: 'À jour', detail: 'Serveur synchronisé', style: 'bg-emerald-50 text-emerald-700' }
  const SyncIcon = syncVisual.icon
  const handleSyncClick = () => syncState.status === 'conflict' ? setConflictOpen(true) : onSync()

  return (
    <div className="min-h-screen bg-mist">
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-64 flex-col overflow-hidden bg-brand-deep text-white shadow-2xl transition-transform duration-300 lg:w-64 lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-[78px] items-center justify-between border-b border-white/8 px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-white shadow-lg shadow-black/20">
              <img src={applicationLogo} alt="Logo de l’application WamghomSchool" className="size-full object-contain" />
            </div>
            <div className="min-w-0"><b className="block truncate text-sm tracking-wide">WAMGHOM</b><span className="block text-[9px] uppercase tracking-[.18em] text-white/45">Gestion des notes</span></div>
          </div>
          <button className="icon-button !text-white/70 hover:!bg-white/10 lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Fermer le menu"><FiX size={20} /></button>
        </div>

        <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-5">
          {nav.map((item, index) => item.section ? (
            <span key={`${item.section}-${index}`} className="mb-2 mt-5 block px-3 text-[8px] font-extrabold uppercase tracking-[.22em] text-white/30 first:mt-0">{item.section}</span>
          ) : (
            <button key={item.id} onClick={() => go(item.id)} className={`group mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${page === item.id ? 'bg-white/12 text-white shadow-inner' : 'text-white/58 hover:translate-x-0.5 hover:bg-white/6 hover:text-white'}`}>
              <span className={`grid size-8 place-items-center rounded-lg transition ${page === item.id ? 'bg-gold text-brand-deep' : 'bg-white/5 text-white/60 group-hover:text-gold'}`}><item.icon size={16} /></span>
              <span className="flex-1">{item.label}</span>
              {page === item.id && <FiChevronRight size={13} className="text-gold" />}
            </button>
          ))}
        </nav>

        <div className="border-t border-white/8 p-3">
          <button onClick={handleSyncClick} className="mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/5">
            <span className={`grid size-8 place-items-center rounded-lg ${syncState.status === 'offline' || syncState.status === 'pending' ? 'bg-amber-400/10 text-amber-300' : syncState.status === 'conflict' || syncState.status === 'error' ? 'bg-red-400/10 text-red-300' : 'bg-emerald-400/10 text-emerald-300'}`}><SyncIcon className={syncState.status === 'syncing' ? 'animate-spin' : ''} size={15} /></span>
            <div className="min-w-0 flex-1"><b className="block text-[10px] text-white/75">{syncVisual.label}</b><span className="block truncate text-[8px] text-white/35">{syncVisual.detail}</span></div>
            <span className={`size-1.5 rounded-full ${syncState.online ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          </button>
          <button onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-white/45 transition hover:bg-red-400/10 hover:text-red-200"><FiLogOut size={16} /> Déconnexion</button>
        </div>
      </aside>

      {menuOpen && <button className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Fermer le menu" />}

      <div className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-30 flex h-[70px] items-center justify-between border-b border-line bg-white/92 px-2.5 backdrop-blur-xl min-[380px]:px-4 sm:h-[78px] sm:px-6 lg:px-9">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 min-[380px]:gap-2.5">
            {/* Sur téléphone la navigation passe par la barre du bas. */}
            <button className="icon-button hidden shrink-0 sm:grid lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Ouvrir le menu"><FiMenu size={21} /></button>
            <div className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-white p-0.5 sm:size-10 sm:rounded-xl"><img src={db.school.logo} alt="Logo de l’établissement" className="size-full object-contain" /></div>
            <div className="min-w-0"><b className="block max-w-[116px] truncate text-[11px] text-brand min-[380px]:max-w-[180px] sm:text-sm lg:max-w-xs">{db.school.name}</b><span className="hidden truncate text-[8px] text-slate-400 min-[360px]:block sm:text-[9px]">Année scolaire {db.school.academicYear}</span></div>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2 lg:gap-4">
            <button className={`hidden items-center gap-2 rounded-xl px-3 py-2 text-[9px] font-bold transition md:flex ${syncVisual.style}`} onClick={handleSyncClick} title={syncState.message}><SyncIcon className={syncState.status === 'syncing' ? 'animate-spin' : ''} size={14} /><span>{syncVisual.label}</span></button>
            {installPrompt && <button className="icon-button" onClick={installApp} title="Installer l’application" aria-label="Installer l’application"><FiSmartphone size={17} /></button>}
            <button className="icon-button hidden md:grid" onClick={onBackup} title="Exporter une sauvegarde"><FiDownload size={17} /></button>
            <div className="hidden h-8 w-px bg-line sm:block" />
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-full bg-brand text-[9px] font-black text-white sm:size-9 sm:text-[10px]">{initials}</span>
              <div className="hidden sm:block"><b className="block max-w-40 truncate text-[11px] text-slate-700">{user.name}</b><span className="block text-[9px] text-slate-400">{roleLabels[user.role]}</span></div>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] px-4 py-7 pb-[calc(76px+env(safe-area-inset-bottom))] sm:px-6 lg:px-9 lg:py-9 lg:pb-9">{children}</main>
      </div>

      <nav className="mobile-tabbar fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur-xl lg:hidden" aria-label="Navigation principale">
        <div className="flex items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
          {mobileItems.map((item) => {
            const active = page === item.id
            return (
              <button
                key={item.id}
                onClick={() => go(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 px-1 pb-2 pt-2.5 transition ${active ? 'text-brand' : 'text-slate-400'}`}
              >
                <span className={`grid h-7 w-12 shrink-0 place-items-center rounded-full transition ${active ? 'bg-brand-soft text-brand' : 'text-slate-400'}`}><item.icon size={19} /></span>
                <span className={`max-w-full truncate text-[9px] leading-none ${active ? 'font-bold' : 'font-semibold'}`}>{mobileLabels[item.id] || item.label}</span>
              </button>
            )
          })}
          {extraItems.length > 0 && (
            <button
              onClick={() => setMenuOpen(true)}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 px-1 pb-2 pt-2.5 transition ${extraActive ? 'text-brand' : 'text-slate-400'}`}
            >
              <span className={`grid h-7 w-12 shrink-0 place-items-center rounded-full transition ${extraActive ? 'bg-brand-soft text-brand' : 'text-slate-400'}`}><FiMoreHorizontal size={19} /></span>
              <span className={`max-w-full truncate text-[9px] leading-none ${extraActive ? 'font-bold' : 'font-semibold'}`}>Plus</span>
            </button>
          )}
        </div>
      </nav>
      {conflictOpen && <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={() => setConflictOpen(false)}><section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-red-50 text-red-700"><FiAlertTriangle size={20} /></span><div><h2 className="font-display text-xl font-semibold text-brand">Conflit de synchronisation</h2><p className="mt-1 text-xs leading-5 text-slate-500">Des données ont été modifiées sur un autre appareil pendant votre travail hors ligne. Choisissez la version à conserver.</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><button className="btn-secondary !h-auto !items-start !p-4 !text-left" onClick={async () => { await onResolveConflict('server'); setConflictOpen(false) }}><FiCloud className="mt-0.5 shrink-0" /><span><b className="block text-[11px]">Version du serveur</b><small className="mt-1 block text-[9px] font-normal leading-4 text-slate-400">Abandonne les modifications locales en attente.</small></span></button><button className="btn-primary !h-auto !items-start !p-4 !text-left" onClick={async () => { await onResolveConflict('local'); setConflictOpen(false) }}><FiDatabase className="mt-0.5 shrink-0" /><span><b className="block text-[11px]">Ma version locale</b><small className="mt-1 block text-[9px] font-normal leading-4 text-white/65">Remplace la version distante après confirmation.</small></span></button></div><button className="mt-4 w-full text-center text-[10px] font-bold text-slate-400 hover:text-brand" onClick={() => setConflictOpen(false)}>Décider plus tard</button></section></div>}
    </div>
  )
}
