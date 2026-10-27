<?php

declare(strict_types=1);

namespace Wamghom;

use InvalidArgumentException;
use PDO;

final class StateRepository
{
    public static function current(PDO $pdo, bool $forUpdate = false): array
    {
        $sql = 'SELECT revision, snapshot, updated_at FROM sync_state WHERE id = 1' . ($forUpdate ? ' FOR UPDATE' : '');
        $row = $pdo->query($sql)->fetch();
        if (!$row) {
            throw new InvalidArgumentException('La base WamghomSchool n’est pas initialisée. Exécutez le script d’installation.');
        }
        return [
            'revision' => (int) $row['revision'],
            'snapshot' => json_decode($row['snapshot'], true, 512, JSON_THROW_ON_ERROR),
            'updatedAt' => $row['updated_at'],
        ];
    }

    public static function publicSnapshot(array $snapshot): array
    {
        $snapshot['users'] = array_map(static function (array $user): array {
            unset($user['passwordHash'], $user['password_hash'], $user['legacyPasswordHash']);
            return $user;
        }, $snapshot['users'] ?? []);
        return $snapshot;
    }

    public static function push(PDO $pdo, array $actor, array $payload): array
    {
        foreach (['clientId', 'mutationId', 'baseRevision', 'snapshot'] as $field) {
            if (!array_key_exists($field, $payload)) {
                throw new InvalidArgumentException("Champ requis manquant : {$field}.");
            }
        }
        if (!is_array($payload['snapshot'])) {
            throw new InvalidArgumentException('La copie locale est invalide.');
        }

        $pdo->beginTransaction();
        try {
            $duplicate = $pdo->prepare('SELECT revision FROM processed_mutations WHERE client_id = ? AND mutation_id = ?');
            $duplicate->execute([(string) $payload['clientId'], (string) $payload['mutationId']]);
            if ($duplicate->fetch()) {
                $current = self::current($pdo, true);
                $pdo->commit();
                return ['ok' => true, 'revision' => $current['revision'], 'snapshot' => self::publicSnapshot($current['snapshot']), 'duplicate' => true];
            }

            $current = self::current($pdo, true);
            $force = (bool) ($payload['force'] ?? false);
            if ((int) $payload['baseRevision'] !== $current['revision'] && !$force) {
                $pdo->rollBack();
                return [
                    'ok' => true,
                    'conflict' => true,
                    'revision' => $current['revision'],
                    'serverSnapshot' => self::publicSnapshot($current['snapshot']),
                    'message' => 'Le serveur contient une version plus récente.',
                ];
            }

            $next = self::mergeForRole($current['snapshot'], $payload['snapshot'], $actor);
            self::validate($next);
            self::syncIdentityTables($pdo, $next, $current['snapshot']);
            $revision = $current['revision'] + 1;
            $statement = $pdo->prepare('UPDATE sync_state SET revision = ?, snapshot = ? WHERE id = 1');
            $statement->execute([$revision, json_encode($next, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)]);
            $processed = $pdo->prepare('INSERT INTO processed_mutations (client_id, mutation_id, revision) VALUES (?, ?, ?)');
            $processed->execute([(string) $payload['clientId'], (string) $payload['mutationId'], $revision]);
            $pdo->exec("DELETE FROM processed_mutations WHERE processed_at < DATE_SUB(NOW(), INTERVAL 30 DAY)");
            $pdo->commit();
            return ['ok' => true, 'revision' => $revision, 'snapshot' => self::publicSnapshot($next)];
        } catch (\Throwable $exception) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $exception;
        }
    }

    private static function mergeForRole(array $server, array $incoming, array $actor): array
    {
        if ($actor['role'] === 'developer') {
            $existingUsers = [];
            foreach ($server['users'] ?? [] as $user) $existingUsers[$user['id']] = $user;
            $incoming['users'] = array_map(static function (array $user) use ($existingUsers): array {
                if (empty($user['passwordHash']) && isset($existingUsers[$user['id']]['passwordHash'])) {
                    $user['passwordHash'] = $existingUsers[$user['id']]['passwordHash'];
                }
                return $user;
            }, $incoming['users'] ?? []);
            return $incoming;
        }

        if ($actor['role'] === 'administration') {
            if (isset($incoming['bulletinLayout'])) $server['bulletinLayout'] = $incoming['bulletinLayout'];
            // Identité de l’établissement : année scolaire, logo, intitulés.
            if (isset($incoming['school']) && is_array($incoming['school'])) {
                $server['school'] = array_replace($server['school'] ?? [], $incoming['school']);
            }
            // Période active du travail en cours (séquence ou trimestre).
            if (isset($incoming['activeTerm']) && in_array($incoming['activeTerm'], $server['terms'] ?? [], true)) {
                $server['activeTerm'] = $incoming['activeTerm'];
            }
            // L’administration ajuste les coefficients du bulletin, sans toucher
            // aux notes, aux comptes ni à la composition des classes.
            if (isset($incoming['curriculum']) && is_array($incoming['curriculum'])) {
                $incomingCurriculum = [];
                foreach ($incoming['curriculum'] as $item) {
                    if (isset($item['seriesId'], $item['subjectId'])) {
                        $incomingCurriculum[$item['seriesId'] . '|' . $item['subjectId']] = $item;
                    }
                }
                $server['curriculum'] = array_map(static function (array $item) use ($incomingCurriculum): array {
                    $key = $item['seriesId'] . '|' . $item['subjectId'];
                    if (isset($incomingCurriculum[$key]['coefficient'])) {
                        $item['coefficient'] = (float) $incomingCurriculum[$key]['coefficient'];
                    }
                    return $item;
                }, $server['curriculum'] ?? []);
            }
            return $server;
        }

        if ($actor['role'] !== 'teacher' || empty($actor['teacherId'])) {
            throw new InvalidArgumentException('Rôle non autorisé pour la synchronisation.');
        }

        $allowed = [];
        foreach ($server['assignments'] ?? [] as $assignment) {
            if ($assignment['teacherId'] === $actor['teacherId']) {
                $allowed[$assignment['classId'] . '|' . $assignment['subjectId']] = true;
            }
        }
        $classSeries = [];
        foreach ($server['classes'] ?? [] as $class) $classSeries[$class['id']] = $class['seriesId'];
        $allowedCurriculum = [];
        foreach ($server['assignments'] ?? [] as $assignment) {
            if ($assignment['teacherId'] === $actor['teacherId'] && isset($classSeries[$assignment['classId']])) {
                $allowedCurriculum[$classSeries[$assignment['classId']] . '|' . $assignment['subjectId']] = true;
            }
        }
        $incomingCurriculum = [];
        foreach ($incoming['curriculum'] ?? [] as $item) {
            $incomingCurriculum[$item['seriesId'] . '|' . $item['subjectId']] = $item;
        }
        $server['curriculum'] = array_map(static function (array $item) use ($allowedCurriculum, $incomingCurriculum): array {
            $key = $item['seriesId'] . '|' . $item['subjectId'];
            if (isset($allowedCurriculum[$key], $incomingCurriculum[$key]['coefficient'])) {
                $item['coefficient'] = (float) $incomingCurriculum[$key]['coefficient'];
            }
            return $item;
        }, $server['curriculum'] ?? []);
        $students = [];
        foreach ($server['students'] ?? [] as $student) $students[$student['id']] = $student;
        $isAllowed = static function (array $grade) use ($allowed, $students): bool {
            $student = $students[$grade['studentId']] ?? null;
            return $student && isset($allowed[$student['classId'] . '|' . $grade['subjectId']]);
        };

        $kept = array_values(array_filter($server['grades'] ?? [], static fn(array $grade): bool => !$isAllowed($grade)));
        $teacherGrades = array_values(array_map(static function (array $grade) use ($actor): array {
            $grade['updatedBy'] = $actor['id'];
            $grade['updatedAt'] = gmdate('c');
            return $grade;
        }, array_filter($incoming['grades'] ?? [], $isAllowed)));
        $server['grades'] = array_merge($kept, $teacherGrades);

        $activityIds = array_fill_keys(array_column($server['activities'] ?? [], 'id'), true);
        foreach ($incoming['activities'] ?? [] as $activity) {
            if (!isset($activityIds[$activity['id']])) $server['activities'][] = $activity;
        }
        $server['activities'] = array_slice($server['activities'] ?? [], 0, 80);
        return $server;
    }

    private static function validate(array $snapshot): void
    {
        foreach (['school', 'users', 'students', 'subjects', 'classes', 'grades', 'assignments', 'curriculum'] as $key) {
            if (!array_key_exists($key, $snapshot)) throw new InvalidArgumentException("Données incomplètes : {$key}.");
        }
        if (count($snapshot['students']) > 1000) throw new InvalidArgumentException('La capacité maximale de 1000 élèves est dépassée.');
        foreach ($snapshot['grades'] as $grade) {
            $value = (float) ($grade['value'] ?? -1);
            if ($value < 0 || $value > 20) throw new InvalidArgumentException('Une note doit être comprise entre 0 et 20.');
        }
        foreach ($snapshot['curriculum'] as $item) {
            $coefficient = (float) ($item['coefficient'] ?? 0);
            if ($coefficient <= 0 || $coefficient > 20) throw new InvalidArgumentException('Un coefficient doit être supérieur à 0 et inférieur ou égal à 20.');
        }
    }

    private static function syncIdentityTables(PDO $pdo, array $snapshot, array $previousSnapshot): void
    {
        $users = $snapshot['users'] ?? [];
        $previousUsers = $previousSnapshot['users'] ?? [];
        $previous = [];
        foreach ($previousUsers as $user) $previous[$user['id']] = $user;
        $upsert = $pdo->prepare('INSERT INTO users (id, name, username, password_hash, legacy_password_hash, role, active, email_verified) VALUES (?, ?, ?, NULL, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), username = VALUES(username), role = VALUES(role), active = VALUES(active), email_verified = VALUES(email_verified), legacy_password_hash = COALESCE(VALUES(legacy_password_hash), legacy_password_hash)');
        $replacePassword = $pdo->prepare('UPDATE users SET password_hash = NULL, legacy_password_hash = ? WHERE id = ?');
        foreach ($users as $user) {
            $legacy = $user['passwordHash'] ?? ($previous[$user['id']]['passwordHash'] ?? null);
            $upsert->execute([$user['id'], $user['name'], $user['username'], $legacy, $user['role'], !empty($user['active']) ? 1 : 0, !empty($user['emailVerified']) ? 1 : 0]);
            $previousHash = $previous[$user['id']]['passwordHash'] ?? null;
            if ($previousHash !== null && !empty($user['passwordHash']) && !hash_equals($previousHash, $user['passwordHash'])) {
                $replacePassword->execute([$user['passwordHash'], $user['id']]);
            }
        }
        $teacherUpsert = $pdo->prepare('INSERT INTO teachers (id, user_id, last_name, first_name, phone, email, classes_text, subjects_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), last_name = VALUES(last_name), first_name = VALUES(first_name), phone = VALUES(phone), email = VALUES(email), classes_text = VALUES(classes_text), subjects_text = VALUES(subjects_text)');
        foreach ($snapshot['teachers'] ?? [] as $teacher) {
            $teacherUpsert->execute([$teacher['id'], $teacher['userId'], $teacher['lastName'], $teacher['firstName'], $teacher['phone'] ?? '', $teacher['email'] ?? '', $teacher['classesText'] ?? '', $teacher['subjectsText'] ?? '']);
        }
        $teacherIds = array_column($snapshot['teachers'] ?? [], 'id');
        if ($teacherIds) {
            $placeholders = implode(',', array_fill(0, count($teacherIds), '?'));
            $deleteTeachers = $pdo->prepare("DELETE FROM teachers WHERE id NOT IN ({$placeholders})");
            $deleteTeachers->execute($teacherIds);
        } else {
            $pdo->exec('DELETE FROM teachers');
        }
        $ids = array_column($users, 'id');
        if ($ids) {
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $delete = $pdo->prepare("DELETE FROM users WHERE id NOT IN ({$placeholders})");
            $delete->execute($ids);
        }
    }
}
