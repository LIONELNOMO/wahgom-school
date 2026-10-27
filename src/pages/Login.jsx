import { useState } from 'react'
import { FiArrowRight, FiEye, FiEyeOff, FiLoader, FiLock, FiShield, FiUser, FiWifi, FiWifiOff } from 'react-icons/fi'

const demos = [
  ['Développeur', 'dev', 'dev123'],
  ['Administration', 'admin', 'admin123'],
  ['Enseignant', 'prof', 'prof123'],
]
const applicationLogo = '/images/app-logo.png'

export default function Login({ school, onLogin, online = true }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    const result = await onLogin(username.trim(), password)
    if (!result.ok) setError(result.message)
    setBusy(false)
  }

  const fillDemo = (login, pass) => {
    setUsername(login)
    setPassword(pass)
    setError('')
  }

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-brand-deep px-12 py-10 text-white lg:flex lg:flex-col xl:px-20">
        <div className="absolute inset-0 opacity-[.055]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.65) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.65) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
        <div className="absolute -right-32 -top-28 size-[390px] rounded-full border-[75px] border-gold/5 bg-cyan/8" />
        <div className="absolute -bottom-36 -left-28 size-[330px] rounded-full border-[70px] border-white/3" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="size-13 overflow-hidden rounded-2xl bg-white p-0.5 shadow-xl shadow-black/25"><img src={applicationLogo} alt="Logo de l’application WamghomSchool" className="size-full rounded-xl object-contain" /></div>
          <div><b className="block text-base tracking-wider">WAMGHOMSCHOOL</b><span className="block text-[9px] uppercase tracking-[.23em] text-gold/70">Gestion des notes</span></div>
        </div>

        <div className="relative z-10 my-auto max-w-2xl py-16">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/8 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-gold"><FiShield /> Simple · Local · Fiable</span>
          <h1 className="font-display text-5xl font-medium leading-[1.05] tracking-[-.04em] xl:text-7xl">Les notes organisées.<br /><span className="text-gold">La réussite valorisée.</span></h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-white/55 xl:text-lg">Une solution claire et rassurante, de l’inscription de l’élève jusqu’à l’impression de son bulletin.</p>
        </div>

        <div className="relative z-10 flex items-center gap-3 text-[10px] text-white/35"><span className="h-px w-10 bg-gold/40" /> {school.motto}</div>
      </section>

      <main className="grid min-h-screen place-items-center bg-[#fbfcfd] px-5 py-10 sm:px-10">
        <div className="w-full max-w-[430px]">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="size-12 overflow-hidden rounded-xl border border-line bg-white p-0.5"><img src={applicationLogo} alt="Logo de l’application WamghomSchool" className="size-full object-contain" /></div>
            <div><b className="block text-sm tracking-wide text-brand">WAMGHOMSCHOOL</b><span className="block text-[8px] uppercase tracking-[.2em] text-slate-400">Gestion des notes</span></div>
          </div>

          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-[0_8px_24px_rgba(11,49,85,.05)]">
            <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-50 p-1"><img src={school.logo} alt="Logo de l’établissement" className="size-full object-contain" /></div>
            <div className="min-w-0"><span className="block text-[8px] font-bold uppercase tracking-[.18em] text-slate-400">Établissement</span><b className="block truncate text-xs text-brand">{school.name}</b><span className="block truncate text-[9px] text-slate-400">Année scolaire {school.academicYear}</span></div>
          </div>

          <span className="section-kicker">Espace sécurisé</span>
          <span className={`mb-3 ml-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold ${online ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{online ? <FiWifi /> : <FiWifiOff />}{online ? 'En ligne' : 'Mode hors ligne'}</span>
          <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight text-brand">Bon retour parmi nous</h2>
          <p className="mt-2 text-sm text-slate-500">Connectez-vous pour accéder à votre espace de travail.</p>

          <form className="mt-8 space-y-5" onSubmit={submit}>
            <label className="block">
              <span className="field-label">Identifiant</span>
              <div className="relative"><FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input className="field !py-3 !pl-11" value={username} onChange={(e) => { setUsername(e.target.value); setError('') }} placeholder="Votre identifiant" autoComplete="username" required /></div>
            </label>
            <label className="block">
              <span className="field-label">Mot de passe</span>
              <div className="relative"><FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input className="field !py-3 !pl-11 !pr-11" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => { setPassword(e.target.value); setError('') }} placeholder="Votre mot de passe" autoComplete="current-password" required /><button type="button" className="icon-button absolute right-1.5 top-1/2 -translate-y-1/2" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>{showPassword ? <FiEyeOff /> : <FiEye />}</button></div>
            </label>
            <div className="min-h-5 text-xs font-medium text-red-600" role="alert">{error}</div>
            <button className="btn-primary w-full !py-3.5 !text-sm" type="submit" disabled={busy}>{busy ? <><FiLoader className="animate-spin" /> Connexion…</> : <>Se connecter <FiArrowRight size={17} /></>}</button>
          </form>

          <details className="group mt-7 border-t border-line pt-5">
            <summary className="cursor-pointer list-none text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 transition hover:text-brand">Voir les accès de démonstration</summary>
            <div className="mt-3 space-y-2">
              {demos.map(([label, login, pass]) => <button key={login} type="button" onClick={() => fillDemo(login, pass)} className="flex w-full items-center justify-between rounded-xl border border-line bg-white px-3.5 py-2.5 text-left transition hover:border-cyan/50 hover:bg-cyan/5"><b className="text-[11px] text-slate-700">{label}</b><span className="font-mono text-[10px] text-slate-400">{login} / {pass}</span></button>)}
            </div>
          </details>
          <p className="mt-7 flex items-center justify-center gap-1.5 text-center text-[10px] text-slate-400"><FiLock /> Les données restent enregistrées sur cet appareil.</p>
        </div>
      </main>
    </div>
  )
}
