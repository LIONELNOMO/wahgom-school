# WamghomSchool — gestion des notes hors ligne

Application React + Tailwind et API PHP/MySQL pour gérer les élèves, enseignants, affectations, notes et bulletins A4 d’un établissement de 1000 élèves maximum.

## Fonctionnement

- L’interface est une PWA responsive, installable sur ordinateur, tablette et téléphone.
- Les données sont écrites immédiatement dans IndexedDB, même sans connexion.
- Une file d’attente locale regroupe les modifications hors ligne.
- Au retour d’Internet, la synchronisation avec l’API PHP démarre automatiquement.
- En cas de modifications concurrentes, l’application demande explicitement de conserver la version du serveur ou la version locale.
- Le serveur contrôle les droits : le développeur gère toute la base, l’administration travaille sur les bulletins, et chaque enseignant ne peut synchroniser que les notes de ses affectations.
- Chaque enseignant peut renseigner le coefficient de ses propres matières depuis la grille de notes. Le serveur refuse toute modification de coefficient hors de ses affectations.

## Démarrage local avec XAMPP

Prérequis : Node.js, XAMPP installé dans `C:\xampp`, et les ports 3306, 8080 et 4173 disponibles.

Double-cliquez sur `demarrer.bat`. Le script :

1. démarre MySQL si nécessaire ;
2. crée et initialise sans écrasement la base `wamghomschool` ;
3. installe les dépendances JavaScript si nécessaire ;
4. compile la PWA ;
5. démarre l’API PHP sur `http://127.0.0.1:8080` ;
6. ouvre l’application sur `http://localhost:4173`.

Pour le développement, gardez MySQL et l’API PHP démarrés, puis utilisez `npm.cmd run dev`.

## Comptes initiaux

- Développeur : `dev` / `dev123`
- Administration : `admin` / `admin123`
- Enseignant : `prof` / `prof123`

Changez immédiatement ces mots de passe depuis la gestion des utilisateurs avant un usage réel. Une première connexion en ligne est nécessaire pour autoriser ensuite la connexion hors ligne sur l’appareil.

## Liste des enseignants

La source conservée se trouve dans [docs/liste_enseignants.md](docs/liste_enseignants.md). Pour importer ou mettre à jour cette liste dans une base déjà initialisée, exécutez :

`C:\xampp\php\php.exe backend\scripts\import-teachers.php`

L’import est répétable sans créer de doublons. Les comptes sont actifs, les e-mails sont marqués comme vérifiés et chaque enseignant reçoit le mot de passe `Wamghom@NN`, où `NN` correspond à son numéro de 01 à 27. La liste confidentielle générée dans `docs/identifiants_enseignants.confidentiel.md` ne doit jamais être publiée.

## Liste des élèves

Les 111 élèves fournis sont intégrés au seed et répartis dans 14 classes. Pour importer ou mettre à jour cette liste dans une base déjà initialisée, exécutez :

`C:\xampp\php\php.exe backend\scripts\import-students.php`

L’import est répétable et conserve les corrections effectuées ensuite dans les fiches. Les matricules vont de `WS-2026-0001` à `WS-2026-0111`. La source ne donnant pas de séparation fiable entre nom et prénom, ni de date/lieu de naissance ou de sexe, ces fiches sont signalées **Profil à compléter** dans l’application.

## PWA et synchronisation

L’interface et les icônes sont mises en cache par le service worker. Les réponses de `/api` ne sont jamais mises en cache : les données métier hors ligne sont conservées dans IndexedDB. La synchronisation est tentée à l’ouverture, au retour de la connexion, au retour sur l’onglet, après une modification et toutes les 45 secondes.

L’état de synchronisation est affiché dans l’en-tête et la barre latérale. Un clic sur cet indicateur relance la synchronisation. Une copie JSON complète peut aussi être exportée depuis les paramètres.

## Bulletin A4

Ouvrez un bulletin puis **Aperçu avant impression**. Le panneau permet d’ajuster l’en-tête, les marges, le logo, la typographie, la hauteur des lignes et les espacements. L’ajustement automatique maintient le bulletin sur une seule page A4. **Enregistrer PDF** ouvre l’impression système avec l’option d’enregistrement PDF.

## Déploiement Hostinger

Exécutez `npm.cmd run package:hostinger`, puis suivez [DEPLOIEMENT_HOSTINGER.md](DEPLOIEMENT_HOSTINGER.md). Le paquet final est créé dans `release/`.

## Commandes utiles

- `npm.cmd run dev` : serveur React de développement.
- `npm.cmd run build` : génère le seed SQL/JSON et compile la production.
- `npm.cmd run preview -- --port 4173` : prévisualise la PWA compilée.
- `npm.cmd run package:hostinger` : crée le paquet complet Hostinger.
- `C:\xampp\php\php.exe backend\scripts\install.php` : installe ou met à jour le schéma sans remplacer les données.

N’utilisez `install.php --force` que pour restaurer volontairement les données initiales.
