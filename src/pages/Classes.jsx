import { useState } from 'react'
import { FiBookOpen, FiEdit2, FiGrid, FiPlus, FiTrash2, FiUsers } from 'react-icons/fi'
import Modal from '../components/Modal'
import { addActivity, uid } from '../lib/store'

function ClassForm({ initial, db, onSave, onClose }) {
  const [form, setForm] = useState(initial || { name: '', level: 'Terminale', seriesId: 'D' })
  return <form onSubmit={(event) => { event.preventDefault(); onSave(form) }}><div className="grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className="field-label">Nom de la classe *</span><input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex. Terminale D 2" required /></label><label><span className="field-label">Niveau *</span><input className="field" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} required /></label><label><span className="field-label">Série *</span><select className="field" value={form.seriesId} onChange={(e) => setForm({ ...form, seriesId: e.target.value })}>{db.series.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><p className="mt-4 rounded-xl bg-gold-soft px-4 py-3 text-[10px] leading-5 text-[#7a591b]">La série détermine automatiquement les matières, leurs groupes et leurs coefficients.</p><div className="mt-6 flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={onClose}>Annuler</button><button className="btn-primary">{initial ? 'Enregistrer' : 'Créer la classe'}</button></div></form>
}

export default function Classes({ db, onUpdate, notify }) {
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)
  const save = (form) => {
    const record = editing ? { ...editing, ...form } : { ...form, id: uid('class') }
    onUpdate((current) => addActivity({ ...current, classes: editing ? current.classes.map((item) => item.id === record.id ? record : item) : [...current.classes, record] }, { type: 'class', title: editing ? 'Classe modifiée' : 'Classe créée', detail: record.name }))
    notify('success', editing ? 'Classe modifiée' : 'Classe créée', `${record.name} utilise le programme de la série ${record.seriesId}.`)
    setCreating(false); setEditing(null)
  }
  const remove = (classItem) => {
    if (db.students.some((student) => student.classId === classItem.id)) return notify('error', 'Classe utilisée', 'Déplacez d’abord les élèves de cette classe.')
    onUpdate((current) => ({ ...current, classes: current.classes.filter((item) => item.id !== classItem.id), assignments: current.assignments.filter((item) => item.classId !== classItem.id) }))
    notify('success', 'Classe supprimée', classItem.name)
  }

  return <div className="page-enter"><header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><span className="section-kicker">Organisation</span><h1 className="page-title mt-1">Classes & séries</h1><p className="mt-2 text-xs text-slate-500">Organisez les classes selon les quatre séries de l’établissement.</p></div><button className="btn-primary" onClick={() => setCreating(true)}><FiPlus /> Créer une classe</button></header>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{db.classes.map((classItem) => {
      const series = db.series.find((item) => item.id === classItem.seriesId)
      const students = db.students.filter((student) => student.classId === classItem.id).length
      const subjects = db.curriculum.filter((item) => item.seriesId === classItem.seriesId).length
      return <article key={classItem.id} className="panel group p-5 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand/8"><div className="flex items-start justify-between"><span className="grid size-11 place-items-center rounded-xl bg-brand text-white shadow-lg shadow-brand/15"><FiGrid size={20} /></span><div className="flex gap-1 opacity-70 transition group-hover:opacity-100"><button className="icon-button !size-8" onClick={() => setEditing(classItem)} title="Modifier"><FiEdit2 size={14} /></button><button className="icon-button !size-8 hover:!bg-red-50 hover:!text-red-600" onClick={() => remove(classItem)} title="Supprimer"><FiTrash2 size={14} /></button></div></div><h2 className="mt-5 text-base font-bold text-brand">{classItem.name}</h2><span className="mt-1 block text-[10px] text-slate-400">{classItem.level} · {series?.name}</span><div className="mt-5 grid grid-cols-2 gap-2"><div className="rounded-xl bg-slate-50 p-3"><span className="flex items-center gap-1.5 text-[9px] text-slate-400"><FiUsers /> Élèves</span><b className="mt-1 block text-lg text-brand">{students}</b></div><div className="rounded-xl bg-slate-50 p-3"><span className="flex items-center gap-1.5 text-[9px] text-slate-400"><FiBookOpen /> Matières</span><b className="mt-1 block text-lg text-brand">{subjects}</b></div></div></article>
    })}</section>
    {(creating || editing) && <Modal title={editing ? 'Modifier la classe' : 'Créer une classe'} subtitle="Une classe est toujours liée à une série." onClose={() => { setCreating(false); setEditing(null) }}><ClassForm initial={editing} db={db} onSave={save} onClose={() => { setCreating(false); setEditing(null) }} /></Modal>}
  </div>
}
