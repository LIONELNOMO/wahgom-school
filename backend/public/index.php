<?php

declare(strict_types=1);

$candidates = array_filter([
    getenv('WAMGHOM_BACKEND_PATH') ?: null,
    realpath(__DIR__ . '/..'),
    realpath(__DIR__ . '/../../backend'),
]);
$backendRoot = null;
foreach ($candidates as $candidate) {
    if (is_file($candidate . '/config/config.php') && is_dir($candidate . '/src')) {
        $backendRoot = $candidate;
        break;
    }
}
if (!$backendRoot) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'message' => 'Backend WamghomSchool introuvable.']);
    exit;
}

require_once $backendRoot . '/src/Database.php';
require_once $backendRoot . '/src/Http.php';
require_once $backendRoot . '/src/Auth.php';
require_once $backendRoot . '/src/StateRepository.php';

use Wamghom\Auth;
use Wamghom\Database;
use Wamghom\Http;
use Wamghom\StateRepository;

$config = require $backendRoot . '/config/config.php';
$localConfig = $backendRoot . '/config/config.local.php';
if (is_file($localConfig)) {
    $config = array_replace_recursive($config, require $localConfig);
}

Http::configureCors($config['app']['frontend_origins']);
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

try {
    $pdo = Database::connection($config['database']);
    Auth::startSession();
    $route = trim($_GET['route'] ?? preg_replace('#^/api/?#', '', parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH)), '/');

    if ($route === 'health' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        $state = StateRepository::current($pdo);
        Http::json(['ok' => true, 'service' => 'WamghomSchool API', 'revision' => $state['revision'], 'serverTime' => gmdate('c')]);
    }
    if ($route === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $body = Http::body();
        $user = Auth::login($pdo, trim((string) ($body['username'] ?? '')), (string) ($body['password'] ?? ''));
        if (!$user) Http::json(['ok' => false, 'message' => 'Identifiant ou mot de passe incorrect.'], 401);
        $state = StateRepository::current($pdo);
        Http::json(['ok' => true, 'user' => $user, 'revision' => $state['revision'], 'snapshot' => StateRepository::publicSnapshot($state['snapshot'])]);
    }
    if ($route === 'logout' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        Auth::logout();
        Http::json(['ok' => true]);
    }
    if ($route === 'session' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        $user = Auth::user($pdo);
        Http::json(['ok' => true, 'authenticated' => (bool) $user, 'user' => $user]);
    }
    if ($route === 'sync' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        Auth::requireUser($pdo);
        $state = StateRepository::current($pdo);
        Http::json(['ok' => true, 'revision' => $state['revision'], 'snapshot' => StateRepository::publicSnapshot($state['snapshot'])]);
    }
    if ($route === 'sync' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $user = Auth::requireUser($pdo);
        Http::json(StateRepository::push($pdo, $user, Http::body()));
    }
    Http::json(['ok' => false, 'message' => 'Route API introuvable.'], 404);
} catch (InvalidArgumentException $exception) {
    Http::json(['ok' => false, 'message' => $exception->getMessage()], 422);
} catch (Throwable $exception) {
    error_log($exception->__toString());
    $message = ($config['app']['env'] ?? 'production') === 'local' ? $exception->getMessage() : 'Erreur interne du serveur.';
    Http::json(['ok' => false, 'message' => $message], 500);
}
