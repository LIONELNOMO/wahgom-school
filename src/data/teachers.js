import { sectionFromAssignments } from './schoolStructure.js'

const importedTeachers = [
  ['takou-jules', 'TAKOU', 'Jules', 'jules.takou457@gmail.com', '655 69 10 04', '3e, 1ère CD, Tle CD', 'PCT (3ème) · Physique (1ère CD, Tle CD)'],
  ['soudobou-golda', 'SOUDOBOU', 'Golda', 'lienougolda03@gmail.com', '655 23 78 01', 'Tle C, A, D ; 2nde A, C', 'Français (Littérature et langue)'],
  ['makamda-grace', 'MAKAMDA', 'Grace', 'gracesorelle393@gmail.com', '673 11 58 77', '4e, 3e', 'Allemand'],
  ['mbazoa-akounou-jeannette-sandra', 'MBAZOA AKOUNOU', 'Jeannette Sandra', 'jeannetlembagoo@gmail.com', '673 58 85 71', 'Form 1 … Form 5', 'Biology'],
  ['mebune-romanus-etore', 'MEBUNE', 'Romanus Etore', 'buse77436@gmail.com', '653 39 60 11', 'F3, F4, F5', 'Citizenship'],
  ['danying-melody-labem', 'DANYING', 'Melody Labem', 'danyingmelody71@gmail.com', '679 76 50 67', 'F4, F5', 'Geography'],
  ['miang-romanus', 'MIANG', 'Romanus', 'miangromanus2@gmail.com', '682 02 52 18', 'F1, F2, F3, F4, F5', 'Economics and Geography'],
  ['neba-precious', 'NEBA', 'Precious', 'nebaprecious@icloud.com', '679 66 72 66', 'F1, …, F5', 'Religion'],
  ['tafadji-charnelle', 'TAFADJI', 'Charnelle', 'charnelletafadji@gmail.com', '673 83 93 19', '6e, 5e, 4e, 2nde A, C, 1ère A, C, D', 'HIG (4e, 2nde A, C, 1ère A, C) · ECM (6e, 5e)'],
  ['ngufor', 'NGUFOR', '', 'ngufremelda9@gmail.com', '671 71 02 21', 'F1, …, F5', 'Littérature, English'],
  ['ghomsi-sikali', 'GHOMSI', 'Sikali', 'dianelaureghomsi@gmail.com', '', '2nde C, 1ère A, Tle A, Tle C, Tle D', 'Informatique'],
  ['baenla-landry', 'BAENLA', 'Landry', 'baenla.landry@wamghomschool.local', '696 00 96 99', '1ère C, D, 3e', 'Informatique'],
  ['njikam-amidou', 'NJIKAM', 'Amidou', 'amidounjikam@yahoo.fr', '617 71 03 22', '3e, PD, TD', 'SVT-EEHB'],
  ['dommo-amel', 'DOMMO', 'Amel', 'ameldogho@yahoo.fr', '670 50 51 40', '5e, 3e, 2nde, PAD, Tle', 'Histoire-Géographie · ECM'],
  ['tiani-assi-duval', 'TIANI ASSI', 'Duval', 'duvaltianoissa@gmail.com', '690 58 85 93', '6e, 4e, 3e, 2nde A/C, Tle A, C, D', 'Histoire · Géographie · ECM'],
  ['kwomo-maeva', 'KWOMO', 'Maeva', 'maevakwomo@gmail.com', '694 66 32 46', '6e, 5e, 4e, 2nde A', 'SVT-EEHB'],
  ['mani-aime-joseph', 'MANI', 'Aimé Joseph', 'mani.aime.joseph@wamghomschool.local', '680 66 05 35 / 656 24 51 79', '2nde A, PACD, Tles ACD', 'Philosophie'],
  ['manga-rostand', 'MANGA', 'Rostand', 'mangaowono@yahoo.com', '696 06 98 55', 'Tle C-D, 3ème, 1ère D', 'Mathématiques'],
  ['mfangam-soumeya', 'MFANGAM', 'Soumeya A.', 'mfangamsoumeya@gmail.com', '655 43 30 15', '4e, 2nde C, 1ère, Tle', 'PCT (4e) · Chimie (1ère, Tle) · Physique (2nde)'],
  ['yinda-perpetue-grace', 'YINDA', 'Perpétue Grace', 'gracenguemi@gmail.com', '694 02 45 53', '2nde C, PA, TA, TC', 'SVT-EEHB'],
  ['omgba-balla', 'OMGBA', 'Balla', 'bomgba950@gmail.com', '697 38 76 81', '6e, 5e', 'Mathématiques'],
  ['meghue-linda-biorene', 'MEGHUE', 'Linda Biorene', 'biorenelinda@gmail.com', '680 76 83 45', '6e, 5e, 4e, 2nde A', 'Informatique'],
  ['nouga-cedric', 'NOUGA', 'Cédric', 'nounjacedric63@gmail.com', '694 73 10 47', '2nde C, Tle A4, PA4', 'Mathématiques'],
  ['mejame-glory', 'MEJAME', 'Glory', 'glorywide888@gmail.com', '673 31 83 67', 'Form 1 … Form 5', 'Mathematics · Computer Science'],
  ['tamogho-mayoline', 'TAMOGHO', 'Mayoline', 'mayolinetamogho@gmail.com', '681 19 27 52', 'Form 1, …, Form 5', 'Physics'],
  ['neh-norah', 'NEH', 'Norah N', 'norahneh24@gmail.com', '676 65 05 30', '—', 'History'],
  ['djouri-gervais-junior', 'DJOURI', 'Gervais Junior', 'juniordjouria@gmail.com', '659 15 74 83', '6e, 5e, 4e', 'Histoire · ECM'],
]

export const IMPORTED_TEACHERS = importedTeachers.map(([slug, lastName, firstName, email, phone, classesText, subjectsText]) => ({
  id: `teacher-${slug}`,
  userId: `user-teacher-${slug}`,
  lastName,
  firstName,
  email,
  phone,
  classesText,
  subjectsText,
  section: sectionFromAssignments(`teacher-${slug}`),
  source: 'docs/liste_enseignants.md',
}))

export const IMPORTED_TEACHER_USERS = IMPORTED_TEACHERS.map((teacher) => ({
  id: teacher.userId,
  name: [teacher.firstName, teacher.lastName].filter(Boolean).join(' '),
  username: teacher.email || teacher.id.replace('teacher-', ''),
  role: 'teacher',
  teacherId: teacher.id,
  active: true,
  emailVerified: true,
}))
