import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const release = resolve(root, 'release')
const publicHtml = resolve(release, 'public_html')
const privateBackend = resolve(release, 'backend')

await rm(release, { recursive: true, force: true })
await mkdir(publicHtml, { recursive: true })
await cp(resolve(root, 'dist'), publicHtml, { recursive: true })
await mkdir(resolve(publicHtml, 'api'), { recursive: true })
await cp(resolve(root, 'backend/public'), resolve(publicHtml, 'api'), { recursive: true })
await cp(resolve(root, 'backend'), privateBackend, {
  recursive: true,
  filter: (source) => !source.endsWith('config.local.php') && !source.endsWith('teacher-credentials.local.json') && !source.includes(`${resolve(root, 'backend/public')}`),
})

const instructions = `WAMGHOMSCHOOL — PAQUET HOSTINGER

1. Dans hPanel, créez une base MySQL et un utilisateur MySQL.
2. Copiez backend/config/config.local.example.php vers backend/config/config.local.php,
   puis renseignez les identifiants MySQL et votre domaine HTTPS.
3. Placez le dossier backend à côté de public_html, jamais à l’intérieur.
4. Copiez le contenu de public_html/ dans le public_html de votre domaine.
5. Initialisez la base avec UNE des méthodes suivantes :
   - terminal SSH : php backend/scripts/install.php
   - sans SSH : importez backend/database/setup.sql avec phpMyAdmin.
6. Ouvrez https://votre-domaine.com/api/health pour vérifier l’API.
7. Connectez-vous avec dev / dev123 et vérifiez les 111 élèves et 27 enseignants.
8. Changez immédiatement les mots de passe développeur, administration et enseignants.

Le HTTPS doit être activé pour l’installation PWA et le fonctionnement hors ligne.
Le dossier backend doit rester à côté de public_html et ne doit jamais être placé dedans.
Le guide complet se trouve dans DEPLOIEMENT_HOSTINGER.md à la racine du projet source.
`
await writeFile(resolve(release, 'INSTALLATION.txt'), instructions, 'utf8')
await cp(resolve(root, 'DEPLOIEMENT_HOSTINGER.md'), resolve(release, 'DEPLOIEMENT_HOSTINGER.md'))
console.log(`Paquet Hostinger créé dans ${release}`)
