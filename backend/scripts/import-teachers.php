<?php

declare(strict_types=1);

$root = dirname(__DIR__);
require_once $root . '/src/Database.php';

use Wamghom\Database;

function ensureTeacherImportColumns(PDO $pdo): void
{
    $pdo->exec("ALTER TABLE teachers ADD COLUMN IF NOT EXISTS email VARCHAR(180) NOT NULL DEFAULT '' AFTER phone");
    $pdo->exec('ALTER TABLE teachers ADD COLUMN IF NOT EXISTS classes_text TEXT NULL AFTER email');
    $pdo->exec('ALTER TABLE teachers ADD COLUMN IF NOT EXISTS subjects_text TEXT NULL AFTER classes_text');
    $pdo->exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER active');
}

function indexById(array $items): array
{
    $indexed = [];
    foreach ($items as $item) {
        if (!empty($item['id'])) $indexed[$item['id']] = $item;
    }
    return $indexed;
}

$config = require $root . '/config/config.php';
$localConfig = $root . '/config/config.local.php';
if (is_file($localConfig)) $config = array_replace_recursive($config, require $localConfig);

try {
    $pdo = Database::connection($config['database']);
    ensureTeacherImportColumns($pdo);
    $seed = json_decode(file_get_contents($root . '/database/seed.json'), true, 512, JSON_THROW_ON_ERROR);
    $teachers = array_values(array_filter($seed['teachers'] ?? [], static fn(array $teacher): bool => ($teacher['source'] ?? '') === 'docs/liste_enseignants.md'));
    $teacherIds = array_fill_keys(array_column($teachers, 'id'), true);
    $users = array_values(array_filter($seed['users'] ?? [], static fn(array $user): bool => isset($teacherIds[$user['teacherId'] ?? ''])));

    if (count($teachers) !== 27) {
        throw new RuntimeException('La source doit contenir exactement 27 enseignants avant import.');
    }

    $pdo->beginTransaction();
    $state = $pdo->query('SELECT revision, snapshot FROM sync_state WHERE id = 1 FOR UPDATE')->fetch();
    if (!$state) throw new RuntimeException('Initialisez la base avant de lancer cet import.');

    $snapshot = json_decode($state['snapshot'], true, 512, JSON_THROW_ON_ERROR);
    $snapshotTeachers = indexById($snapshot['teachers'] ?? []);
    unset($snapshotTeachers['teacher-1']);
    foreach ($teachers as $teacher) {
        $snapshotTeachers[$teacher['id']] = array_replace($snapshotTeachers[$teacher['id']] ?? [], $teacher);
    }
    $snapshot['teachers'] = array_values($snapshotTeachers);

    $snapshotUsers = indexById($snapshot['users'] ?? []);
    unset($snapshotUsers['user-prof']);
    foreach ($users as $user) {
        $existing = $snapshotUsers[$user['id']] ?? [];
        $merged = array_replace($user, $existing);
        $merged['name'] = $user['name'];
        $merged['username'] = $user['username'];
        $merged['role'] = 'teacher';
        $merged['teacherId'] = $user['teacherId'];
        $merged['active'] = true;
        $merged['emailVerified'] = true;
        if (empty($merged['passwordHash']) && !empty($user['passwordHash'])) $merged['passwordHash'] = $user['passwordHash'];
        $snapshotUsers[$user['id']] = $merged;
    }
    $snapshot['users'] = array_values($snapshotUsers);

    foreach (['series', 'subjects', 'classes', 'curriculum'] as $collection) {
        $indexed = indexById($snapshot[$collection] ?? []);
        foreach ($seed[$collection] ?? [] as $item) $indexed[$item['id']] = array_replace($indexed[$item['id']] ?? [], $item);
        $snapshot[$collection] = array_values($indexed);
    }
    $snapshot['assignments'] = array_values(array_filter(
        $snapshot['assignments'] ?? [],
        static fn(array $assignment): bool => ($assignment['teacherId'] ?? '') !== 'teacher-1' && !isset($teacherIds[$assignment['teacherId'] ?? ''])
    ));
    foreach ($seed['assignments'] ?? [] as $assignment) {
        if (isset($teacherIds[$assignment['teacherId'] ?? ''])) $snapshot['assignments'][] = $assignment;
    }
    foreach ($snapshot['grades'] ?? [] as &$grade) {
        if (($grade['updatedBy'] ?? '') === 'user-prof') $grade['updatedBy'] = 'user-dev';
    }
    unset($grade);
    $snapshot['meta']['updatedAt'] = gmdate('c');

    $userUpsert = $pdo->prepare('INSERT INTO users (id, name, username, password_hash, legacy_password_hash, role, active, email_verified) VALUES (?, ?, ?, NULL, ?, ?, 1, 1) ON DUPLICATE KEY UPDATE name = VALUES(name), username = VALUES(username), role = VALUES(role), active = 1, email_verified = 1, password_hash = NULL, legacy_password_hash = VALUES(legacy_password_hash)');
    foreach ($users as $user) {
        $stored = $snapshotUsers[$user['id']];
        $userUpsert->execute([$stored['id'], $stored['name'], $stored['username'], $user['passwordHash'] ?? null, 'teacher']);
    }

    $teacherUpsert = $pdo->prepare('INSERT INTO teachers (id, user_id, last_name, first_name, phone, email, classes_text, subjects_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), last_name = VALUES(last_name), first_name = VALUES(first_name), phone = VALUES(phone), email = VALUES(email), classes_text = VALUES(classes_text), subjects_text = VALUES(subjects_text)');
    foreach ($teachers as $teacher) {
        $teacherUpsert->execute([$teacher['id'], $teacher['userId'], $teacher['lastName'], $teacher['firstName'], $teacher['phone'] ?? '', $teacher['email'] ?? '', $teacher['classesText'] ?? '', $teacher['subjectsText'] ?? '']);
    }
    $pdo->exec("DELETE FROM teachers WHERE id = 'teacher-1'");
    $pdo->exec("DELETE FROM users WHERE id = 'user-prof'");

    $seriesUpsert = $pdo->prepare('INSERT INTO series (id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)');
    foreach ($seed['series'] as $item) $seriesUpsert->execute([$item['id'], $item['name']]);
    $subjectUpsert = $pdo->prepare('INSERT INTO subjects (id, name, active) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), active = VALUES(active)');
    foreach ($seed['subjects'] as $item) $subjectUpsert->execute([$item['id'], $item['name'], !empty($item['active']) ? 1 : 0]);
    $classUpsert = $pdo->prepare('INSERT INTO classes (id, name, level, series_id) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), level = VALUES(level), series_id = VALUES(series_id)');
    foreach ($seed['classes'] as $item) $classUpsert->execute([$item['id'], $item['name'], $item['level'], $item['seriesId']]);
    $curriculumUpsert = $pdo->prepare('INSERT INTO curricula (id, series_id, subject_id, note_group, coefficient) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE series_id = VALUES(series_id), subject_id = VALUES(subject_id), note_group = VALUES(note_group), coefficient = VALUES(coefficient)');
    foreach ($seed['curriculum'] as $item) $curriculumUpsert->execute([$item['id'], $item['seriesId'], $item['subjectId'], $item['group'], $item['coefficient']]);
    $teacherIdList = array_keys($teacherIds);
    $placeholders = implode(',', array_fill(0, count($teacherIdList), '?'));
    $deleteAssignments = $pdo->prepare("DELETE FROM teacher_assignments WHERE teacher_id IN ({$placeholders})");
    $deleteAssignments->execute($teacherIdList);
    $assignmentUpsert = $pdo->prepare('INSERT INTO teacher_assignments (id, teacher_id, class_id, subject_id) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE teacher_id = VALUES(teacher_id), class_id = VALUES(class_id), subject_id = VALUES(subject_id)');
    $assignmentCount = 0;
    foreach ($seed['assignments'] as $item) {
        if (!isset($teacherIds[$item['teacherId'] ?? ''])) continue;
        $assignmentUpsert->execute([$item['id'], $item['teacherId'], $item['classId'], $item['subjectId']]);
        $assignmentCount++;
    }

    $revision = (int) $state['revision'] + 1;
    $update = $pdo->prepare('UPDATE sync_state SET revision = ?, snapshot = ? WHERE id = 1');
    $update->execute([$revision, json_encode($snapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)]);
    $pdo->commit();
    echo count($teachers) . " enseignants importés ou mis à jour. Révision {$revision}.\n";
    echo count($seed['classes']) . " classes et {$assignmentCount} affectations enregistrées.\n";
    echo "Les comptes enseignants sont actifs, leurs e-mails sont vérifiés et utilisent un mot de passe Wamghom numéroté.\n";
} catch (Throwable $exception) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    fwrite(STDERR, "Import impossible : {$exception->getMessage()}\n");
    exit(1);
}
