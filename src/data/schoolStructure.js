export const ADDITIONAL_SUBJECTS = [
  ['pct', 'PCT'],
  ['biologie', 'Biology'],
  ['citizenship', 'Citizenship'],
  ['economie', 'Economics'],
  ['religion', 'Religion'],
  ['sciences', 'Sciences'],
  ['dictee', 'Dictée orthographique'],
  // Sous-système anglophone.
  ['geology', 'Geology'],
  ['food-nutrition', 'Food and Nutrition'],
  ['human-biology', 'Human Biology'],
  ['further-maths', 'Additional / Further Mathematics'],
  ['logic', 'Logic'],
].map(([id, name]) => ({ id, name, active: true }))

export const SCHOOL_SERIES = [
  { id: '6E', name: '6e' },
  { id: '5E', name: '5e' },
  { id: '4ALL', name: '4e Allemand' },
  { id: '4ESP', name: '4e Espagnol' },
  { id: '3ALL', name: '3e Allemand' },
  { id: '3ESP', name: '3e Espagnol' },
  { id: '2A4ALL', name: 'Seconde A4 Allemand' },
  { id: '2A4ESP', name: 'Seconde A4 Espagnol' },
  { id: '2C', name: 'Seconde C' },
  { id: '1A4ALL', name: 'Première A4 Allemand' },
  { id: '1A4ESP', name: 'Première A4 Espagnol' },
  { id: '1C', name: 'Première C' },
  { id: '1D', name: 'Première D' },
  { id: 'A4ALL', name: 'Terminale A4 Allemand' },
  { id: 'A4ESP', name: 'Terminale A4 Espagnol' },
  { id: 'C', name: 'Terminale C' },
  { id: 'D', name: 'Terminale D' },
  { id: 'F1', name: 'Form 1' },
  { id: 'F2', name: 'Form 2' },
  { id: 'F3', name: 'Form 3' },
  { id: 'F4', name: 'Form 4' },
  { id: 'F5', name: 'Form 5' },
  { id: 'L6', name: 'Lower Sixth' },
  { id: 'U6', name: 'Upper Sixth' },
]

export const SCHOOL_CLASSES = [
  { id: 'class-6e', name: '6e', level: '6e', seriesId: '6E', section: 'francophone' },
  { id: 'class-5e', name: '5e', level: '5e', seriesId: '5E', section: 'francophone' },
  { id: 'class-4e-all', name: '4e ALL', level: '4e', seriesId: '4ALL', section: 'francophone' },
  { id: 'class-4e-esp', name: '4e ESP', level: '4e', seriesId: '4ESP', section: 'francophone' },
  { id: 'class-3e-all', name: '3e ALL', level: '3e', seriesId: '3ALL', section: 'francophone' },
  { id: 'class-3e-esp', name: '3e ESP', level: '3e', seriesId: '3ESP', section: 'francophone' },
  { id: 'class-2nde-a4-all', name: '2nde A4 ALL', level: 'Seconde', seriesId: '2A4ALL', section: 'francophone' },
  { id: 'class-2nde-a4-esp', name: '2nde A4 ESP', level: 'Seconde', seriesId: '2A4ESP', section: 'francophone' },
  { id: 'class-2nde-c', name: '2nde C', level: 'Seconde', seriesId: '2C', section: 'francophone' },
  { id: 'class-premiere-a4-all', name: 'Première A4 ALL', level: 'Première', seriesId: '1A4ALL', section: 'francophone' },
  { id: 'class-premiere-a4-esp', name: 'Première A4 ESP', level: 'Première', seriesId: '1A4ESP', section: 'francophone' },
  { id: 'class-premiere-c', name: 'Première C', level: 'Première', seriesId: '1C', section: 'francophone' },
  { id: 'class-premiere-d', name: 'Première D', level: 'Première', seriesId: '1D', section: 'francophone' },
  { id: 'class-a4all', name: 'Terminale A4 ALL', level: 'Terminale', seriesId: 'A4ALL', section: 'francophone' },
  { id: 'class-a4esp', name: 'Terminale A4 ESP', level: 'Terminale', seriesId: 'A4ESP', section: 'francophone' },
  { id: 'class-c', name: 'Terminale C', level: 'Terminale', seriesId: 'C', section: 'francophone' },
  { id: 'class-d', name: 'Terminale D', level: 'Terminale', seriesId: 'D', section: 'francophone' },
  { id: 'class-form-1', name: 'Form 1', level: 'Form 1', seriesId: 'F1', section: 'anglophone' },
  { id: 'class-form-2', name: 'Form 2', level: 'Form 2', seriesId: 'F2', section: 'anglophone' },
  { id: 'class-form-3', name: 'Form 3', level: 'Form 3', seriesId: 'F3', section: 'anglophone' },
  { id: 'class-form-4', name: 'Form 4', level: 'Form 4', seriesId: 'F4', section: 'anglophone' },
  { id: 'class-form-5', name: 'Form 5', level: 'Form 5', seriesId: 'F5', section: 'anglophone' },
  { id: 'class-lower-sixth', name: 'Lower Sixth', level: 'Lower Sixth', seriesId: 'L6', section: 'anglophone' },
  { id: 'class-upper-sixth', name: 'Upper Sixth', level: 'Upper Sixth', seriesId: 'U6', section: 'anglophone' },
]

