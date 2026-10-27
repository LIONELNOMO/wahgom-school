<?php

declare(strict_types=1);

return [
    'app' => [
        'env' => getenv('WAMGHOM_ENV') ?: 'local',
        'frontend_origins' => array_values(array_filter(array_map(
            'trim',
            explode(',', getenv('WAMGHOM_FRONTEND_ORIGINS') ?: 'http://localhost:4173,http://127.0.0.1:4173,http://localhost:5173,http://127.0.0.1:5173')
        ))),
    ],
    'database' => [
        'host' => getenv('WAMGHOM_DB_HOST') ?: '127.0.0.1',
        'port' => (int) (getenv('WAMGHOM_DB_PORT') ?: 3306),
        'name' => getenv('WAMGHOM_DB_NAME') ?: 'wamghomschool',
        'user' => getenv('WAMGHOM_DB_USER') ?: 'root',
        'password' => getenv('WAMGHOM_DB_PASSWORD') ?: '',
        'charset' => 'utf8mb4',
    ],
];
