import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  FiAlertCircle, FiArrowDown, FiArrowUp, FiCheckCircle, FiDownload,
  FiEye, FiFileText, FiPrinter, FiRefreshCw, FiSave, FiSliders, FiUser, FiX,
} from 'react-icons/fi'

export const DEFAULT_BULLETIN_LAYOUT = {
  topMargin: 7,
  sideMargin: 11,
  bottomMargin: 8,
  logoSize: 25,
  titleSize: 14,
  fontSize: 8.7,
  rowPadding: 1.15,
  sectionGap: 3.2,
}

function appreciation(value) {
  if (value == null) return 'Non noté'
  return value >= 10 ? 'Acquis' : 'Non acquis'
}

function generalRemark(value) {
  if (value == null) return 'Résultats insuffisants pour établir une appréciation.'
  return value >= 10
    ? 'Les acquis du trimestre sont confirmés. Poursuivez dans cette voie.'
    : 'Les acquis du trimestre ne sont pas confirmés. Des efforts s’imposent.'
}

const studentName = (student) => `${student.lastName || ''} ${student.firstName || ''}`.trim()
const studentInitials = (student) => {
  const words = studentName(student).split(/\s+/).filter(Boolean)
  return `${words[0]?.[0] || ''}${words.at(-1)?.[0] || ''}` || '?'
}
const studentBirth = (student) => student.birthDate
  ? `${new Date(`${student.birthDate}T00:00:00`).toLocaleDateString('fr-FR')}${student.birthPlace ? ` à ${student.birthPlace}` : ''}`
  : 'À compléter'

// Un trimestre regroupe deux séquences ; la note retenue est leur moyenne.
// De la 6e à la 3e, le bulletin n’affiche ni groupes ni série.
const SERIES_WITHOUT_GROUPS = new Set(['6E', '5E', '4ALL', '4ESP', '3ALL', '3ESP'])
const hasGroups = (seriesId) => !SERIES_WITHOUT_GROUPS.has(seriesId)

// À partir de la Seconde, seule la lettre de série figure au bulletin :
// les séries littéraires (A4 allemand ou espagnol) donnent A, puis C et D.
function seriesLetter(seriesId = '') {
  if (SERIES_WITHOUT_GROUPS.has(seriesId)) return null
  if (seriesId.includes('A4')) return 'A'
  if (seriesId.endsWith('C')) return 'C'
  if (seriesId.endsWith('D')) return 'D'
  return null
}

export function sequencesOf(db, period) {
  const trimester = (db.trimesters || []).find((item) => item.name === period || item.id === period)
  return trimester ? trimester.sequences : [period]
}

export const isTrimester = (db, period) => (db.trimesters || []).some((item) => item.name === period || item.id === period)

function calculateStudent(db, student, period) {
  const classItem = db.classes.find((item) => item.id === student.classId)
  const curriculum = db.curriculum.filter((item) => item.seriesId === classItem?.seriesId)
  const sequences = sequencesOf(db, period)
  const rows = curriculum.map((item) => {
    const subject = db.subjects.find((entry) => entry.id === item.subjectId)
    const marks = sequences.map((sequence) => db.grades
      .find((entry) => entry.studentId === student.id && entry.subjectId === item.subjectId && entry.term === sequence)?.value ?? null)
    const noted = marks.filter((mark) => mark != null)
    const value = noted.length ? noted.reduce((sum, mark) => sum + mark, 0) / noted.length : null
    return { ...item, subject, marks, value, weighted: value == null ? null : value * item.coefficient }
  })
  const available = rows.filter((row) => row.value != null)
  const coefficientSum = available.reduce((sum, row) => sum + row.coefficient, 0)
  const points = available.reduce((sum, row) => sum + row.weighted, 0)
  return { rows, sequences, average: coefficientSum ? points / coefficientSum : null, points, coefficientSum, missing: rows.length - available.length }
}

function RangeControl({ label, detail, value, min, max, step = 1, unit = '', onChange }) {
  return (
    <label className="block rounded-xl border border-line bg-white p-3.5">
      <span className="flex items-center justify-between gap-3"><b className="text-[10px] text-slate-700">{label}</b><strong className="rounded-md bg-brand-soft px-2 py-1 text-[9px] text-brand">{value}{unit}</strong></span>
      <span className="mt-0.5 block text-[8px] leading-4 text-slate-400">{detail}</span>
      <input className="mt-3 h-1.5 w-full cursor-pointer accent-[#0f8f99]" type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <span className="mt-1 flex justify-between text-[7px] text-slate-300"><i>{min}{unit}</i><i>{max}{unit}</i></span>
    </label>
  )
}