const frenchLower = ['francais', 'dictee', 'anglais', 'mathematiques', 'svteeh', 'histoire', 'geographie', 'ecm', 'informatique', 'eps', 'tm']
const frenchMiddle = [...frenchLower, 'pct', 'allemand', 'espagnol']
// En filière littéraire, « Sciences » remplace Mathématiques, Physique et Chimie,
// et chaque série ne suit que sa propre langue vivante.
const literaryProgram = (language) => ['francais', 'litterature', 'anglais', language, 'sciences', 'philosophie', 'histoire', 'geographie', 'ecm', 'informatique', 'eps', 'tm']
const frenchSecondary = ['francais', 'litterature', 'anglais', 'allemand', 'espagnol', 'mathematiques', 'physique', 'chimie', 'svteeh', 'philosophie', 'histoire', 'geographie', 'ecm', 'informatique', 'eps', 'tm']
// Sous-système anglophone : relevé sur le tableau officiel des coefficients.
// Un tiret dans le tableau signifie que la matière n’est pas enseignée à ce niveau.
const englishLower = ['anglais', 'litterature', 'francais', 'geographie', 'histoire', 'citizenship', 'biologie', 'chimie', 'mathematiques', 'physique', 'informatique', 'food-nutrition']
const englishMiddle = [...englishLower, 'economie']
const englishForm4 = [...englishMiddle, 'geology', 'human-biology', 'further-maths', 'logic']
const englishSixth = ['anglais', 'litterature', 'francais', 'geographie', 'economie', 'histoire', 'biologie', 'chimie', 'mathematiques', 'physique', 'informatique', 'geology', 'food-nutrition', 'human-biology', 'philosophie']

export const SCHOOL_PROGRAM_SUBJECTS = {
  '6E': frenchLower,
  '5E': frenchLower,
  '4ALL': frenchMiddle,
  '4ESP': frenchMiddle,
  '3ALL': frenchMiddle,
  '3ESP': frenchMiddle,
  '2A4ALL': literaryProgram('allemand'),
  '2A4ESP': literaryProgram('espagnol'),
  '2C': frenchSecondary,
  '1A4ALL': literaryProgram('allemand'),
  '1A4ESP': literaryProgram('espagnol'),
  '1C': frenchSecondary,
  '1D': frenchSecondary,
  'A4ALL': literaryProgram('allemand'),
  'A4ESP': literaryProgram('espagnol'),
  'C': frenchSecondary,
  'D': frenchSecondary,
  'F1': englishLower,
  'F2': englishLower,
  'F3': [...englishMiddle, 'logic'],
  'F4': englishForm4,
  'F5': englishForm4,
  'L6': englishSixth,
  'U6': englishSixth,
}

const forms = ['class-form-1', 'class-form-2', 'class-form-3', 'class-form-4', 'class-form-5']
const allFourth = ['class-4e-all', 'class-4e-esp']
const allThird = ['class-3e-all', 'class-3e-esp']
const secondA = ['class-2nde-a4-all', 'class-2nde-a4-esp']
const firstA = ['class-premiere-a4-all', 'class-premiere-a4-esp']
const terminalA = ['class-a4all', 'class-a4esp']
const terminalAll = [...terminalA, 'class-c', 'class-d']

