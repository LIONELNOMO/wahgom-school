<?php

declare(strict_types=1);

// Copiez ce fichier en config.local.php et remplacez les valeurs.
// Ne publiez jamais config.local.php dans un dépôt public.
return [
    'app' => [
        'env' => 'production',
        'frontend_origins' => ['https://votre-domaine.com'],
    ],
    'database' => [
        'host' => 'localhost',
        'port' => 3306,
        'name' => 'u123456789_wamghom',
        'user' => 'u123456789_admin',
        'password' => 'REMPLACEZ_CE_MOT_DE_PASSE',
        'charset' => 'utf8mb4',
    ],
];