function GroupRows({ group, rows, average, rowPadding, sequenceCount = 1 }) {
  const columns = sequenceCount > 1 ? 3 + sequenceCount : 4
  return <>
    {group && <tr className="group-row"><td colSpan={columns}>{group === 1 ? 'Premier groupe' : 'Deuxième groupe'}</td><td className="text-center">Moyenne : {average?.toFixed(2) ?? '—'}/20</td></tr>}
    {rows.map((row) => <tr key={row.subjectId}>
      <td className="font-semibold" style={{ paddingBlock: `${rowPadding}mm` }}>{row.subject?.name}</td>
      {sequenceCount > 1 && row.marks.map((mark, index) => <td key={index} className="text-center" style={{ paddingBlock: `${rowPadding}mm` }}>{mark?.toFixed(2) ?? '—'}</td>)}
      <td className="text-center" style={{ paddingBlock: `${rowPadding}mm` }}>{row.coefficient}</td>
      <td className="text-center font-bold" style={{ paddingBlock: `${rowPadding}mm` }}>{row.value?.toFixed(2) ?? '—'}</td>
      <td className="text-center" style={{ paddingBlock: `${rowPadding}mm` }}>{row.weighted?.toFixed(2) ?? '—'}</td>
      <td className="text-center" style={{ paddingBlock: `${rowPadding}mm` }}>{appreciation(row.value)}</td>
    </tr>)}
  </>
}

function BulletinDocument({ db, student, classItem, series, term, result, rank, rankedCount, layout, onFitChange, documentId = 'printable-bulletin' }) {
  const pageRef = useRef(null)
  const contentRef = useRef(null)
  const [fitScale, setFitScale] = useState(1)

  const groupAverage = (group) => {
    const rows = result.rows.filter((row) => row.group === group && row.value != null)
    const coefficient = rows.reduce((sum, row) => sum + row.coefficient, 0)
    return coefficient ? rows.reduce((sum, row) => sum + row.weighted, 0) / coefficient : null
  }

  useLayoutEffect(() => {
    setFitScale(1)
    const frame = requestAnimationFrame(() => {
      if (!pageRef.current || !contentRef.current) return
      const pageStyle = getComputedStyle(pageRef.current)
      const availableHeight = pageRef.current.clientHeight - parseFloat(pageStyle.paddingTop) - parseFloat(pageStyle.paddingBottom) - 2
      const naturalHeight = contentRef.current.scrollHeight
      const nextScale = Math.min(1, availableHeight / naturalHeight)
      const safeScale = Number(Math.max(.65, nextScale).toFixed(3))
      setFitScale(safeScale)
      onFitChange?.(safeScale, nextScale >= .65)
    })
    return () => cancelAnimationFrame(frame)
  }, [layout, result, student, term, onFitChange])

  return (
    <article
      ref={pageRef}
      id={documentId}
      className="bulletin-page"
      style={{
        padding: `${layout.topMargin}mm ${layout.sideMargin}mm ${layout.bottomMargin}mm`,
        fontSize: `${layout.fontSize}px`,
      }}
    >
      <img className="watermark" src={db.school.logo} alt="" />
      <div
        ref={contentRef}
        className="bulletin-content"
        style={{ transform: `scale(${fitScale})`, transformOrigin: 'top center' }}
      >
        <header className="grid grid-cols-[1fr_auto_1fr] items-start gap-5 text-center">
          <div className="leading-relaxed"><b className="block text-[10px]">RÉPUBLIQUE DU CAMEROUN</b><span>Paix · Travail · Patrie</span><span className="block">————</span><span>MINISTÈRE DES ENSEIGNEMENTS SECONDAIRES</span></div>
          <div className="mx-auto grid place-items-center overflow-hidden rounded-full border border-[#d4b35e] bg-white p-[1mm]" style={{ width: `${layout.logoSize}mm`, height: `${layout.logoSize}mm` }}><img src={db.school.logo} alt="Logo de l’établissement" className="size-full object-contain" /></div>
          <div className="leading-relaxed"><b className="block text-[10px]">REPUBLIC OF CAMEROON</b><span>Peace · Work · Fatherland</span><span className="block">————</span><span>MINISTRY OF SECONDARY EDUCATION</span></div>
        </header>

        <div className="text-center" style={{ marginBlock: `${layout.sectionGap}mm` }}><h1 className="font-display text-[19px] font-bold uppercase tracking-wide text-brand">{db.school.name}</h1><p className="mt-0.5 text-[8px] uppercase tracking-wider">{db.school.motto}</p><p className="mt-0.5 text-[8px]">{db.school.address}{db.school.phone ? ` · Tél. ${db.school.phone}` : ''}</p></div>
        <div className="mx-auto w-fit border-2 border-slate-800 px-[12mm] py-[1.2mm] font-black uppercase" style={{ marginBottom: `${layout.sectionGap}mm`, fontSize: `${layout.titleSize}px` }}>{result.sequences.length > 1 ? `Bulletin trimestriel · ${term}` : `Bulletin séquentiel · ${term}`}</div>

        <section className="grid grid-cols-[1.2fr_.8fr] gap-[4mm]" style={{ marginBottom: `${layout.sectionGap}mm` }}>
          <div className="border border-slate-800 p-[2.5mm] leading-[1.7]"><p><b className="inline-block w-[29mm]">Nom et prénom :</b> {studentName(student)}</p><p><b className="inline-block w-[29mm]">Né(e) le :</b> {studentBirth(student)}</p><p><b className="inline-block w-[29mm]">Matricule :</b> {student.matricule}</p></div>
          <div className="border border-slate-800 p-[2.5mm] leading-[1.7]"><p><b className="inline-block w-[21mm]">Classe :</b> {classItem?.name}</p>{seriesLetter(classItem?.seriesId) && <p><b className="inline-block w-[21mm]">Série :</b> {seriesLetter(classItem.seriesId)}</p>}<p><b className="inline-block w-[21mm]">Période :</b> {term}</p></div>
        </section>

        <table className="bulletin-table">
          <thead><tr><th className="text-left">Matières</th>{result.sequences.length > 1 && result.sequences.map((sequence, index) => <th key={sequence}>Séq. {index + 1}</th>)}<th>Coef.</th><th>{result.sequences.length > 1 ? 'Moy. /20' : 'Note /20'}</th><th>Note × coef.</th><th>Appréciation</th></tr></thead>
          <tbody>{hasGroups(classItem?.seriesId)
            ? [1, 2].map((group) => <GroupRows key={group} group={group} rows={result.rows.filter((row) => row.group === group)} average={groupAverage(group)} rowPadding={layout.rowPadding} sequenceCount={result.sequences.length} />)
            : <GroupRows rows={result.rows} rowPadding={layout.rowPadding} sequenceCount={result.sequences.length} />}</tbody>
        </table>

        <section className="grid grid-cols-2 gap-[5mm]" style={{ marginTop: `${layout.sectionGap}mm` }}>
          <div className="border border-slate-800"><h3 className="border-b border-slate-800 bg-[#eaf0f3] px-2 py-1 text-center text-[9px] font-black uppercase">Synthèse des résultats</h3><dl className="grid grid-cols-[1fr_auto] gap-[1.5mm] p-[2.5mm]"><dt>Total des coefficients notés</dt><dd className="font-bold">{result.coefficientSum}</dd><dt>Total des points</dt><dd className="font-bold">{result.points.toFixed(2)}</dd><dt>Moyenne générale</dt><dd className="text-[13px] font-black">{result.average?.toFixed(2) ?? '—'} / 20</dd><dt>Rang</dt><dd className="font-black">{rank ? `${rank}${rank === 1 ? 'er' : 'e'} / ${rankedCount}` : '—'}</dd></dl></div>
          <div className="border border-slate-800"><h3 className="border-b border-slate-800 bg-[#eaf0f3] px-2 py-1 text-center text-[9px] font-black uppercase">Appréciation générale</h3><div className="min-h-[21mm] p-[2.5mm]"><b className="block text-[11px]">{appreciation(result.average)}</b><p className="mt-1.5 leading-relaxed">{generalRemark(result.average)}</p></div></div>
        </section>

        <footer className="grid grid-cols-2 gap-[15mm] text-center" style={{ marginTop: `${Math.max(3, layout.sectionGap + 2)}mm` }}><div><p>Le parent / tuteur</p><div className="mt-[10mm] border-b border-dotted border-slate-600" /></div><div><p>Fait à __________________, le __________________</p><p className="mt-[2mm] font-bold">{db.school.principal || 'Le Chef d’établissement'}</p><div className="mt-[7mm] border-b border-dotted border-slate-600" /></div></footer>
      </div>
    </article>
  )
}

