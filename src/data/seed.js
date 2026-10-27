import { hashPassword } from '../lib/store.js'
import { IMPORTED_TEACHERS, IMPORTED_TEACHER_USERS } from './teachers.js'
import { ADDITIONAL_SUBJECTS, IMPORTED_TEACHER_ASSIGNMENTS, SCHOOL_CLASSES, SCHOOL_PROGRAM_SUBJECTS, SCHOOL_SERIES } from './schoolStructure.js'
import { IMPORTED_STUDENTS } from './students.js'

const subjects = [
  ['allemand', 'Allemand'],
  ['anglais', 'Anglais'],
  ['svteeh', 'SVTEEH'],
  ['litterature', 'Littérature'],
  ['francais', 'Langue française'],
  ['philosophie', 'Philosophie'],
  ['physique', 'Physique'],
  ['chimie', 'Chimie'],
  ['mathematiques', 'Mathématiques'],
  ['informatique', 'Informatique'],
  ['eps', 'EPS'],
  ['tm', 'Travail manuel'],
  ['histoire', 'Histoire'],
  ['geographie', 'Géographie'],
  ['ecm', 'ECM'],
  ['espagnol', 'Espagnol'],
].map(([id, name]) => ({ id, name, active: true })).concat(ADDITIONAL_SUBJECTS)

// Coefficients relevés sur les tableaux manuscrits de l’établissement.
// Série A : Philosophie 3 en Première/Terminale A, Sciences 1, Anglais 4.
// Séries C/D : Philosophie 1, Mathématiques et Physique dominants.
const secondCycleCommon = {
  informatique: 2, ecm: 2, histoire: 2, geographie: 2, eps: 1, tm: 1, francais: 2, litterature: 2,
}

const seriesA = {
  ...secondCycleCommon, anglais: 4, sciences: 1, mathematiques: 2, philosophie: 3,
  physique: 1, chimie: 1,
}

