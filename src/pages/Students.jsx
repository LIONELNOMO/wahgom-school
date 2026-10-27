import { useMemo, useState } from 'react'
import { FiEdit2, FiPlus, FiSearch, FiTrash2, FiUser, FiUsers } from 'react-icons/fi'
import Modal from '../components/Modal'
import { addActivity, uid } from '../lib/store'

const emptyStudent = { matricule: '', lastName: '', firstName: '', birthDate: '', birthPlace: '', gender: 'F', classId: '', active: true }

const getStudentName = (student) => `${student.lastName || ''} ${student.firstName || ''}`.trim()
const getStudentInitials = (student) => {
  const words = getStudentName(student).split(/\s+/).filter(Boolean)
  return `${words[0]?.[0] || ''}${words.at(-1)?.[0] || ''}` || '?'
}
const getBirthDate = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('fr-FR') : 'À compléter'

function StudentForm({ initial, db, onCancel, onSave }) {
  const [form, setForm] = useState(initial || emptyStudent)
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const valid = form.matricule.trim() && form.lastName.trim() && form.firstName.trim() && form.birthDate && form.birthPlace.trim() && form.classId

  return (
    <form onSubmit={(event) => { event.preventDefault(); if (valid) onSave(form) }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label><span className="field-label">Matricule *</span><input className="field uppercase" value={form.matricule} onChange={(e) => set('matricule', e.target.value.toUpperCase())} placeholder="Ex. WS-0025" required /></label>
        <label><span className="field-label">Classe *</span><select className="field" value={form.classId} onChange={(e) => set('classId', e.target.value)} required><option value="">Sélectionner une classe</option>{db.classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label><span className="field-label">Nom *</span><input className="field uppercase" value={form.lastName} onChange={(e) => set('lastName', e.target.value.toUpperCase())} placeholder="Nom de famille" required /></label>
        <label><span className="field-label">Prénom *</span><input className="field" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="Prénom(s)" required /></label>
        <label><span className="field-label">Date de naissance *</span><input className="field" type="date" value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)} required /></label>
        <label><span className="field-label">Lieu de naissance *</span><input className="field" value={form.birthPlace} onChange={(e) => set('birthPlace', e.target.value)} placeholder="Ville" required /></label>
        <label><span className="field-label">Sexe</span><select className="field" value={form.gender} onChange={(e) => set('gender', e.target.value)}><option value="">À compléter</option><option value="F">Féminin</option><option value="M">Masculin</option></select></label>
        <label><span className="field-label">Statut</span><select className="field" value={form.active ? 'true' : 'false'} onChange={(e) => set('active', e.target.value === 'true')}><option value="true">Actif</option><option value="false">Inactif</option></select></label>
      </div>
      <p className="mt-4 rounded-xl bg-brand-soft px-4 py-3 text-[10px] leading-5 text-brand">Les matières, groupes et coefficients seront automatiquement attribués selon la série de la classe sélectionnée.</p>
      <div className="mt-6 flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={onCancel}>Annuler</button><button className="btn-primary" disabled={!valid}>{initial ? 'Enregistrer les modifications' : 'Inscrire l’élève'}</button></div>
    </form>
  )
}

