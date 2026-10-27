import {
  FiArrowUpRight, FiBookOpen, FiCheckCircle, FiClipboard, FiClock, FiFileText,
  FiGrid, FiLayers, FiList, FiPlus, FiPrinter, FiTrendingUp, FiUserCheck, FiUsers,
} from 'react-icons/fi'

const activityIcons = { grade: FiClipboard, student: FiUsers, bulletin: FiFileText, teacher: FiUserCheck, class: FiGrid, user: FiCheckCircle }

function relativeTime(value) {
  const delta = Date.now() - new Date(value).getTime()
  const days = Math.floor(delta / 86400000)
  if (days <= 0) return "Aujourd’hui"
  if (days === 1) return 'Hier'
  return `Il y a ${days} jours`
}

function StatCard({ icon: Icon, value, label, detail, tone = 'cyan' }) {
  const tones = {
    cyan: 'bg-cyan/10 text-cyan', gold: 'bg-gold-soft text-[#9a6b13]', blue: 'bg-blue-50 text-blue-700', green: 'bg-emerald-50 text-emerald-700',
  }
  return (
    <article className="panel relative min-h-36 overflow-hidden p-5">
      <div className="flex items-start justify-between"><span className={`grid size-10 place-items-center rounded-xl ${tones[tone]}`}><Icon size={19} /></span><span className="badge bg-emerald-50 text-emerald-700"><FiArrowUpRight /> actif</span></div>
      <b className="mt-4 block font-display text-3xl font-semibold leading-none text-brand">{value}</b>
      <span className="mt-1 block text-[11px] font-semibold text-slate-600">{label}</span>
      <small className="mt-0.5 block text-[9px] text-slate-400">{detail}</small>
      <span className={`absolute -bottom-8 -right-8 size-24 rounded-full opacity-40 ${tones[tone].split(' ')[0]}`} />
    </article>
  )
}

export default function Dashboard({ db, user, onNavigate }) {
  const currentTeacher = db.teachers.find((teacher) => teacher.id === user.teacherId)
  const teacherAssignments = db.assignments.filter((assignment) => assignment.teacherId === user.teacherId)
  const teacherClasses = new Set(teacherAssignments.map((assignment) => assignment.classId))
  const teacherStudents = db.students.filter((student) => teacherClasses.has(student.classId)).length
  const teacherSubjects = new Set(teacherAssignments.map((assignment) => assignment.subjectId)).size
  const graded = db.grades.filter((grade) => user.role !== 'teacher' || teacherAssignments.some((assignment) => assignment.classId === db.students.find((s) => s.id === grade.studentId)?.classId && assignment.subjectId === grade.subjectId)).length

  const stats = user.role === 'teacher' ? [
    [FiGrid, teacherClasses.size, 'Classes attribuées', 'Selon vos affectations', 'cyan'],
    [FiUsers, teacherStudents, 'Élèves concernés', 'Toutes vos classes', 'blue'],
    [FiBookOpen, teacherSubjects, 'Matières enseignées', 'Programme actif', 'gold'],
    [FiClipboard, graded, 'Notes enregistrées', db.activeTerm, 'green'],
  ] : [
    [FiUsers, db.students.length, 'Élèves inscrits', `Capacité : ${db.students.length}/1000`, 'cyan'],
    [FiUserCheck, db.teachers.length, 'Enseignants', `${db.assignments.length} affectations`, 'blue'],
    [FiGrid, db.classes.length, 'Classes actives', `${db.series.length} séries configurées`, 'gold'],
    [FiClipboard, db.grades.length, 'Notes enregistrées', db.activeTerm, 'green'],
  ]

  const quickActions = user.role === 'developer' ? [
    [FiPlus, 'Inscrire un élève', 'Créer une nouvelle fiche', 'students'],
    [FiUserCheck, 'Ajouter un enseignant', 'Compte et affectations', 'teachers'],
    [FiClipboard, 'Saisir les notes', 'Ouvrir la grille de saisie', 'grades'],
    [FiPrinter, 'Générer un bulletin', 'Prévisualiser et imprimer', 'bulletins'],
    [FiList, 'Fiche de notes', 'Toute une classe sur une feuille', 'bulletins'],
  ] : user.role === 'teacher' ? [
    [FiClipboard, 'Saisir les notes', 'Accéder à vos classes', 'grades'],
    [FiBookOpen, 'Voir mes matières', `${teacherSubjects} matière(s) affectée(s)`, 'grades'],
  ] : [
    [FiPrinter, 'Imprimer un bulletin', 'Choisir un élève', 'bulletins'],
    [FiFileText, 'Générer le PDF', 'Bulletin au format A4', 'bulletins'],
    [FiList, 'Fiche de notes', 'Toute une classe sur une feuille', 'bulletins'],
    [FiLayers, 'Imprimer une classe', 'Un bulletin par élève', 'bulletins'],
  ]

  return (
    <div className="page-enter">
      <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><span className="section-kicker">Vue générale</span><h1 className="page-title mt-1">Bonjour, {user.role === 'teacher' ? currentTeacher?.firstName || 'Enseignant' : user.name.split(' ')[0]} 👋</h1><p className="mt-2 text-xs text-slate-500">Voici l’essentiel de {user.role === 'teacher' ? 'vos classes' : 'votre établissement'} pour le {db.activeTerm.toLowerCase()}.</p></div>
        <div className="flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2 text-[10px] text-slate-500 shadow-sm"><FiClock className="text-cyan" /> Année scolaire <b className="text-brand">{db.school.academicYear}</b></div>
      </header>

      <section className="mb-5 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        {stats.map(([Icon, value, label, detail, tone]) => <StatCard key={label} icon={Icon} value={value} label={label} detail={detail} tone={tone} />)}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.45fr_.85fr]">
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4"><div><h2 className="text-sm font-bold text-brand">Activité récente</h2><p className="mt-0.5 text-[9px] text-slate-400">Dernières opérations enregistrées</p></div><FiTrendingUp className="text-cyan" /></div>
          <div className="px-5">
            {db.activities.slice(0, 5).map((activity) => {
              const Icon = activityIcons[activity.type] || FiCheckCircle
              return <div key={activity.id} className="grid grid-cols-[36px_1fr_auto] items-center gap-3 border-b border-slate-100 py-3.5 last:border-0"><span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand"><Icon size={15} /></span><div><b className="block text-[11px] text-slate-700">{activity.title}</b><span className="block text-[9px] text-slate-400">{activity.detail}</span></div><time className="text-[9px] text-slate-400">{relativeTime(activity.at)}</time></div>
            })}
          </div>
        </div>

        <div className="panel overflow-hidden">
          <div className="border-b border-line px-5 py-4"><h2 className="text-sm font-bold text-brand">Actions rapides</h2><p className="mt-0.5 text-[9px] text-slate-400">Accès aux tâches fréquentes</p></div>
          <div className="grid grid-cols-1 gap-2.5 p-4 min-[420px]:grid-cols-2">
            {quickActions.map(([Icon, label, detail, page]) => <button key={label} onClick={() => onNavigate(page)} className="group rounded-xl border border-line bg-white p-3.5 text-left transition hover:-translate-y-0.5 hover:border-cyan/50 hover:shadow-lg hover:shadow-brand/5"><span className="mb-3 grid size-8 place-items-center rounded-lg bg-cyan/8 text-cyan transition group-hover:bg-cyan group-hover:text-white"><Icon size={15} /></span><b className="block text-[10px] text-slate-700">{label}</b><small className="mt-0.5 block text-[8px] leading-4 text-slate-400">{detail}</small></button>)}
          </div>
        </div>
      </section>
    </div>
  )
}