function PreviewCanvas({ children }) {
  const containerRef = useRef(null)
  const [previewScale, setPreviewScale] = useState(1)

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return undefined
    const updateScale = () => {
      const pageWidth = (210 / 25.4) * 96
      const horizontalSpace = window.innerWidth < 640 ? 16 : 48
      const availableWidth = Math.max(280, container.clientWidth - horizontalSpace)
      setPreviewScale(Number(Math.min(1, availableWidth / pageWidth).toFixed(3)))
    }
    updateScale()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScale) : null
    observer?.observe(container)
    window.addEventListener('resize', updateScale)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', updateScale)
    }
  }, [])

  const pageWidth = (210 / 25.4) * 96
  const pageHeight = (297 / 25.4) * 96
  return (
    <main ref={containerRef} className="scrollbar-thin min-h-0 min-w-0 overflow-auto bg-[#d4dde3] p-2 sm:p-6">
      <div className="bulletin-preview-wrap mx-auto" style={{ width: `${pageWidth * previewScale}px`, height: `${pageHeight * previewScale}px` }}>
        <div className="bulletin-preview-transform" style={{ width: `${pageWidth}px`, height: `${pageHeight}px`, transform: `scale(${previewScale})`, transformOrigin: 'top left' }}>
          {children}
        </div>
      </div>
    </main>
  )
}