const coefficients = {
  // Seconde
  // Seconde littéraire : relevée sur le bulletin manuscrit de l’établissement.
  '2A4ALL': { ...secondCycleCommon, anglais: 4, allemand: 3, francais: 2, litterature: 3, philosophie: 2, sciences: 1, eps: 2 },
  '2A4ESP': { ...secondCycleCommon, anglais: 4, espagnol: 3, francais: 2, litterature: 3, philosophie: 2, sciences: 1, eps: 2 },
  '2C': { ...secondCycleCommon, mathematiques: 5, physique: 1, chimie: 2, svteeh: 2, anglais: 3, philosophie: 2, allemand: 1, espagnol: 1 },
  // Première littéraire : relevée sur le bulletin manuscrit de l’établissement.
  '1A4ALL': { ...secondCycleCommon, anglais: 4, allemand: 2, francais: 2, litterature: 3, philosophie: 3, sciences: 1, eps: 2 },
  '1A4ESP': { ...secondCycleCommon, anglais: 4, espagnol: 2, francais: 2, litterature: 3, philosophie: 3, sciences: 1, eps: 2 },
  '1C': { ...secondCycleCommon, mathematiques: 6, physique: 4, chimie: 2, svteeh: 2, anglais: 3, philosophie: 1, allemand: 1, espagnol: 1 },
  '1D': { ...secondCycleCommon, mathematiques: 4, physique: 3, chimie: 2, svteeh: 6, anglais: 3, philosophie: 1, litterature: 1, allemand: 1, espagnol: 1 },
  // Terminale
  // Terminale littéraire : relevée sur le bulletin manuscrit de l’établissement.
  'A4ALL': { ...secondCycleCommon, anglais: 4, allemand: 3, francais: 2, litterature: 3, philosophie: 4, sciences: 1, eps: 2 },
  'A4ESP': { ...secondCycleCommon, anglais: 4, espagnol: 3, francais: 2, litterature: 3, philosophie: 4, sciences: 1, eps: 2 },
  'C': { ...secondCycleCommon, mathematiques: 6, physique: 4, chimie: 2, svteeh: 2, anglais: 3, philosophie: 1, allemand: 1, espagnol: 1 },
  'D': { ...secondCycleCommon, mathematiques: 4, physique: 3, chimie: 2, svteeh: 6, anglais: 3, philosophie: 1, litterature: 1, allemand: 1, espagnol: 1 },
  // Sous-système anglophone : coefficients du tableau officiel.
  'F1': { anglais: 4, litterature: 2, francais: 4, geographie: 2, histoire: 2, citizenship: 2, biologie: 2, chimie: 2, mathematiques: 4, physique: 2, informatique: 2, 'food-nutrition': 2 },
  'F2': { anglais: 4, litterature: 2, francais: 4, geographie: 2, histoire: 2, citizenship: 2, biologie: 2, chimie: 2, mathematiques: 4, physique: 2, informatique: 2, 'food-nutrition': 2 },
  'F3': { anglais: 4, litterature: 3, francais: 4, geographie: 3, economie: 3, histoire: 3, citizenship: 3, biologie: 3, chimie: 3, mathematiques: 4, physique: 3, informatique: 3, 'food-nutrition': 3, logic: 2 },
  'F4': { anglais: 4, litterature: 3, francais: 4, geographie: 3, economie: 3, histoire: 3, citizenship: 3, informatique: 3, biologie: 3, chimie: 3, mathematiques: 4, physique: 3, geology: 3, 'food-nutrition': 3, 'human-biology': 3, 'further-maths': 3, logic: 3 },
  'F5': { anglais: 5, litterature: 5, francais: 5, geographie: 5, economie: 5, histoire: 5, citizenship: 5, informatique: 5, biologie: 5, chimie: 5, mathematiques: 5, physique: 5, geology: 5, 'food-nutrition': 5, 'human-biology': 5, 'further-maths': 5, logic: 5 },
  'L6': { anglais: 5, litterature: 5, francais: 5, geographie: 5, economie: 5, histoire: 5, biologie: 5, chimie: 5, mathematiques: 5, physique: 5, informatique: 5, geology: 5, 'food-nutrition': 5, 'human-biology': 5, philosophie: 5 },
  'U6': { anglais: 5, litterature: 5, francais: 5, geographie: 5, economie: 5, histoire: 5, biologie: 5, chimie: 5, mathematiques: 5, physique: 5, informatique: 5, geology: 5, 'food-nutrition': 5, 'human-biology': 5, philosophie: 5 },
  // Premier cycle
  '6E': { mathematiques: 4, anglais: 3, francais: 2, dictee: 2, svteeh: 1, histoire: 2, geographie: 2, ecm: 2, informatique: 2, eps: 1, tm: 1 },
  '5E': { mathematiques: 4, anglais: 3, francais: 2, dictee: 2, svteeh: 1, histoire: 2, geographie: 2, ecm: 2, informatique: 2, eps: 1, tm: 1 },
  '4ALL': { mathematiques: 4, anglais: 3, francais: 2, dictee: 2, svteeh: 1, pct: 3, allemand: 3, espagnol: 1, histoire: 2, geographie: 2, ecm: 2, informatique: 2, eps: 1, tm: 1 },
  '4ESP': { mathematiques: 4, anglais: 3, francais: 2, dictee: 2, svteeh: 1, pct: 3, espagnol: 3, allemand: 1, histoire: 2, geographie: 2, ecm: 2, informatique: 2, eps: 1, tm: 1 },
  '3ALL': { mathematiques: 4, anglais: 3, francais: 2, dictee: 2, svteeh: 1, pct: 3, allemand: 3, espagnol: 1, histoire: 2, geographie: 2, ecm: 2, informatique: 2, eps: 1, tm: 1 },
  '3ESP': { mathematiques: 4, anglais: 3, francais: 2, dictee: 2, svteeh: 1, pct: 3, espagnol: 3, allemand: 1, histoire: 2, geographie: 2, ecm: 2, informatique: 2, eps: 1, tm: 1 },
}

