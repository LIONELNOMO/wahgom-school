import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createInitialDatabase } from '../../src/data/seed.js'
import { hashPassword } from '../../src/lib/store.js'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const databaseDirectory = resolve(scriptDirectory, '../database')
const output = resolve(databaseDirectory, 'seed.json')
const seed = createInitialDatabase()
await mkdir(databaseDirectory, { recursive: true })
const credentialsPath = resolve(databaseDirectory, 'teacher-credentials.local.json')
const confidentialMarkdownPath = resolve(scriptDirectory, '../../docs/identifiants_enseignants.confidentiel.md')
const importedTeachers = seed.teachers.filter((teacher) => teacher.source === 'docs/liste_enseignants.md')
const credentials = {}
for (const [index, teacher] of importedTeachers.entries()) {
  const user = seed.users.find((item) => item.id === teacher.userId)
  credentials[teacher.id] = { username: user.username, password: `Wamghom@${String(index + 1).padStart(2, '0')}` }
  user.active = true
  user.emailVerified = true
  user.passwordHash = hashPassword(credentials[teacher.id].password)
}
await writeFile(credentialsPath, `${JSON.stringify(credentials, null, 2)}\n`, 'utf8')
const sectionLabels = { francophone: 'Francophone', anglophone: 'Anglophone', bilingue: 'Bilingue' }
const credentialRows = importedTeachers.map((teacher, index) => {
  const account = credentials[teacher.id]
  const assignments = seed.assignments.filter((item) => item.teacherId === teacher.id)
  const classes = [...new Set(assignments.map((item) => seed.classes.find((entry) => entry.id === item.classId)?.name).filter(Boolean))]
  const subjects = [...new Set(assignments.map((item) => seed.subjects.find((entry) => entry.id === item.subjectId)?.name).filter(Boolean))]
  const name = `${teacher.lastName} ${teacher.firstName}`.trimEnd()
  const section = sectionLabels[teacher.section] || '—'
  return `| ${String(index + 1).padStart(2, '0')} | ${name} | ${section} | ${account.username} | \`${account.password}\` | ${subjects.join(', ') || '—'} | ${classes.join(', ') || '—'} |`
})
const bySection = importedTeachers.reduce((totals, teacher) => {
  const key = sectionLabels[teacher.section] || 'Non renseignée'
  return { ...totals, [key]: (totals[key] || 0) + 1 }
}, {})
const sectionSummary = Object.entries(bySection).map(([label, count]) => `${label} : ${count}`).join(' · ')
const generatedOn = new Intl.DateTimeFormat('fr-CM', { dateStyle: 'long' }).format(new Date())
await writeFile(confidentialMarkdownPath, `# Identifiants des enseignants — ${seed.school.name}

> **Fichier confidentiel.** Ne pas publier, ne pas placer dans le dossier public du site
> et ne pas transmettre en entier : chaque enseignant ne reçoit que sa propre ligne.

Année scolaire ${seed.school.academicYear} · ${importedTeachers.length} enseignants · ${sectionSummary}
Document généré le ${generatedOn}.

## Connexion

L'identifiant est l'adresse e-mail. Le mot de passe ci-dessous est **temporaire** :
chaque enseignant doit le remplacer dès sa première connexion.

Une première connexion avec Internet est nécessaire sur chaque appareil ;
les connexions suivantes fonctionnent ensuite hors ligne.

| N° | Enseignant | Section | Identifiant | Mot de passe temporaire | Matières | Classes |
| --- | --- | --- | --- | --- | --- | --- |
${credentialRows.join('\n')}

## Comptes d'administration

| Rôle | Identifiant | Mot de passe |
| --- | --- | --- |
| Développeur | \`dev\` | \`dev123\` |
| Administration | \`admin\` | \`admin123\` |

Ces deux mots de passe par défaut doivent être changés avant la mise en service.
`, 'utf8')
await writeFile(output, `${JSON.stringify(seed, null, 2)}\n`, 'utf8')

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`
const schema = await readFile(resolve(databaseDirectory, 'schema.sql'), 'utf8')
const usersSql = seed.users.map((user) => `(${[
  user.id, user.name, user.username, null, user.passwordHash || null, user.role,
].map((value) => value === null ? 'NULL' : quote(value)).join(', ')}, ${user.active ? 1 : 0}, ${user.emailVerified ? 1 : 0})`).join(',\n')
const teachersSql = seed.teachers.map((teacher) => `(${[
  teacher.id, teacher.userId, teacher.lastName, teacher.firstName, teacher.phone || '', teacher.email || '',
  teacher.classesText || '', teacher.subjectsText || '',
].map(quote).join(', ')})`).join(',\n')
const seriesSql = seed.series.map((item) => `(${quote(item.id)}, ${quote(item.name)})`).join(',\n')
const subjectsSql = seed.subjects.map((item) => `(${quote(item.id)}, ${quote(item.name)}, ${item.active ? 1 : 0})`).join(',\n')
const classesSql = seed.classes.map((item) => `(${quote(item.id)}, ${quote(item.name)}, ${quote(item.level)}, ${quote(item.seriesId)})`).join(',\n')
const studentsSql = seed.students.map((student) => `(${[
  student.id, student.matricule, student.lastName, student.firstName || '', student.birthDate || null,
  student.birthPlace || '', student.classId, student.gender || null, student.active ? 1 : 0,
  student.createdAt.slice(0, 19).replace('T', ' '),
].map((value) => value === null ? 'NULL' : quote(value)).join(', ')})`).join(',\n')
const curriculaSql = seed.curriculum.map((item) => `(${quote(item.id)}, ${quote(item.seriesId)}, ${quote(item.subjectId)}, ${Number(item.group)}, ${Number(item.coefficient)})`).join(',\n')
const assignmentsSql = seed.assignments.map((item) => `(${quote(item.id)}, ${quote(item.teacherId)}, ${quote(item.classId)}, ${quote(item.subjectId)})`).join(',\n')
const setupSql = `${schema.trim()}

-- Import initial non destructif : une réimportation ne remplace pas les données existantes.
INSERT IGNORE INTO sync_state (id, revision, snapshot) VALUES
(1, 1, ${quote(JSON.stringify(seed))});

INSERT IGNORE INTO users (id, name, username, password_hash, legacy_password_hash, role, active, email_verified) VALUES
${usersSql};

INSERT IGNORE INTO teachers (id, user_id, last_name, first_name, phone, email, classes_text, subjects_text) VALUES
${teachersSql};

INSERT IGNORE INTO series (id, name) VALUES
${seriesSql};

INSERT IGNORE INTO subjects (id, name, active) VALUES
${subjectsSql};

INSERT IGNORE INTO classes (id, name, level, series_id) VALUES
${classesSql};

INSERT IGNORE INTO students (id, matricule, last_name, first_name, birth_date, birth_place, class_id, gender, active, created_at) VALUES
${studentsSql};

INSERT IGNORE INTO curricula (id, series_id, subject_id, note_group, coefficient) VALUES
${curriculaSql};

INSERT IGNORE INTO teacher_assignments (id, teacher_id, class_id, subject_id) VALUES
${assignmentsSql};
`
await writeFile(resolve(databaseDirectory, 'setup.sql'), setupSql, 'utf8')
console.log(`Seed et installation SQL générés : ${databaseDirectory}`)
console.log(`Identifiants confidentiels conservés dans : ${confidentialMarkdownPath}`)
