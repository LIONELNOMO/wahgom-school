# Déployer CB OLIVE sur Hostinger

Ce guide correspond à un hébergement mutualisé Hostinger et à une installation à la racine d’un domaine ou sous-domaine. L’application ne doit pas être placée dans un simple sous-dossier : son manifeste PWA et son service worker utilisent la racine `/`.

## 1. Préparer le paquet sur Windows

Depuis PowerShell, dans le dossier du projet :

```powershell
npm.cmd run package:hostinger
Compress-Archive -Path .\release\* -DestinationPath .\wamghomschool-hostinger.zip -Force
```

Le premier script compile React, génère le seed SQL/JSON et crée le dossier `release`. La seconde commande crée l’archive à envoyer.

Le paquet contient :

- `public_html` : la PWA React, les icônes, le service worker et le point d’entrée public de l’API ;
- `backend` : le code PHP, le schéma MySQL et le seed initial, à conserver hors de `public_html` ;
- `INSTALLATION.txt` : la checklist courte.

La liste confidentielle des mots de passe enseignants et la configuration locale MySQL ne sont pas incluses dans le paquet.

## 2. Préparer le site dans hPanel

Dans **Sites Web**, ajoutez le domaine ou le sous-domaine destiné à CB OLIVE, puis ouvrez son tableau de bord.

Dans **Avancé > Configuration PHP**, sélectionnez PHP 8.3 ou une version plus récente. Activez ensuite le certificat SSL et forcez HTTPS. Le HTTPS est indispensable à l’installation PWA, au service worker et au stockage sécurisé hors ligne.

## 3. Créer la base MySQL

Dans **Bases de données > Gestion**, créez :

1. une base MySQL ;
2. un utilisateur MySQL ;
3. un mot de passe fort et unique.

Notez exactement les quatre valeurs affichées par Hostinger : hôte, nom complet de la base, nom complet de l’utilisateur et mot de passe. Les noms sont généralement préfixés par l’identifiant du compte Hostinger.

## 4. Envoyer et extraire l’archive

Dans **Fichiers > Gestionnaire de fichiers**, ouvrez le répertoire du domaine. Envoyez `wamghomschool-hostinger.zip` dans ce répertoire, puis extrayez-le.

La structure finale doit impérativement être :

```text
répertoire-du-domaine/
├── backend/
│   ├── config/
│   ├── database/
│   ├── scripts/
│   └── src/
└── public_html/
    ├── api/
    ├── assets/
    ├── icons/
    ├── images/
    ├── .htaccess
    ├── index.html
    ├── manifest.webmanifest
    └── service-worker.js
```

Le dossier `backend` doit être **à côté** de `public_html`, jamais à l’intérieur. Vérifiez que les deux fichiers `.htaccess` ont bien été extraits ; le gestionnaire de fichiers peut masquer les fichiers commençant par un point.

## 5. Créer la configuration privée

Dans `backend/config`, copiez `config.local.example.php` sous le nom exact `config.local.php`. Éditez uniquement les valeurs suivantes :

```php
return [
    'app' => [
        'env' => 'production',
        'frontend_origins' => ['https://notes.votre-domaine.com'],
    ],
    'database' => [
        'host' => 'localhost', // utilisez la valeur indiquée par Hostinger
        'port' => 3306,
        'name' => 'u123456789_wamghom',
        'user' => 'u123456789_admin',
        'password' => 'VOTRE_MOT_DE_PASSE_MYSQL',
        'charset' => 'utf8mb4',
    ],
];
```

`frontend_origins` doit contenir l’URL HTTPS exacte, sans barre oblique finale. Ne placez jamais `config.local.php` dans `public_html`, ne l’envoyez pas par message et ne le publiez pas dans un dépôt.

## 6. Initialiser la base

Choisissez une seule méthode.

### Méthode A — phpMyAdmin, recommandée sans SSH

1. Ouvrez **Bases de données > Gestion**.
2. Cliquez sur **phpMyAdmin** pour la base créée.
3. Sélectionnez la base dans la colonne de gauche.
4. Ouvrez l’onglet **Importer**.
5. Choisissez `backend/database/setup.sql` depuis votre ordinateur.
6. Conservez le jeu de caractères UTF-8 et lancez l’import.

