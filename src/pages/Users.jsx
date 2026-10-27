import { useState } from 'react'
import { FiEdit2, FiKey, FiPlus, FiShield, FiTrash2, FiUserCheck } from 'react-icons/fi'
import Modal from '../components/Modal'
import { addActivity, hashPassword, uid } from '../lib/store'

const roleLabels = { developer: 'Développeur', administration: 'Administration', teacher: 'Enseignant' }
const roleStyles = { developer: 'bg-violet-50 text-violet-700', administration: 'bg-blue-50 text-blue-700', teacher: 'bg-gold-soft text-[#896118]' }

function UserForm({ user, db, onSave, onClose }) {
  const [form, setForm] = useState({ name: user?.name || '', username: user?.username || '', password: '', active: user?.active ?? true })
  const valid = form.name.trim() && form.username.trim() && (user || form.password.length >= 4)
  return <form onSubmit={(event) => { event.preventDefault(); if (valid) onSave(form) }}><div className="space-y-4"><label className="block"><span className="field-label">Nom du compte *</span><input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex. Secrétariat" required /></label><label className="block"><span className="field-label">Identifiant *</span><input className="field" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, '') })} required /></label><label className="block"><span className="field-label">{user ? 'Nouveau mot de passe' : 'Mot de passe *'}</span><input className="field" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={user ? 'Laisser vide pour conserver' : '4 caractères minimum'} /></label><label className="flex items-center gap-3 rounded-xl border border-line p-3"><input className="size-4 accent-[#0f8f99]" type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /><span><b className="block text-[11px] text-slate-700">Compte actif</b><small className="text-[9px] text-slate-400">L’utilisateur peut se connecter.</small></span></label></div><div className="mt-6 flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={onClose}>Annuler</button><button className="btn-primary" disabled={!valid}>{user ? 'Enregistrer' : 'Créer l’administrateur'}</button></div></form>
}

export default function Users({ db, currentUser, onUpdate, notify }) {
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)
  const save = (form) => {
    if (db.users.some((item) => item.username.toLowerCase() === form.username.toLowerCase() && item.id !== editing?.id)) return notify('error', 'Identifiant indisponible', 'Cet identifiant est déjà utilisé.')
    const record = editing ? { ...editing, name: form.name, username: form.username, active: form.active, passwordHash: form.password ? hashPassword(form.password) : editing.passwordHash } : { id: uid('user'), name: form.name, username: form.username, passwordHash: hashPassword(form.password), role: 'administration', active: form.active }
    onUpdate((current) => addActivity({ ...current, users: editing ? current.users.map((item) => item.id === record.id ? record : item) : [...current.users, record] }, { type: 'user', title: editing ? 'Compte utilisateur modifié' : 'Administrateur créé', detail: record.name }))
    notify('success', editing ? 'Compte modifié' : 'Administrateur créé', `L’identifiant est « ${record.username} ».`)
    setCreating(false); setEditing(null)
  }
  const remove = (user) => {
    if (user.id === currentUser.id) return notify('error', 'Action impossible', 'Vous ne pouvez pas supprimer votre propre compte.')
    if (user.role === 'teacher') return notify('error', 'Compte enseignant', 'Supprimez-le depuis la rubrique Enseignants.')
    if (!window.confirm(`Supprimer le compte « ${user.name} » ?`)) return
    onUpdate((current) => ({ ...current, users: current.users.filter((item) => item.id !== user.id) }))
    notify('success', 'Compte supprimé', user.name)
  }
  return <div className="page-enter"><header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><span className="section-kicker">Contrôle des accès</span><h1 className="page-title mt-1">Utilisateurs</h1><p className="mt-2 text-xs text-slate-500">Gérez le deuxième administrateur et contrôlez les accès.</p></div><button className="btn-primary" onClick={() => setCreating(true)}><FiPlus /> Créer un administrateur</button></header>
    <section className="panel overflow-hidden"><div className="scrollbar-thin overflow-x-auto"><table className="w-full min-w-[700px] border-collapse text-xs"><thead className="table-head"><tr><th className="px-5 py-3">Utilisateur</th><th className="px-4 py-3">Identifiant</th><th className="px-4 py-3">Rôle</th><th className="px-4 py-3">Statut</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody>{db.users.map((user) => <tr key={user.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"><td className="px-5 py-3"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand"><FiUserCheck size={16} /></span><div><b className="block text-[11px] text-slate-700">{user.name}</b>{user.id === currentUser.id && <span className="text-[9px] text-cyan">Session actuelle</span>}</div></div></td><td className="px-4 py-3"><span className="badge bg-slate-100 font-mono text-slate-600"><FiKey /> {user.username}</span></td><td className="px-4 py-3"><span className={`badge ${roleStyles[user.role]}`}><FiShield /> {roleLabels[user.role]}</span></td><td className="px-4 py-3"><span className={`badge ${user.active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}><span className={`size-1.5 rounded-full ${user.active ? 'bg-emerald-500' : 'bg-red-500'}`} /> {user.active ? 'Actif' : 'Désactivé'}</span></td><td className="px-5 py-3"><div className="flex justify-end gap-1"><button className="icon-button !size-8" onClick={() => setEditing(user)} title="Modifier"><FiEdit2 size={14} /></button><button className="icon-button !size-8 hover:!bg-red-50 hover:!text-red-600" onClick={() => remove(user)} title="Supprimer"><FiTrash2 size={14} /></button></div></td></tr>)}</tbody></table></div></section>
    {(creating || editing) && <Modal title={editing ? 'Modifier le compte' : 'Créer un administrateur'} subtitle="L’administration pourra générer et imprimer les bulletins." onClose={() => { setCreating(false); setEditing(null) }}><UserForm user={editing} db={db} onSave={save} onClose={() => { setCreating(false); setEditing(null) }} /></Modal>}
  </div>
}