function PreviewModal({ db, student, classItem, series, term, result, rank, rankedCount, initialLayout, onClose, onSaveLayout, notify }) {
  const [layout, setLayout] = useState(initialLayout)
  const [fitScale, setFitScale] = useState(1)
  const [onePage, setOnePage] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const set = (key, value) => setLayout((current) => ({ ...current, [key]: value }))
  const fitCallback = useMemo(() => (scale, fits) => { setFitScale(scale); setOnePage(fits) }, [])

  useEffect(() => {
    const onKeyDown = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = '' }
  }, [onClose])

  const print = (pdf = false) => {
    notify('info', pdf ? 'Export PDF prêt' : 'Impression prête', pdf ? 'Choisissez « Enregistrer au format PDF » dans la fenêtre d’impression.' : 'Le document est verrouillé sur une seule page A4.')
    setTimeout(() => window.print(), 250)
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-slate-950/75 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Aperçu avant impression">
      <header className="relative z-10 flex min-h-16 shrink-0 flex-col justify-between gap-2 border-b border-white/10 bg-brand-deep px-3 py-2.5 text-white sm:flex-row sm:items-center sm:px-5">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gold text-brand-deep"><FiEye /></span><div className="min-w-0"><h2 className="truncate text-xs font-bold sm:text-sm">Aperçu avant impression</h2><p className="hidden text-[9px] text-white/45 sm:block">Ajustez la forme, vérifiez le document, puis imprimez.</p></div></div>
          <button className="icon-button !text-white/70 hover:!bg-white/10 hover:!text-white sm:hidden" onClick={onClose} aria-label="Fermer l’aperçu"><FiX size={20} /></button>
        </div>
        <div className="flex items-center justify-end gap-1.5 sm:gap-2">
          <span className={`badge mr-auto hidden sm:inline-flex ${onePage ? 'bg-emerald-400/15 text-emerald-200' : 'bg-red-400/15 text-red-200'}`}>{onePage ? <FiCheckCircle /> : <FiAlertCircle />} 1 page A4 · {Math.round(fitScale * 100)} %</span>
          <button className="btn-secondary !border-white/15 !bg-white/8 !px-3 !text-white hover:!bg-white/15 lg:hidden" onClick={() => setSettingsOpen(true)}><FiSliders /><span className="hidden min-[430px]:inline">Mise en page</span></button>
          <button className="btn-secondary !border-white/15 !bg-white/8 !px-3 !text-white hover:!bg-white/15" onClick={() => print(false)}><FiPrinter /><span className="hidden min-[430px]:inline">Imprimer</span></button>
          <button className="btn-primary !bg-gold !px-3 !text-brand-deep hover:!bg-[#edc86f]" onClick={() => print(true)}><FiDownload /><span className="hidden min-[430px]:inline">Enregistrer PDF</span></button>
          <button className="icon-button hidden !text-white/70 hover:!bg-white/10 hover:!text-white sm:grid" onClick={onClose} aria-label="Fermer l’aperçu"><FiX size={20} /></button>
        </div>
      </header>

      <div className="relative grid min-h-0 flex-1 lg:grid-cols-[320px_minmax(0,1fr)]">
        {settingsOpen && <button className="fixed inset-0 z-20 bg-slate-950/55 lg:hidden" onClick={() => setSettingsOpen(false)} aria-label="Fermer les réglages" />}
        <aside className={`scrollbar-thin fixed inset-y-0 left-0 z-30 w-[min(360px,92vw)] overflow-y-auto border-r border-line bg-slate-50 p-4 shadow-2xl transition-transform duration-300 lg:static lg:z-auto lg:w-auto lg:translate-x-0 lg:shadow-none ${settingsOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="mb-4 flex items-center justify-between border-b border-line pb-3 lg:hidden"><div><b className="block text-xs text-brand">Réglages du bulletin</b><span className="text-[8px] text-slate-400">Prévisualisation en temps réel</span></div><button className="icon-button" onClick={() => setSettingsOpen(false)} aria-label="Fermer les réglages"><FiX /></button></div>
          <div className="mb-4 flex items-center gap-2"><FiSliders className="text-cyan" /><div><h3 className="text-xs font-bold text-brand">Mise en page</h3><p className="text-[8px] text-slate-400">Les changements apparaissent immédiatement.</p></div></div>
          <div className="grid gap-2">
            <div className="rounded-xl border border-cyan/20 bg-cyan/5 p-3.5"><div className="flex items-center justify-between"><div><b className="block text-[10px] text-brand">Position de l’en-tête</b><span className="text-[8px] text-slate-400">Monter ou descendre tout le contenu.</span></div><strong className="text-[10px] text-cyan">{layout.topMargin} mm</strong></div><div className="mt-3 grid grid-cols-2 gap-2"><button className="btn-secondary !py-2" disabled={layout.topMargin <= 4} onClick={() => set('topMargin', Math.max(4, layout.topMargin - 1))}><FiArrowUp /> Remonter</button><button className="btn-secondary !py-2" disabled={layout.topMargin >= 16} onClick={() => set('topMargin', Math.min(16, layout.topMargin + 1))}><FiArrowDown /> Descendre</button></div></div>
            <RangeControl label="Marges latérales" detail="Espace à gauche et à droite." value={layout.sideMargin} min={8} max={17} unit=" mm" onChange={(value) => set('sideMargin', value)} />
            <RangeControl label="Taille du logo" detail="Dimension du logo dans l’en-tête." value={layout.logoSize} min={18} max={32} unit=" mm" onChange={(value) => set('logoSize', value)} />
            <RangeControl label="Titre du bulletin" detail="Taille du titre encadré." value={layout.titleSize} min={11} max={18} unit=" px" onChange={(value) => set('titleSize', value)} />
            <RangeControl label="Taille du texte" detail="Texte général du document." value={layout.fontSize} min={7.5} max={10} step={0.1} unit=" px" onChange={(value) => set('fontSize', value)} />
            <RangeControl label="Hauteur des lignes" detail="Compacte ou aère le tableau." value={layout.rowPadding} min={0.7} max={2} step={0.05} unit=" mm" onChange={(value) => set('rowPadding', value)} />
            <RangeControl label="Espacement des blocs" detail="Écart entre les sections du bulletin." value={layout.sectionGap} min={1.5} max={6} step={0.1} unit=" mm" onChange={(value) => set('sectionGap', value)} />
          </div>
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[9px] leading-4 text-emerald-800"><b className="flex items-center gap-1.5"><FiCheckCircle /> Ajustement automatique actif</b><p className="mt-1 text-emerald-700/70">Si le contenu devient trop grand, il est réduit proportionnellement afin de rester sur une seule page.</p></div>
          <div className="mt-4 flex gap-2"><button className="btn-secondary flex-1 !px-2" onClick={() => setLayout(DEFAULT_BULLETIN_LAYOUT)}><FiRefreshCw /> Réinitialiser</button><button className="btn-primary flex-1 !px-2" onClick={() => onSaveLayout(layout)}><FiSave /> Mémoriser</button></div>
        </aside>

        <PreviewCanvas>
          <BulletinDocument db={db} student={student} classItem={classItem} series={series} term={term} result={result} rank={rank} rankedCount={rankedCount} layout={layout} onFitChange={fitCallback} />
        </PreviewCanvas>
      </div>
    </div>
  , document.body)
}

// Fiche récapitulative d’une classe : une ligne par élève, une colonne par matière.
function ClassMarksSheet({ db, students, classItem, series, term }) {
  const subjects = useMemo(() => db.curriculum
    .filter((item) => item.seriesId === classItem?.seriesId)
    .map((item) => ({ ...item, name: db.subjects.find((entry) => entry.id === item.subjectId)?.name || item.subjectId }))
    .sort((a, b) => a.group - b.group || a.name.localeCompare(b.name)), [db.curriculum, db.subjects, classItem])

  const lines = useMemo(() => students.map((student) => {
    const result = calculateStudent(db, student, term)
    const bySubject = Object.fromEntries(result.rows.map((row) => [row.subjectId, row.value]))
    return { student, bySubject, average: result.average }
  }), [db, students, term])

  const ranking = [...lines].filter((line) => line.average != null).sort((a, b) => b.average - a.average)
  const rankOf = (id) => {
    const position = ranking.findIndex((line) => line.student.id === id)
    return position === -1 ? '—' : position + 1
  }
  const classAverage = ranking.length
    ? ranking.reduce((sum, line) => sum + line.average, 0) / ranking.length
    : null

  return createPortal(
    <section id="printable-marks-sheet" className="marks-print-sheet" aria-hidden="true">
      <header>
        <img src={db.school.logo} alt="" />
        <div>
          <h1>{db.school.name}</h1>
          <p>{db.school.motto}</p>
          <p>Fiche de notes · {classItem?.name}{seriesLetter(classItem?.seriesId) ? ` · Série ${seriesLetter(classItem.seriesId)}` : ''} · {term} · Année scolaire {db.school.academicYear}</p>
        </div>
      </header>
      <table>
        <thead>
          <tr>
            <th className="col-rank">N°</th>
            <th className="col-name">Élève</th>
            {subjects.map((item) => <th key={item.id} className="col-subject"><span>{item.name}</span></th>)}
            <th className="col-total">Moy. /20</th>
            <th className="col-total">Rang</th>
          </tr>
          <tr className="coefficient-row">
            <th colSpan="2">Coefficient</th>
            {subjects.map((item) => <th key={item.id}>{item.coefficient}</th>)}
            <th colSpan="2">—</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={line.student.id}>
              <td className="col-rank">{index + 1}</td>
              <td className="col-name">{studentName(line.student)}</td>
              {subjects.map((item) => {
                const value = line.bySubject[item.subjectId]
                return <td key={item.id} className={value != null && value < 10 ? 'below' : ''}>{value?.toFixed(2) ?? '—'}</td>
              })}
              <td className="col-total"><b>{line.average?.toFixed(2) ?? '—'}</b></td>
              <td className="col-total">{rankOf(line.student.id)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2 + subjects.length} className="col-name">Moyenne générale de la classe · {ranking.length} élève(s) classé(s) sur {students.length}</td>
            <td className="col-total"><b>{classAverage?.toFixed(2) ?? '—'}</b></td>
            <td className="col-total">—</td>
          </tr>
        </tfoot>
      </table>
      <footer>Imprimé le {new Intl.DateTimeFormat('fr-CM').format(new Date())} · {db.school.name}</footer>
    </section>,
    document.body,
  )
}

// L’administration ajuste les coefficients de la série avant d’imprimer.
function CoefficientEditor({ db, classItem, series, onUpdate, notify, onClose }) {
  const rows = useMemo(() => db.curriculum
    .filter((item) => item.seriesId === classItem?.seriesId)
    .map((item) => ({ ...item, name: db.subjects.find((entry) => entry.id === item.subjectId)?.name || item.subjectId }))
    .sort((a, b) => a.group - b.group || b.coefficient - a.coefficient || a.name.localeCompare(b.name)), [db.curriculum, db.subjects, classItem])

  const [draft, setDraft] = useState(() => Object.fromEntries(rows.map((row) => [row.id, String(row.coefficient)])))

  const change = (id, value) => {
    if (value !== '' && !/^\d{0,2}([.,]\d{0,2})?$/.test(value)) return
    setDraft((current) => ({ ...current, [id]: value.replace(',', '.') }))
  }

  const invalid = Object.values(draft).filter((value) => value === '' || !(Number(value) > 0 && Number(value) <= 20))
  const dirty = rows.some((row) => Number(draft[row.id]) !== row.coefficient)
  const groupTotal = (group) => rows.filter((row) => row.group === group)
    .reduce((sum, row) => sum + (Number(draft[row.id]) || 0), 0)

  const save = () => {
    if (invalid.length) return notify('error', 'Coefficient invalide', 'Chaque coefficient doit être supérieur à 0 et au plus égal à 20.')
    onUpdate((current) => ({
      ...current,
      curriculum: current.curriculum.map((item) => (item.id in draft ? { ...item, coefficient: Number(draft[item.id]) } : item)),
    }))
    notify('success', 'Coefficients enregistrés', `${series?.name || classItem?.name} · appliqués immédiatement au bulletin.`)
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/70 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Modifier les coefficients">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-line bg-brand-deep px-5 py-3.5 text-white">
          <div className="min-w-0"><h2 className="truncate text-sm font-bold">Coefficients du bulletin</h2><p className="mt-0.5 text-[9px] text-white/50">{series?.name || classItem?.name} · appliqué à toutes les classes de la série</p></div>
          <button className="icon-button !text-white/70 hover:!bg-white/10 hover:!text-white" onClick={onClose} aria-label="Fermer"><FiX size={20} /></button>
        </header>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-5">
          {(hasGroups(classItem?.seriesId) ? [1, 2] : [0]).map((group) => {
            const groupRows = group ? rows.filter((row) => row.group === group) : rows
            if (!groupRows.length) return null
            return (
              <section key={group} className="mb-5 last:mb-0">
                <div className="mb-2 flex items-baseline justify-between"><b className="text-[11px] text-brand">{group === 0 ? 'Matières' : group === 1 ? 'Premier groupe' : 'Deuxième groupe'}</b><span className="text-[9px] text-slate-400">Total des coefficients : {group ? groupTotal(group) : rows.reduce((sum, row) => sum + (Number(draft[row.id]) || 0), 0)}</span></div>
                <div className="overflow-hidden rounded-xl border border-line">
                  {groupRows.map((row, index) => {
                    const value = draft[row.id] ?? ''
                    const bad = value === '' || !(Number(value) > 0 && Number(value) <= 20)
                    return (
                      <label key={row.id} className={`flex items-center justify-between gap-3 px-4 py-2.5 ${index % 2 ? 'bg-slate-50/60' : ''}`}>
                        <span className="truncate text-[11px] text-slate-700">{row.name}</span>
                        <input className={`field !w-20 !px-2 !py-1.5 text-center font-bold ${bad ? '!border-red-500 !bg-red-50 !text-red-700' : ''}`} inputMode="decimal" value={value} onChange={(event) => change(row.id, event.target.value)} aria-label={`Coefficient de ${row.name}`} />
                      </label>
                    )
                  })}
                </div>
              </section>
            )
          })}
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[9px] leading-4 text-amber-900">Ces coefficients s’appliquent à <b>toutes les classes de la série</b> et à tous les bulletins déjà calculés. Les notes restent inchangées.</p>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-line bg-slate-50 px-5 py-3">
          <span className="text-[9px] text-slate-400">{invalid.length ? `${invalid.length} coefficient(s) invalide(s)` : dirty ? 'Modifications non enregistrées' : 'Aucune modification'}</span>
          <div className="flex gap-2"><button className="btn-secondary" onClick={onClose}>Annuler</button><button className="btn-primary" disabled={!dirty || invalid.length > 0} onClick={save}><FiSave /> Enregistrer</button></div>
        </footer>
      </div>
    </div>,
    document.body,
  )
}

// Impression d’une classe entière : un bulletin par page A4, dans l’ordre alphabétique.
function BatchPrintSheet({ db, students, classItem, series, term, layout }) {
  const ranked = useMemo(() => students
    .map((item) => ({ id: item.id, average: calculateStudent(db, item, term).average }))
    .filter((item) => item.average != null)
    .sort((a, b) => b.average - a.average), [db, students, term])

  return createPortal(
    <div id="printable-batch" className="bulletin-batch-sheet" aria-hidden="true">
      {students.map((student) => {
        const result = calculateStudent(db, student, term)
        const position = ranked.findIndex((item) => item.id === student.id)
        return (
          <BulletinDocument
            key={student.id}
            documentId={`printable-bulletin-${student.id}`}
            db={db}
            student={student}
            classItem={classItem}
            series={series}
            term={term}
            result={result}
            rank={result.average == null ? null : position + 1}
            rankedCount={ranked.length}
            layout={layout}
          />
        )
      })}
    </div>,
    document.body,
  )
}

export default function Bulletins({ db, onUpdate, notify, user }) {
  const [section, setSection] = useState('toutes')
  const visibleClasses = useMemo(() => db.classes.filter((item) => section === 'toutes' || item.section === section), [db.classes, section])
  const [classId, setClassId] = useState(db.classes[0]?.id || '')
  const classStudents = useMemo(() => db.students.filter((student) => student.classId === classId && student.active).sort((a, b) => a.lastName.localeCompare(b.lastName)), [db.students, classId])
  const [studentId, setStudentId] = useState(classStudents[0]?.id || '')
  const [term, setTerm] = useState(db.activeTerm)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [batchPrinting, setBatchPrinting] = useState(false)
  const [marksPrinting, setMarksPrinting] = useState(false)
  const [coefficientsOpen, setCoefficientsOpen] = useState(false)
  const canEditCoefficients = user?.role === 'administration' || user?.role === 'developer'

  // Changer de section ramène sur la première classe de cette section.
  useEffect(() => { if (!visibleClasses.some((item) => item.id === classId)) setClassId(visibleClasses[0]?.id || '') }, [visibleClasses, classId])
  useEffect(() => { if (!classStudents.some((student) => student.id === studentId)) setStudentId(classStudents[0]?.id || '') }, [classStudents, studentId])

  const student = db.students.find((item) => item.id === studentId)
  const classItem = db.classes.find((item) => item.id === classId)
  const series = db.series.find((item) => item.id === classItem?.seriesId)
  const result = student ? calculateStudent(db, student, term) : null
  const ranked = classStudents.map((item) => ({ id: item.id, average: calculateStudent(db, item, term).average })).filter((item) => item.average != null).sort((a, b) => b.average - a.average)
  const rank = result?.average == null ? null : ranked.findIndex((item) => item.id === studentId) + 1
  const layout = { ...DEFAULT_BULLETIN_LAYOUT, ...(db.bulletinLayout || {}) }

  // Les bulletins du lot sont montés hors écran, puis imprimés une fois peints.
  const printClass = () => {
    if (!classStudents.length) return
    setBatchPrinting(true)
    notify('info', 'Préparation des bulletins', `${classStudents.length} bulletin(s) · ${classItem?.name} · ${term}`)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.setTimeout(() => {
        window.print()
        setBatchPrinting(false)
      }, 400)
    }))
  }

  // Fiche de notes de la classe : toutes les matières sur une seule feuille.
  const printMarksSheet = () => {
    if (!classStudents.length) return
    setMarksPrinting(true)
    notify('info', 'Préparation de la fiche', `${classItem?.name} · ${term} · ${classStudents.length} élève(s)`)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.setTimeout(() => {
        window.print()
        setMarksPrinting(false)
      }, 400)
    }))
  }

  const saveLayout = (nextLayout) => {
    onUpdate((current) => ({ ...current, bulletinLayout: nextLayout }))
    notify('success', 'Mise en page mémorisée', 'Ces réglages seront proposés pour les prochains bulletins.')
  }

  return (
    <div className="page-enter">
      <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><span className="section-kicker">Documents scolaires</span><h1 className="page-title mt-1">Bulletins</h1><p className="mt-2 text-xs text-slate-500">Sélectionnez un élève, puis vérifiez et ajustez la mise en page avant l’impression.</p></div><div className="flex flex-wrap items-center gap-2">{canEditCoefficients && classItem && <button className="btn-secondary" onClick={() => setCoefficientsOpen(true)}><FiSliders /> Coefficients</button>}{classStudents.length > 0 && <button className="btn-secondary" onClick={printMarksSheet} disabled={marksPrinting}><FiFileText /> {marksPrinting ? 'Préparation…' : 'Fiche de notes'}</button>}{classStudents.length > 0 && <button className="btn-secondary" onClick={printClass} disabled={batchPrinting}><FiPrinter /> {batchPrinting ? 'Préparation…' : `Imprimer la classe (${classStudents.length})`}</button>}{student && <button className="btn-primary" onClick={() => setPreviewOpen(true)}><FiEye /> Aperçu avant impression</button>}</div></header>

      <section className="panel mb-5 grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label><span className="field-label">Section</span><select className="field" value={section} onChange={(e) => setSection(e.target.value)}><option value="toutes">Toutes les sections</option><option value="francophone">Francophone</option><option value="anglophone">Anglophone</option></select></label>
        <label><span className="field-label">Classe</span><select className="field" value={classId} onChange={(e) => setClassId(e.target.value)}>{visibleClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label><span className="field-label">Élève</span><select className="field" value={studentId} onChange={(e) => setStudentId(e.target.value)}><option value="">Sélectionner un élève</option>{classStudents.map((item) => <option key={item.id} value={item.id}>{item.lastName} {item.firstName}</option>)}</select></label>
        <label><span className="field-label">Type de bulletin</span><select className="field" value={term} onChange={(e) => setTerm(e.target.value)}><optgroup label="Bulletin séquentiel">{db.terms.map((item) => <option key={item}>{item}</option>)}</optgroup><optgroup label="Bulletin trimestriel">{(db.trimesters || []).map((item) => <option key={item.id}>{item.name}</option>)}</optgroup></select></label>
      </section>

      {student && result ? <>
        {(result.missing > 0 || student.profileIncomplete) && <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900"><FiAlertCircle className="mt-0.5 shrink-0" /><div><b className="block text-[11px]">Bulletin partiellement renseigné</b><span className="text-[9px]">{student.profileIncomplete ? 'Complétez la fiche de l’élève (prénom séparé, naissance et sexe). ' : ''}{result.missing > 0 ? `${result.missing} matière(s) sans note ne sont pas comptées dans la moyenne.` : ''}</span></div></div>}
        <section className="panel overflow-hidden">
          <div className="grid gap-6 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-7">
            <div className="flex items-start gap-4"><span className="grid size-13 shrink-0 place-items-center rounded-2xl bg-brand text-lg font-black text-white">{studentInitials(student)}</span><div><span className="section-kicker">Bulletin sélectionné</span><h2 className="mt-1 text-lg font-bold text-brand">{studentName(student)}</h2><p className="mt-1 text-[10px] text-slate-400">{classItem?.name} · {term} · Matricule {student.matricule}</p></div></div>
            <button className="btn-primary !px-6 !py-3" onClick={() => setPreviewOpen(true)}><FiFileText size={17} /> Prévisualiser le bulletin</button>
          </div>
          <div className="grid grid-cols-2 border-t border-line bg-slate-50/70 sm:grid-cols-4">
            <div className="border-r border-line p-4 text-center"><span className="block text-[9px] uppercase tracking-wider text-slate-400">Moyenne</span><b className="mt-1 block text-xl text-brand">{result.average?.toFixed(2) ?? '—'}<small className="text-[10px] text-slate-400"> /20</small></b></div>
            <div className="border-r border-line p-4 text-center"><span className="block text-[9px] uppercase tracking-wider text-slate-400">Rang</span><b className="mt-1 block text-xl text-brand">{rank ? `${rank}${rank === 1 ? 'er' : 'e'}` : '—'}</b></div>
            <div className="border-r border-line p-4 text-center"><span className="block text-[9px] uppercase tracking-wider text-slate-400">Matières notées</span><b className="mt-1 block text-xl text-brand">{result.rows.length - result.missing}<small className="text-[10px] text-slate-400"> / {result.rows.length}</small></b></div>
            <div className="p-4 text-center"><span className="block text-[9px] uppercase tracking-wider text-slate-400">Format</span><b className="mt-1 flex items-center justify-center gap-1.5 text-sm text-emerald-700"><FiCheckCircle /> 1 page A4</b></div>
          </div>
        </section>
      </> : <div className="panel py-20 text-center"><span className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand-soft text-brand"><FiUser size={28} /></span><h2 className="mt-4 text-sm font-bold text-brand">Sélectionnez un élève</h2><p className="mt-1 text-[10px] text-slate-400">Vous pourrez ensuite ouvrir l’aperçu et adapter la forme du bulletin.</p></div>}

      {coefficientsOpen && classItem && <CoefficientEditor db={db} classItem={classItem} series={series} onUpdate={onUpdate} notify={notify} onClose={() => setCoefficientsOpen(false)} />}

      {marksPrinting && <ClassMarksSheet db={db} students={classStudents} classItem={classItem} series={series} term={term} />}

      {batchPrinting && <BatchPrintSheet db={db} students={classStudents} classItem={classItem} series={series} term={term} layout={layout} />}

      {previewOpen && student && result && <PreviewModal db={db} student={student} classItem={classItem} series={series} term={term} result={result} rank={rank} rankedCount={ranked.length} initialLayout={layout} onClose={() => setPreviewOpen(false)} onSaveLayout={saveLayout} notify={notify} />}
    </div>
  )
}
