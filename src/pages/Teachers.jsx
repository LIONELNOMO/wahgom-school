import { useMemo, useState } from 'react'
import { FiBookOpen, FiCheckCircle, FiEdit2, FiKey, FiMail, FiPhone, FiPlus, FiPrinter, FiSearch, FiTrash2, FiUserCheck } from 'react-icons/fi'
import Modal from '../components/Modal'
import { addActivity, hashPassword, uid } from '../lib/store'

function TeacherForm({ teacher, db, onClose, onSave }) {
  const linkedUser = db.users.find((user) => user.id === teacher?.userId)
  const assigned = new Set(db.assignments.filter((item) => item.teacherId === teacher?.id).map((item) => `${item.classId}|${item.subjectId}`))
  const [form, setForm] = useState({
    lastName: teacher?.lastName || '',
    firstName: teacher?.firstName || '',
    phone: teacher?.phone || '',
    email: teacher?.email || '',
    classesText: teacher?.classesText || '',
    subjectsText: teacher?.subjectsText || '',
    username: linkedUser?.username || '',
    password: '',
  })
  const [selected, setSelected] = useState(assigned)
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const toggle = (key) => setSelected((current) => { const next = new Set(current); next.has(key) ? next.delete(key) : next.add(key); return next })
  const valid = form.lastName.trim() && (teacher || form.firstName.trim()) && form.username.trim() && (teacher || form.password.length >= 4) && (teacher || selected.size > 0)

  return (
    <form onSubmit={(event) => { event.preventDefault(); if (valid) onSave(form, [...selected]) }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label><span className="field-label">Nom *</span><input className="field uppercase" value={form.lastName} onChange={(e) => set('lastName', e.target.value.toUpperCase())} required /></label>
        <label><span className="field-label">Prénom(s) {teacher ? '' : '*'}</span><input className="field" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required={!teacher} /></label>
        <label><span className="field-label">Téléphone</span><input className="field" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="6 XX XX XX XX" /></label>
        <label><span className="field-label">E-mail</span><input className="field" type="email" value={form.email} onChange={(e) => set('email', e.target.value.trim())} placeholder="enseignant@exemple.com" /></label>
        <label><span className="field-label">Identifiant de connexion *</span><input className="field" value={form.username} onChange={(e) => set('username', e.target.value.toLowerCase().replace(/\s/g, ''))} required /></label>
        <label><span className="field-label">{teacher ? 'Nouveau mot de passe' : 'Mot de passe *'}</span><input className="field" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder={teacher ? 'Laisser vide pour conserver' : '4 caractères minimum'} minLength={teacher ? 0 : 4} /><small className="mt-1 block text-[9px] text-slate-400">{teacher ? 'Ne remplissez que pour le modifier.' : 'À communiquer directement à l’enseignant.'}</small></label>
        <label><span className="field-label">Classes communiquées</span><textarea className="field min-h-20 resize-y" value={form.classesText} onChange={(e) => set('classesText', e.target.value)} placeholder="Ex. 3e, 1ère C, Terminale D" /></label>
        <label><span className="field-label">Matières communiquées</span><textarea className="field min-h-20 resize-y" value={form.subjectsText} onChange={(e) => set('subjectsText', e.target.value)} placeholder="Ex. Physique, Chimie" /></label>
      </div>

      <div className="my-5 border-t border-line" />
      <div className="mb-3"><h3 className="text-xs font-bold text-brand">Affectations officielles {teacher ? '' : '*'}</h3><p className="mt-1 text-[10px] text-slate-400">Les informations communiquées restent conservées ci-dessus. Sélectionnez ici les classes réellement accessibles dans l’application.</p></div>
      <div className="space-y-3">
        {db.classes.map((classItem) => {
          const items = db.curriculum.filter((item) => item.seriesId === classItem.seriesId)
          return <div key={classItem.id} className="rounded-xl border border-line p-3"><b className="mb-2.5 block text-[11px] text-brand">{classItem.name}</b><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => {
            const subject = db.subjects.find((entry) => entry.id === item.subjectId)
            const key = `${classItem.id}|${item.subjectId}`
            return <label key={key} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-[9px] transition ${selected.has(key) ? 'border-cyan/40 bg-cyan/5 text-brand' : 'border-slate-100 text-slate-500 hover:border-line'}`}><input className="size-3.5 accent-[#0f8f99]" type="checkbox" checked={selected.has(key)} onChange={() => toggle(key)} /><span className="min-w-0 flex-1 truncate">{subject?.name}</span><b>coef. {item.coefficient}</b></label>
          })}</div></div>
        })}
      </div>
      <div className="mt-6 flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={onClose}>Annuler</button><button className="btn-primary" disabled={!valid}>{teacher ? 'Enregistrer' : 'Créer le compte enseignant'}</button></div>
    </form>
  )
}

export default function Teachers({ db, onUpdate, notify, user }) {
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const canManage = user?.role === 'developer'
  const teachers = useMemo(() => db.teachers.filter((teacher) => `${teacher.lastName} ${teacher.firstName} ${teacher.phone} ${teacher.email || ''} ${teacher.classesText || ''} ${teacher.subjectsText || ''}`.toLowerCase().includes(search.toLowerCase())), [db.teachers, search])

  const save = (form, selected) => {
    const linkedUser = db.users.find((user) => user.id === editing?.userId)
    if (db.users.some((user) => user.username.toLowerCase() === form.username.toLowerCase() && user.id !== linkedUser?.id)) return notify('error', 'Identifiant indisponible', 'Cet identifiant est déjà utilisé.')
    const teacherId = editing?.id || uid('teacher')
    const userId = linkedUser?.id || uid('user')
    const teacher = { id: teacherId, userId, lastName: form.lastName, firstName: form.firstName, phone: form.phone, email: form.email, classesText: form.classesText, subjectsText: form.subjectsText, ...(editing?.source ? { source: editing.source } : {}) }
    const user = { id: userId, name: `${form.firstName} ${form.lastName}`.trim(), username: form.username, passwordHash: form.password ? hashPassword(form.password) : linkedUser?.passwordHash, role: 'teacher', teacherId, active: form.password ? true : (linkedUser?.active ?? true), emailVerified: Boolean(form.email) }
    const newAssignments = selected.map((value) => { const [classId, subjectId] = value.split('|'); return { id: uid('assignment'), teacherId, classId, subjectId } })
    onUpdate((current) => addActivity({ ...current, teachers: editing ? current.teachers.map((item) => item.id === teacherId ? teacher : item) : [teacher, ...current.teachers], users: editing ? current.users.map((item) => item.id === userId ? user : item) : [...current.users, user], assignments: [...current.assignments.filter((item) => item.teacherId !== teacherId), ...newAssignments] }, { type: 'teacher', title: editing ? 'Enseignant modifié' : 'Enseignant ajouté', detail: `${teacher.lastName} ${teacher.firstName} · ${newAssignments.length} affectation(s)` }))
    notify('success', editing ? 'Enseignant modifié' : 'Compte enseignant créé', `${teacher.firstName} ${teacher.lastName} peut accéder à ses classes.`)
    setEditing(null); setCreating(false)
  }

  const remove = () => {
    onUpdate((current) => addActivity({ ...current, teachers: current.teachers.filter((item) => item.id !== deleting.id), users: current.users.filter((item) => item.id !== deleting.userId), assignments: current.assignments.filter((item) => item.teacherId !== deleting.id) }, { type: 'teacher', title: 'Enseignant supprimé', detail: `${deleting.lastName} ${deleting.firstName}` }))
    notify('success', 'Enseignant supprimé', 'Son compte et ses affectations ont été retirés.')
    setDeleting(null)
  }

  return (
    <div className="page-enter">
      <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><span className="section-kicker">Équipe pédagogique</span><h1 className="page-title mt-1">Enseignants</h1><p className="mt-2 text-xs text-slate-500">Consultez et imprimez les enseignants, leurs contacts et leurs affectations.</p></div><div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={() => window.print()}><FiPrinter /> Imprimer la liste</button>{canManage && <button className="btn-primary" onClick={() => setCreating(true)}><FiPlus /> Ajouter un enseignant</button>}</div></header>
      <section className="panel overflow-hidden">
        <div className="border-b border-line bg-slate-50/70 p-4"><div className="relative max-w-xs"><FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input className="field !py-2 !pl-10 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un enseignant…" /></div></div>
        {teachers.length ? <div className="scrollbar-thin overflow-x-auto"><table className="w-full min-w-[920px] border-collapse text-xs"><thead className="table-head"><tr><th className="px-5 py-3">Enseignant</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Identifiant</th><th className="px-4 py-3">Affectations</th>{canManage && <th className="px-5 py-3 text-right">Actions</th>}</tr></thead><tbody>{teachers.map((teacher) => {
          const user = db.users.find((item) => item.id === teacher.userId)
          const assignments = db.assignments.filter((item) => item.teacherId === teacher.id)
          const classes = [...new Set(assignments.map((item) => db.classes.find((entry) => entry.id === item.classId)?.name).filter(Boolean))]
          const subjects = [...new Set(assignments.map((item) => db.subjects.find((entry) => entry.id === item.subjectId)?.name).filter(Boolean))]
          const initials = `${teacher.firstName?.trim()?.[0] || ''}${teacher.lastName?.trim()?.[0] || ''}` || '?'
          const displayClasses = classes.join(', ') || teacher.classesText || 'Aucune classe'
          const displaySubjects = subjects.join(', ') || teacher.subjectsText || 'Aucune matière'
          return <tr key={teacher.id} className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/70"><td className="px-5 py-3"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-gold-soft text-[10px] font-black text-[#8a6118]">{initials}</span><div><b className="block text-[11px] text-slate-700">{teacher.lastName} {teacher.firstName}</b><span className="text-[9px] text-slate-400">{teacher.source ? 'Enseignant importé' : 'Enseignant'}</span></div></div></td><td className="px-4 py-3"><span className="flex items-center gap-1.5 text-[10px] text-slate-500"><FiPhone /> {teacher.phone || 'Non renseigné'}</span><span className="mt-1 flex items-center gap-1.5 text-[9px] text-slate-400"><FiMail /> {teacher.email || 'E-mail non renseigné'} {user?.emailVerified && <FiCheckCircle className="text-emerald-500" title="E-mail vérifié" />}</span></td><td className="px-4 py-3"><span className={`badge ${user?.active ? 'bg-brand-soft text-brand' : 'bg-amber-50 text-amber-700'}`}><FiKey /> {user?.active ? user.username : 'Accès à activer'}</span>{!user?.active && <span className="mt-1 block text-[9px] text-slate-400">{user?.username}</span>}</td><td className="max-w-sm px-4 py-3"><b className="block truncate text-[10px] text-slate-600" title={displayClasses}>{displayClasses}</b><span className="block truncate text-[9px] text-slate-400" title={displaySubjects}>{displaySubjects} · {assignments.length ? `${assignments.length} affectation(s)` : 'à valider'}</span></td>{canManage && <td className="px-5 py-3"><div className="flex justify-end gap-1"><button className="icon-button !size-8" onClick={() => setEditing(teacher)} title="Modifier"><FiEdit2 size={14} /></button><button className="icon-button !size-8 hover:!bg-red-50 hover:!text-red-600" onClick={() => setDeleting(teacher)} title="Supprimer"><FiTrash2 size={14} /></button></div></td>}</tr>
        })}</tbody></table></div> : <div className="py-16 text-center"><span className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand-soft text-brand"><FiUserCheck size={28} /></span><h3 className="mt-4 text-sm font-bold text-brand">Aucun enseignant</h3><p className="mt-1 text-[10px] text-slate-400">Ajoutez le premier membre de l’équipe pédagogique.</p></div>}
      </section>
      <section id="printable-teachers-list" className="teachers-print-sheet"><header><img src={db.school.logo} alt="" /><div><h1>{db.school.name}</h1><p>Liste des enseignants · Année scolaire {db.school.academicYear}</p></div></header><table><thead><tr><th>N°</th><th>Enseignant</th><th>Contact vérifié</th><th>Classes</th><th>Matières</th></tr></thead><tbody>{teachers.map((teacher, index) => { const account = db.users.find((item) => item.id === teacher.userId); const assignments = db.assignments.filter((item) => item.teacherId === teacher.id); const classes = [...new Set(assignments.map((item) => db.classes.find((entry) => entry.id === item.classId)?.name).filter(Boolean))]; const subjects = [...new Set(assignments.map((item) => db.subjects.find((entry) => entry.id === item.subjectId)?.name).filter(Boolean))]; return <tr key={teacher.id}><td>{index + 1}</td><td><b>{teacher.lastName} {teacher.firstName}</b></td><td>{teacher.email}<br />{teacher.phone}<br />{account?.emailVerified ? 'E-mail vérifié' : 'Non vérifié'}</td><td>{classes.join(', ') || teacher.classesText || '—'}</td><td>{subjects.join(', ') || teacher.subjectsText || '—'}</td></tr> })}</tbody></table><footer>Imprimé le {new Intl.DateTimeFormat('fr-CM').format(new Date())}</footer></section>
      {canManage && (creating || editing) && <Modal wide title={editing ? 'Modifier l’enseignant' : 'Ajouter un enseignant'} subtitle="Le compte et les affectations seront disponibles immédiatement." onClose={() => { setCreating(false); setEditing(null) }}><TeacherForm teacher={editing} db={db} onClose={() => { setCreating(false); setEditing(null) }} onSave={save} /></Modal>}
      {canManage && deleting && <Modal title="Supprimer cet enseignant ?" subtitle="Ses notes déjà saisies resteront dans les bulletins." onClose={() => setDeleting(null)} footer={<><button className="btn-secondary" onClick={() => setDeleting(null)}>Annuler</button><button className="btn-danger" onClick={remove}><FiTrash2 /> Supprimer</button></>}><div className="flex items-center gap-4 rounded-xl bg-red-50 p-4"><span className="grid size-11 place-items-center rounded-xl bg-red-100 text-red-700"><FiBookOpen size={20} /></span><div><b className="block text-sm text-red-900">{deleting.lastName} {deleting.firstName}</b><span className="text-xs text-red-700/70">Compte et affectations associés</span></div></div></Modal>}
    </div>
  )
}