// Le premier groupe rassemble les matières dominantes de la série.
const FIRST_GROUP = ['francais', 'dictee', 'litterature', 'anglais', 'mathematiques', 'pct', 'biologie', 'physique', 'chimie', 'svteeh', 'sciences', 'philosophie', 'allemand', 'espagnol']

// En Première littéraire, le bulletin ne retient que les langues, la littérature
// et la philosophie au premier groupe : Mathématiques et Sciences passent au second.
const literaryFirstGroup = (language) => ['anglais', language, 'francais', 'litterature', 'philosophie']

// En série C, le premier groupe rassemble les matières scientifiques.
const scientificFirstGroup = ['mathematiques', 'informatique', 'chimie', 'physique', 'svteeh']

const SERIES_FIRST_GROUP = {
  '2C': scientificFirstGroup,
  '1C': scientificFirstGroup,
  'C': scientificFirstGroup,
  '1D': scientificFirstGroup,
  'D': scientificFirstGroup,
  '2A4ALL': literaryFirstGroup('allemand'),
  '2A4ESP': literaryFirstGroup('espagnol'),
  '1A4ALL': literaryFirstGroup('allemand'),
  '1A4ESP': literaryFirstGroup('espagnol'),
  'A4ALL': literaryFirstGroup('allemand'),
  'A4ESP': literaryFirstGroup('espagnol'),
}

const groupOf = (seriesId, subjectId) => {
  const explicit = SERIES_FIRST_GROUP[seriesId]
  if (explicit) return explicit.includes(subjectId) ? 1 : 2
  return FIRST_GROUP.includes(subjectId) ? 1 : 2
}

const curriculum = Object.entries(SCHOOL_PROGRAM_SUBJECTS).flatMap(([seriesId, subjectIds]) =>
  subjectIds.map((subjectId) => ({
    id: `${seriesId}-${subjectId}`,
    seriesId,
    subjectId,
    group: groupOf(seriesId, subjectId),
    coefficient: coefficients[seriesId]?.[subjectId] ?? 1,
  })),
)

export function createInitialDatabase() {
  return {
    meta: { version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    school: {
      name: 'CB OLIVE',
      motto: 'Discipline · Travail · Réussite',
      address: 'Cameroun',
      phone: '',
      email: '',
      academicYear: '2026–2027',
      principal: 'Le Chef d’établissement',
      logo: '/images/school-logo.png',
    },
    // Les notes sont saisies par séquence ; chaque trimestre en regroupe deux.
    terms: ['Séquence 1', 'Séquence 2', 'Séquence 3', 'Séquence 4', 'Séquence 5', 'Séquence 6'],
    activeTerm: 'Séquence 1',
    trimesters: [
      { id: 'T1', name: 'Trimestre 1', sequences: ['Séquence 1', 'Séquence 2'] },
      { id: 'T2', name: 'Trimestre 2', sequences: ['Séquence 3', 'Séquence 4'] },
      { id: 'T3', name: 'Trimestre 3', sequences: ['Séquence 5', 'Séquence 6'] },
    ],
    bulletinLayout: {
      topMargin: 7,
      sideMargin: 11,
      bottomMargin: 8,
      logoSize: 25,
      titleSize: 14,
      fontSize: 8.7,
      rowPadding: 1.15,
      sectionGap: 3.2,
    },
    series: SCHOOL_SERIES,
    subjects,
    curriculum,
    classes: SCHOOL_CLASSES,
    users: [
      { id: 'user-dev', name: 'Développeur système', username: 'dev', passwordHash: hashPassword('dev123'), role: 'developer', active: true },
      { id: 'user-admin', name: 'Administration', username: 'admin', passwordHash: hashPassword('admin123'), role: 'administration', active: true },
      ...IMPORTED_TEACHER_USERS,
    ],
    teachers: IMPORTED_TEACHERS,
    assignments: IMPORTED_TEACHER_ASSIGNMENTS,
    students: IMPORTED_STUDENTS,
    grades: [],
    activities: [
      { id: 'act-student-import-2026', type: 'student', title: 'Liste des élèves importée', detail: '111 élèves · 14 classes', at: new Date().toISOString() },
    ],
  }
}
