import { useEffect, useMemo, useState } from 'react'
import { FiAlertCircle, FiBookOpen, FiCheck, FiClipboard, FiSave, FiUsers } from 'react-icons/fi'
import { addActivity, uid } from '../lib/store'

export default function Grades({ db, user, onUpdate, notify }) {
  const allowedAssignments = useMemo(() => {
    if (user.role === 'teacher') return db.assignments.filter((item) => item.teacherId === user.teacherId)
    return db.classes.flatMap((classItem) => db.curriculum.filter((item) => item.seriesId === classItem.seriesId).map((item) => ({ classId: classItem.id, subjectId: item.subjectId })))
  }, [db.assignments, db.classes, db.curriculum, user])
  const allowedClassIds = [...new Set(allowedAssignments.map((item) => item.classId))]
  const [classId, setClassId] = useState(allowedClassIds[0] || '')
  const subjectIds = [...new Set(allowedAssignments.filter((item) => item.classId === classId).map((item) => item.subjectId))]
  const [subjectId, setSubjectId] = useState(subjectIds[0] || '')
  const [term, setTerm] = useState(db.activeTerm)
  const [draft, setDraft] = useState({})
  const [dirty, setDirty] = useState(false)
  const [coefficientDraft, setCoefficientDraft] = useState('')
  const [coefficientDirty, setCoefficientDirty] = useState(false)

  useEffect(() => {
    if (!allowedClassIds.includes(classId)) setClassId(allowedClassIds[0] || '')
  }, [allowedClassIds.join('|'), classId])

  useEffect(() => {
    const available = [...new Set(allowedAssignments.filter((item) => item.classId === classId).map((item) => item.subjectId))]
    if (!available.includes(subjectId)) setSubjectId(available[0] || '')
  }, [classId, allowedAssignments, subjectId])

  const students = db.students.filter((student) => student.classId === classId && student.active).sort((a, b) => a.lastName.localeCompare(b.lastName))
  const classItem = db.classes.find((item) => item.id === classId)
  const subject = db.subjects.find((item) => item.id === subjectId)
  const curriculum = db.curriculum.find((item) => item.seriesId === classItem?.seriesId && item.subjectId === subjectId)
  const coefficientValue = Number(coefficientDraft || curriculum?.coefficient || 0)

  useEffect(() => {
    setCoefficientDraft(curriculum ? String(curriculum.coefficient) : '')
    setCoefficientDirty(false)
  }, [curriculum?.id, curriculum?.coefficient])

  useEffect(() => {
    const next = {}
    students.forEach((student) => {
      const grade = db.grades.find((item) => item.studentId === student.id && item.subjectId === subjectId && item.term === term)
      next[student.id] = grade ? String(grade.value) : ''
    })
    setDraft(next)
    setDirty(false)
  }, [classId, subjectId, term, db.grades])

  const updateGrade = (studentId, value) => {
    if (value !== '' && !/^\d{0,2}([.,]\d{0,2})?$/.test(value)) return
    setDraft((current) => ({ ...current, [studentId]: value.replace(',', '.') }))
    setDirty(true)
  }

  const invalidCount = Object.values(draft).filter((value) => value !== '' && (Number(value) < 0 || Number(value) > 20)).length
  const filledCount = Object.values(draft).filter((value) => value !== '').length
  const coefficientInvalid = coefficientDraft === '' || !Number.isFinite(Number(coefficientDraft)) || Number(coefficientDraft) <= 0 || Number(coefficientDraft) > 20

  const updateCoefficient = (value) => {
    if (value !== '' && !/^\d{0,2}([.,]\d{0,2})?$/.test(value)) return
    setCoefficientDraft(value.replace(',', '.'))
    setCoefficientDirty(true)
  }

  const save = () => {
    if (invalidCount) return notify('error', 'Notes invalides', 'Chaque note doit être comprise entre 0 et 20.')
    if (coefficientInvalid) return notify('error', 'Coefficient invalide', 'Le coefficient doit être supérieur à 0 et inférieur ou égal à 20.')
    const studentIds = new Set(students.map((student) => student.id))
    onUpdate((current) => {
      const kept = current.grades.filter((grade) => !(studentIds.has(grade.studentId) && grade.subjectId === subjectId && grade.term === term))
      const nextGrades = Object.entries(draft).filter(([, value]) => value !== '').map(([studentId, value]) => ({ id: uid('grade'), studentId, subjectId, term, value: Number(value), updatedBy: user.id, updatedAt: new Date().toISOString() }))
      const nextCurriculum = current.curriculum.map((item) => item.id === curriculum?.id ? { ...item, coefficient: Number(coefficientDraft) } : item)
      return addActivity({ ...current, curriculum: nextCurriculum, grades: [...kept, ...nextGrades] }, { type: 'grade', title: `Notes de ${subject?.name} enregistrées`, detail: `${classItem?.name} · ${term} · coefficient ${coefficientDraft} · ${nextGrades.length} note(s)` })
    })
    setDirty(false)
    setCoefficientDirty(false)
    notify('success', 'Notes et coefficient enregistrés', `${filledCount} note(s) sauvegardée(s) avec le coefficient ${coefficientDraft}.`)
  }

  if (!allowedAssignments.length) return <div className="page-enter"><header className="mb-7"><span className="section-kicker">Évaluation</span><h1 className="page-title mt-1">Saisie des notes</h1></header><div className="panel py-20 text-center"><span className="mx-auto grid size-16 place-items-center rounded-2xl bg-gold-soft text-[#8a6118]"><FiBookOpen size={28} /></span><h2 className="mt-4 text-sm font-bold text-brand">Aucune affectation disponible</h2><p className="mx-auto mt-1 max-w-md text-[10px] leading-5 text-slate-400">Le développeur doit d’abord vous attribuer une classe et une matière.</p></div></div>

  return (
    <div className="page-enter">
      <header className="mb-7"><span className="section-kicker">Évaluation</span><h1 className="page-title mt-1">Saisie des notes</h1><p className="mt-2 text-xs text-slate-500">Insérez ou modifiez les notes de vos élèves sur 20.</p></header>

      <section className="panel mb-5 grid gap-4 p-4 sm:grid-cols-3">
        <label><span className="field-label">Classe</span><select className="field" value={classId} onChange={(e) => setClassId(e.target.value)}>{allowedClassIds.map((id) => <option key={id} value={id}>{db.classes.find((item) => item.id === id)?.name}</option>)}</select></label>
        <label><span className="field-label">Matière</span><select className="field" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>{subjectIds.map((id) => <option key={id} value={id}>{db.subjects.find((item) => item.id === id)?.name}</option>)}</select></label>
        <label><span className="field-label">Séquence</span><select className="field" value={term} onChange={(e) => setTerm(e.target.value)}>{db.terms.map((item) => <option key={item}>{item}</option>)}</select></label>
      </section>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-white p-3.5"><span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Classe sélectionnée</span><b className="mt-1 block text-sm text-brand">{classItem?.name}</b></div>
        <div className="rounded-xl border border-line bg-white p-3.5"><span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Matière</span><b className="mt-1 block text-sm text-brand">{subject?.name}</b></div>
        <div className="rounded-xl border border-line bg-white p-3.5"><span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Pondération</span><div className="mt-1 flex items-center gap-2"><b className="text-sm text-brand">Groupe {curriculum?.group || '—'} · Coef.</b><input className={`field !w-20 !px-2 !py-1.5 text-center font-bold ${coefficientInvalid ? '!border-red-400 !bg-red-50 !text-red-700' : ''}`} inputMode="decimal" value={coefficientDraft} onChange={(event) => updateCoefficient(event.target.value)} aria-label={`Coefficient de ${subject?.name || 'la matière'}`} disabled={!curriculum} /></div><small className="mt-1 block text-[9px] text-slate-400">Renseigné par l’enseignant, puis appliqué au bulletin.</small></div>
      </div>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4"><div><h2 className="text-sm font-bold text-brand">Grille de notes</h2><p className="mt-0.5 text-[9px] text-slate-400">{students.length} élève(s) · Note maximale : 20</p></div><span className="badge bg-brand-soft text-brand"><FiClipboard /> {filledCount}/{students.length} saisies</span></div>
        {students.length ? <div className="scrollbar-thin overflow-x-auto"><table className="w-full min-w-[660px] border-collapse text-xs"><thead className="table-head"><tr><th className="px-5 py-3">N°</th><th className="px-4 py-3">Élève</th><th className="px-4 py-3">Matricule</th><th className="px-4 py-3 text-center">Coefficient</th><th className="px-4 py-3 text-center">Note / 20</th><th className="px-5 py-3 text-right">Note coefficiée</th></tr></thead><tbody>{students.map((student, index) => {
          const value = draft[student.id] ?? ''
          const invalid = value !== '' && (Number(value) < 0 || Number(value) > 20)
          const displayName = `${student.lastName || ''} ${student.firstName || ''}`.trim()
          const initials = displayName.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('') || '?'
          return <tr key={student.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"><td className="px-5 py-3 text-[10px] text-slate-400">{String(index + 1).padStart(2, '0')}</td><td className="px-4 py-3"><div className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-[9px] font-black text-brand">{initials}</span><b className="text-[11px] text-slate-700">{displayName}</b></div></td><td className="px-4 py-3 font-mono text-[10px] text-slate-400">{student.matricule}</td><td className="px-4 py-3 text-center font-bold text-brand">{coefficientValue || '—'}</td><td className="px-4 py-3 text-center"><div className="relative mx-auto w-24"><input className={`field !px-2 !py-2 text-center font-bold ${invalid ? '!border-red-500 !bg-red-50 !text-red-700' : ''}`} inputMode="decimal" value={value} onChange={(e) => updateGrade(student.id, e.target.value)} aria-label={`Note de ${displayName}`} />{!invalid && value !== '' && <FiCheck className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-500" />}</div></td><td className="px-5 py-3 text-right font-bold text-brand">{value !== '' && !invalid && !coefficientInvalid ? (Number(value) * coefficientValue).toFixed(2) : '—'}</td></tr>
        })}</tbody></table></div> : <div className="py-16 text-center"><FiUsers className="mx-auto text-slate-300" size={30} /><p className="mt-3 text-xs text-slate-400">Aucun élève actif dans cette classe.</p></div>}
      </section>

      <div className={`sticky bottom-4 mt-4 flex flex-col gap-3 rounded-2xl border px-4 py-3.5 shadow-2xl backdrop-blur sm:flex-row sm:items-center sm:justify-between ${invalidCount || coefficientInvalid ? 'border-red-400 bg-red-900/95 text-white' : 'border-white/10 bg-brand-deep/95 text-white'}`}><span className="flex items-center gap-2 text-[10px] text-white/70">{invalidCount ? <><FiAlertCircle className="text-red-300" /> {invalidCount} note(s) invalide(s)</> : coefficientInvalid ? <><FiAlertCircle className="text-red-300" /> Coefficient invalide</> : dirty || coefficientDirty ? 'Des modifications ne sont pas encore enregistrées.' : 'Toutes les modifications sont enregistrées.'}</span><button className="btn-primary !bg-gold !text-brand-deep hover:!bg-[#ecc66e]" disabled={(!dirty && !coefficientDirty) || invalidCount > 0 || coefficientInvalid} onClick={save}><FiSave /> Enregistrer notes et coefficient</button></div>
    </div>
  )
}