export default function Students({ db, onUpdate, notify }) {
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const students = useMemo(() => db.students.filter((student) => {
    const haystack = `${student.matricule} ${student.lastName} ${student.firstName}`.toLowerCase()
    return haystack.includes(search.toLowerCase()) && (classFilter === 'all' || student.classId === classFilter)
  }), [db.students, search, classFilter])

  const save = (form) => {
    const duplicate = db.students.some((student) => student.matricule.toLowerCase() === form.matricule.trim().toLowerCase() && student.id !== editing?.id)
    if (duplicate) return notify('error', 'Matricule déjà utilisé', 'Choisissez un matricule unique.')
    if (!editing && db.students.length >= 1000) return notify('error', 'Capacité atteinte', "L’établissement est limité à 1000 élèves.")
    const profileIncomplete = !form.firstName.trim() || !form.birthDate || !form.birthPlace.trim() || !form.gender
    const record = editing ? { ...editing, ...form, profileIncomplete } : { ...form, profileIncomplete, id: uid('student'), createdAt: new Date().toISOString() }
    onUpdate((current) => addActivity({ ...current, students: editing ? current.students.map((item) => item.id === editing.id ? record : item) : [record, ...current.students] }, { type: 'student', title: editing ? 'Fiche élève modifiée' : 'Nouvel élève inscrit', detail: `${record.lastName} ${record.firstName}` }))
    setEditing(null); setCreating(false)
    notify('success', editing ? 'Élève modifié' : 'Inscription réussie', `${record.lastName} ${record.firstName} a été enregistré.`)
  }

  const remove = () => {
    onUpdate((current) => addActivity({ ...current, students: current.students.filter((item) => item.id !== deleting.id), grades: current.grades.filter((grade) => grade.studentId !== deleting.id) }, { type: 'student', title: 'Élève supprimé', detail: `${deleting.lastName} ${deleting.firstName}` }))
    notify('success', 'Élève supprimé', 'La fiche et les notes associées ont été retirées.')
    setDeleting(null)
  }

  return (
    <div className="page-enter">
      <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><span className="section-kicker">Gestion scolaire</span><h1 className="page-title mt-1">Élèves</h1><p className="mt-2 text-xs text-slate-500">Gérez les inscriptions et les informations scolaires.</p></div><button className="btn-primary" onClick={() => setCreating(true)}><FiPlus /> Inscrire un élève</button></header>

      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs"><FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input className="field !py-2 !pl-10 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un élève…" /></div>
          <select className="field !w-auto min-w-44 !py-2 text-xs" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}><option value="all">Toutes les classes</option>{db.classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        </div>

        {students.length ? <div className="scrollbar-thin overflow-x-auto"><table className="w-full min-w-[800px] border-collapse text-xs"><thead className="table-head"><tr><th className="px-5 py-3">Élève</th><th className="px-4 py-3">Matricule</th><th className="px-4 py-3">Naissance</th><th className="px-4 py-3">Classe</th><th className="px-4 py-3">Statut</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody>{students.map((student) => {
          const classItem = db.classes.find((item) => item.id === student.classId)
          const initials = getStudentInitials(student)
          const gender = student.gender === 'F' ? 'Féminin' : student.gender === 'M' ? 'Masculin' : 'Sexe à compléter'
          return <tr key={student.id} className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/70"><td className="px-5 py-3"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-[10px] font-black text-brand">{initials}</span><div><b className="block text-[11px] text-slate-700">{getStudentName(student)}</b><span className="text-[9px] text-slate-400">{gender}</span></div></div></td><td className="px-4 py-3 font-mono text-[10px] text-slate-500">{student.matricule}</td><td className="px-4 py-3"><span className="block text-[10px] text-slate-600">{getBirthDate(student.birthDate)}</span><span className="text-[9px] text-slate-400">{student.birthPlace ? `à ${student.birthPlace}` : 'Lieu à compléter'}</span></td><td className="px-4 py-3"><span className="badge bg-blue-50 text-blue-700">{classItem?.name || '—'}</span></td><td className="px-4 py-3"><span className={`badge ${student.profileIncomplete ? 'bg-amber-50 text-amber-700' : student.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}><span className={`size-1.5 rounded-full ${student.profileIncomplete ? 'bg-amber-500' : student.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />{student.profileIncomplete ? 'Profil à compléter' : student.active ? 'Actif' : 'Inactif'}</span></td><td className="px-5 py-3"><div className="flex justify-end gap-1"><button className="icon-button !size-8" onClick={() => setEditing(student)} title="Modifier"><FiEdit2 size={14} /></button><button className="icon-button !size-8 hover:!bg-red-50 hover:!text-red-600" onClick={() => setDeleting(student)} title="Supprimer"><FiTrash2 size={14} /></button></div></td></tr>
        })}</tbody></table></div> : <div className="py-16 text-center"><span className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand-soft text-brand"><FiUsers size={28} /></span><h3 className="mt-4 text-sm font-bold text-brand">Aucun élève trouvé</h3><p className="mt-1 text-[10px] text-slate-400">Modifiez les filtres ou inscrivez un nouvel élève.</p></div>}
        <div className="border-t border-line px-5 py-3 text-[9px] text-slate-400">{students.length} élève(s) affiché(s) sur {db.students.length} · Capacité maximale : 1000</div>
      </section>

      {(creating || editing) && <Modal title={editing ? 'Modifier la fiche élève' : 'Inscrire un nouvel élève'} subtitle={editing?.profileIncomplete ? 'Séparez le prénom du nom complet et renseignez les informations manquantes.' : 'Les champs marqués d’un astérisque sont obligatoires.'} onClose={() => { setCreating(false); setEditing(null) }}><StudentForm initial={editing} db={db} onCancel={() => { setCreating(false); setEditing(null) }} onSave={save} /></Modal>}
      {deleting && <Modal title="Supprimer cet élève ?" subtitle="Cette action supprimera aussi toutes ses notes." onClose={() => setDeleting(null)} footer={<><button className="btn-secondary" onClick={() => setDeleting(null)}>Annuler</button><button className="btn-danger" onClick={remove}><FiTrash2 /> Supprimer définitivement</button></>}><div className="flex items-center gap-4 rounded-xl bg-red-50 p-4"><span className="grid size-11 place-items-center rounded-xl bg-red-100 text-red-700"><FiUser size={20} /></span><div><b className="block text-sm text-red-900">{deleting.lastName} {deleting.firstName}</b><span className="text-xs text-red-700/70">{deleting.matricule}</span></div></div></Modal>}
    </div>
  )
}