Le fichier ne crée ni ne supprime de base de données et ne demande pas de privilège administrateur. Il installe notamment 24 classes, 27 enseignants et 111 élèves.

### Méthode B — SSH

L’accès SSH est disponible sur les offres qui le prennent en charge. Depuis le répertoire du domaine :

```bash
php backend/scripts/install.php
```

Le message attendu est `WamghomSchool installé avec succès.` (nom technique interne).

## 7. Vérifier le déploiement

Effectuez les contrôles dans cet ordre :

1. ouvrez `https://votre-domaine.com/api/health` ;
2. vérifiez la présence de `"ok": true` et d’un numéro de révision ;
3. ouvrez `https://votre-domaine.com` ;
4. connectez-vous avec `dev` / `dev123` ;
5. vérifiez les 111 élèves dans le menu **Élèves** et les 27 enseignants dans **Enseignants** ;
6. installez la PWA puis testez une réouverture sans réseau ;
7. revenez en ligne et vérifiez que l’état de synchronisation redevient **Synchronisé**.

Changez immédiatement les mots de passe `dev123`, `admin123` et les 27 mots de passe temporaires enseignants. La liste confidentielle reste uniquement dans `docs/identifiants_enseignants.confidentiel.md` sur l’ordinateur d’administration.

## 8. Configurer l’établissement après l’installation

Connectez-vous avec `admin` / `admin123`, puis ouvrez **Paramètres**.

Dans l’onglet **Établissement**, vérifiez ou corrigez :

- le nom (`CB OLIVE`) et le logo ;
- l’**année scolaire** (`2026-2027`), qui apparaît sur les bulletins et la fiche de notes ;
- la devise, l’adresse, le téléphone et le titre du signataire.

Dans l’onglet **Groupes & coefficients**, contrôlez les coefficients série par série.
L’administration peut également les ajuster depuis la page **Bulletins**, bouton **Coefficients**.

Enfin, dans **Paramètres** côté développeur, définissez la **séquence active** :
c’est elle qui est proposée par défaut aux enseignants à l’ouverture de la saisie.

Les notes se saisissent par séquence (1 à 6). Chaque trimestre est la moyenne de ses
deux séquences : Trimestre 1 = séquences 1 et 2, Trimestre 2 = 3 et 4, Trimestre 3 = 5 et 6.

## 9. Dépannage rapide

- **`/api/health` renvoie 500** : vérifiez les quatre paramètres MySQL et la présence de `backend` à côté de `public_html`.
- **`/api/health` renvoie 404** : vérifiez `public_html/api/.htaccess` et `public_html/api/index.php`.
- **La page s’ouvre mais les routes donnent 404** : vérifiez `public_html/.htaccess`.
- **Connexion refusée** : vérifiez que `setup.sql` a été importé dans la même base que celle indiquée dans `config.local.php`.
- **La PWA ne s’installe pas** : vérifiez HTTPS, `manifest.webmanifest`, les icônes et l’absence d’erreur dans le service worker.
- **Une ancienne version reste affichée** : rechargez deux fois la page ou fermez puis rouvrez la PWA afin que le nouveau service worker prenne le contrôle.

## 9. Mettre l’application à jour

Avant toute mise à jour :

1. exportez la sauvegarde JSON depuis **Paramètres** ;
2. exportez la base MySQL depuis phpMyAdmin ou les sauvegardes Hostinger ;
3. recréez le paquet avec `npm.cmd run package:hostinger` ;
4. remplacez le contenu de `public_html` et le code de `backend` sans écraser `backend/config/config.local.php` ;
5. exécutez `php backend/scripts/install.php` si vous disposez de SSH.

N’utilisez jamais `install.php --force` sur le site en production : cette option remplace volontairement l’état synchronisé par le seed initial.

## Documentation Hostinger officielle

- [Importer une base MySQL](https://www.hostinger.com/support/1864324-how-to-upload-and-set-up-your-database-at-hostinger/)
- [Téléverser les fichiers et sauvegardes](https://www.hostinger.com/support/1884234-how-to-upload-backups-at-hostinger/)
- [Choisir la version de PHP](https://www.hostinger.com/support/1575755-how-to-change-the-php-version-of-your-hostinger-hosting-plan/)
- [Activer l’accès SSH](https://www.hostinger.com/support/1583645-how-to-enable-ssh-access-in-hostinger/)