const assignmentSpecs = [
  ['takou-jules', [[allThird, ['pct']], [['class-premiere-c', 'class-premiere-d', 'class-c', 'class-d'], ['physique']]]],
  ['soudobou-golda', [[[...terminalAll, ...secondA, 'class-2nde-c'], ['francais', 'litterature']]]],
  ['makamda-grace', [[[...allFourth, ...allThird], ['allemand']]]],
  ['mbazoa-akounou-jeannette-sandra', [[forms, ['biologie']]]],
  ['mebune-romanus-etore', [[['class-form-3', 'class-form-4', 'class-form-5'], ['citizenship']]]],
  ['danying-melody-labem', [[['class-form-4', 'class-form-5'], ['geographie']]]],
  ['miang-romanus', [[forms, ['economie', 'geographie']]]],
  ['neba-precious', [[forms, ['religion']]]],
  ['tafadji-charnelle', [[[...allFourth, ...secondA, 'class-2nde-c', ...firstA, 'class-premiere-c'], ['histoire', 'geographie']], [['class-6e', 'class-5e'], ['ecm']]]],
  ['ngufor', [[forms, ['litterature', 'anglais']]]],
  ['ghomsi-sikali', [[['class-2nde-c', ...firstA, ...terminalAll], ['informatique']]]],
  ['baenla-landry', [[['class-premiere-c', 'class-premiere-d', ...allThird], ['informatique']]]],
  ['njikam-amidou', [[allThird, ['svteeh']], [['class-premiere-d', 'class-d'], ['svteeh']]]],
  ['dommo-amel', [[['class-5e', ...allThird, ...secondA, 'class-2nde-c', ...firstA, 'class-premiere-d', ...terminalAll], ['histoire', 'geographie', 'ecm']]]],
  ['tiani-assi-duval', [[['class-6e', ...allFourth, ...allThird, ...secondA, 'class-2nde-c', ...terminalAll], ['histoire', 'geographie', 'ecm']]]],
  ['kwomo-maeva', [[['class-6e', 'class-5e', ...allFourth, ...secondA], ['svteeh']]]],
  ['mani-aime-joseph', [[[...secondA, ...firstA, 'class-premiere-c', 'class-premiere-d', ...terminalAll], ['philosophie']]]],
  ['manga-rostand', [[['class-c', 'class-d', ...allThird, 'class-premiere-d'], ['mathematiques']]]],
  ['mfangam-soumeya', [[allFourth, ['pct']], [[...secondA, 'class-2nde-c'], ['physique']], [[...firstA, 'class-premiere-c', 'class-premiere-d', ...terminalAll], ['chimie']]]],
  ['yinda-perpetue-grace', [[['class-2nde-c', ...firstA, ...terminalA, 'class-c'], ['svteeh']]]],
  ['omgba-balla', [[['class-6e', 'class-5e'], ['mathematiques']]]],
  ['meghue-linda-biorene', [[['class-6e', 'class-5e', ...allFourth, ...secondA], ['informatique']]]],
  ['nouga-cedric', [[['class-2nde-c', ...terminalA, ...firstA], ['mathematiques']]]],
  ['mejame-glory', [[forms, ['mathematiques', 'informatique']]]],
  ['tamogho-mayoline', [[forms, ['physique']]]],
  ['neh-norah', []],
  ['djouri-gervais-junior', [[['class-6e', 'class-5e', ...allFourth], ['histoire', 'ecm']]]],
]

let assignmentIndex = 0
export const IMPORTED_TEACHER_ASSIGNMENTS = assignmentSpecs.flatMap(([teacherSlug, groups]) => groups.flatMap(([classIds, subjectIds]) => classIds.flatMap((classId) => subjectIds.map((subjectId) => ({
  id: `assignment-import-${++assignmentIndex}`,
  teacherId: `teacher-${teacherSlug}`,
  classId,
  subjectId,
})))))

// La section d’un enseignant se déduit des classes qu’il enseigne :
// « anglophone », « francophone », ou « bilingue » s’il intervient dans les deux.
const CLASS_SECTIONS = Object.fromEntries(SCHOOL_CLASSES.map((item) => [item.id, item.section]))

export function sectionFromAssignments(teacherId, assignments = IMPORTED_TEACHER_ASSIGNMENTS) {
  const sections = new Set(assignments
    .filter((item) => item.teacherId === teacherId)
    .map((item) => CLASS_SECTIONS[item.classId])
    .filter(Boolean))
  if (sections.size === 0) return 'francophone'
  if (sections.size > 1) return 'bilingue'
  return [...sections][0]
}
