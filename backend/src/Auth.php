<?php

declare(strict_types=1);

namespace Wamghom;

use PDO;

final class Auth
{
    public static function startSession(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }
        session_name('wamghom_session');
        $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'secure' => $secure,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();
    }

    public static function login(PDO $pdo, string $username, string $password): ?array
    {
        $statement = $pdo->prepare('SELECT u.*, t.id AS teacher_id FROM users u LEFT JOIN teachers t ON t.user_id = u.id WHERE LOWER(u.username) = LOWER(?) LIMIT 1');
        $statement->execute([$username]);
        $user = $statement->fetch();
        if (!$user || !(bool) $user['active']) {
            return null;
        }

        $valid = $user['password_hash'] && password_verify($password, $user['password_hash']);
        if (!$valid && $user['legacy_password_hash']) {
            $valid = hash_equals($user['legacy_password_hash'], self::legacyHash($password));
            if ($valid) {
                $upgrade = $pdo->prepare('UPDATE users SET password_hash = ?, legacy_password_hash = NULL WHERE id = ?');
                $upgrade->execute([password_hash($password, PASSWORD_DEFAULT), $user['id']]);
            }
        }
        if (!$valid) {
            return null;
        }

        session_regenerate_id(true);
        $_SESSION['user_id'] = $user['id'];
        return self::publicUser($user);
    }

    public static function user(PDO $pdo): ?array
    {
        $id = $_SESSION['user_id'] ?? null;
        if (!$id) {
            return null;
        }
        $statement = $pdo->prepare('SELECT u.*, t.id AS teacher_id FROM users u LEFT JOIN teachers t ON t.user_id = u.id WHERE u.id = ? AND u.active = 1 LIMIT 1');
        $statement->execute([$id]);
        $user = $statement->fetch();
        return $user ? self::publicUser($user) : null;
    }

    public static function requireUser(PDO $pdo): array
    {
        $user = self::user($pdo);
        if (!$user) {
            Http::json(['ok' => false, 'message' => 'Authentification requise.'], 401);
        }
        return $user;
    }

    public static function logout(): void
    {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'] ?? '', (bool) $params['secure'], (bool) $params['httponly']);
        }
        session_destroy();
    }

    private static function publicUser(array $user): array
    {
        return [
            'id' => $user['id'],
            'name' => $user['name'],
            'username' => $user['username'],
            'role' => $user['role'],
            'teacherId' => $user['teacher_id'] ?? null,
            'active' => (bool) $user['active'],
            'emailVerified' => (bool) ($user['email_verified'] ?? false),
        ];
    }

    private static function legacyHash(string $value): string
    {
        $hash = 2166136261;
        $length = strlen($value);
        for ($index = 0; $index < $length; $index++) {
            $hash ^= ord($value[$index]);
            $hash = ($hash * 16777619) & 0xffffffff;
        }
        return 'local-' . dechex($hash);
    }
}
