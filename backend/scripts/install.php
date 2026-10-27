<?php

declare(strict_types=1);

$root = dirname(__DIR__);
require_once $root . '/src/Database.php';

use Wamghom\Database;

function ensureImportColumns(PDO $pdo): void
{
    // MariaDB 10.4/XAMPP peut planter lors de la lecture de information_schema.COLUMNS.
    // La forme IF NOT EXISTS rend ces migrations sûres et répétables sans introspection.
    $pdo->exec("ALTER TABLE teachers ADD COLUMN IF NOT EXISTS email VARCHAR(180) NOT NULL DEFAULT '' AFTER phone");
    $pdo->exec('ALTER TABLE teachers ADD COLUMN IF NOT EXISTS classes_text TEXT NULL AFTER email');
    $pdo->exec('ALTER TABLE teachers ADD COLUMN IF NOT EXISTS subjects_text TEXT NULL AFTER classes_text');
    $pdo->exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER active');
    $pdo->exec("ALTER TABLE students MODIFY COLUMN first_name VARCHAR(150) NOT NULL DEFAULT '', MODIFY COLUMN birth_date DATE NULL, MODIFY COLUMN birth_place VARCHAR(150) NOT NULL DEFAULT '', MODIFY COLUMN gender ENUM('F', 'M') NULL");
}

$config = require $root . '/config/config.php';
$localConfig = $root . '/config/config.local.php';
if (is_file($localConfig)) $config = array_replace_recursive($config, require $localConfig);

try {
    $pdo = Database::connection($config['database']);
    $schema = file_get_contents($root . '/database/schema.sql');
    $pdo->exec($schema);
    ensureImportColumns($pdo);
    $alreadyInstalled = (bool) $pdo->query('SELECT COUNT(*) FROM sync_state WHERE id = 1')->fetchColumn();
    if ($alreadyInstalled && !in_array('--force', $argv ?? [], true)) {
        echo "WamghomSchool est déjà initialisé. Aucune donnée n’a été remplacée.\n";
        echo "Utilisez --force uniquement pour rétablir volontairement les données initiales.\n";
        exit(0);
    }
    $seed = json_decode(file_get_contents($root . '/database/seed.json'), true, 512, JSON_THROW_ON_ERROR);
    $pdo->beginTransaction();
    $state = $pdo->prepare('INSERT INTO sync_state (id, revision, snapshot) VALUES (1, 1, ?) ON DUPLICATE KEY UPDATE snapshot = VALUES(snapshot), revision = revision + 1');
    $state->execute([json_encode($seed, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)]);
    $userStatement = $pdo->prepare('INSERT INTO users (id, name, username, password_hash, legacy_password_hash, role, active, email_verified) VALUES (?, ?, ?, NULL, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), username = VALUES(username), password_hash = NULL, legacy_password_hash = VALUES(legacy_password_hash), role = VALUES(role), active = VALUES(active), email_verified = VALUES(email_verified)');
    foreach ($seed['users'] as $user) {
        $userStatement->execute([$user['id'], $user['name'], $user['username'], $user['passwordHash'] ?? null, $user['role'], !empty($user['active']) ? 1 : 0, !empty($user['emailVerified']) ? 1 : 0]);
    }
    $teacherStatement = $pdo->prepare('INSERT INTO teachers (id, user_id, last_name, first_name, phone, email, classes_text, subjects_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), last_name = VALUES(last_name), first_name = VALUES(first_name), phone = VALUES(phone), email = VALUES(email), classes_text = VALUES(classes_text), subjects_text = VALUES(subjects_text)');
    foreach ($seed['teachers'] as $teacher) {
        $teacherStatement->execute([$teacher['id'], $teacher['userId'], $teacher['lastName'], $teacher['firstName'], $teacher['phone'] ?? '', $teacher['email'] ?? '', $teacher['classesText'] ?? '', $teacher['subjectsText'] ?? '']);
    }
    $seriesStatement = $pdo->prepare('INSERT INTO series (id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)');
    foreach ($seed['series'] as $item) $seriesStatement->execute([$item['id'], $item['name']]);
    $subjectStatement = $pdo->prepare('INSERT INTO subjects (id, name, active) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), active = VALUES(active)');
    foreach ($seed['subjects'] as $item) $subjectStatement->execute([$item['id'], $item['name'], !empty($item['active']) ? 1 : 0]);
    $classStatement = $pdo->prepare('INSERT INTO classes (id, name, level, series_id) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), level = VALUES(level), series_id = VALUES(series_id)');
    foreach ($seed['classes'] as $item) $classStatement->execute([$item['id'], $item['name'], $item['level'], $item['seriesId']]);
    $studentStatement = $pdo->prepare("INSERT INTO students (id, matricule, last_name, first_name, birth_date, birth_place, class_id, gender, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE matricule = VALUES(matricule), last_name = VALUES(last_name), first_name = VALUES(first_name), birth_date = VALUES(birth_date), birth_place = VALUES(birth_place), class_id = VALUES(class_id), gender = VALUES(gender), active = VALUES(active)");
    foreach ($seed['students'] as $student) {
        $createdAt = str_replace('T', ' ', substr($student['createdAt'], 0, 19));
        $studentStatement->execute([$student['id'], $student['matricule'], $student['lastName'], $student['firstName'] ?? '', $student['birthDate'] ?: null, $student['birthPlace'] ?? '', $student['classId'], $student['gender'] ?: null, !empty($student['active']) ? 1 : 0, $createdAt]);
    }
    $curriculumStatement = $pdo->prepare('INSERT INTO curricula (id, series_id, subject_id, note_group, coefficient) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE series_id = VALUES(series_id), subject_id = VALUES(subject_id), note_group = VALUES(note_group), coefficient = VALUES(coefficient)');
    foreach ($seed['curriculum'] as $item) $curriculumStatement->execute([$item['id'], $item['seriesId'], $item['subjectId'], $item['group'], $item['coefficient']]);
    $assignmentStatement = $pdo->prepare('INSERT INTO teacher_assignments (id, teacher_id, class_id, subject_id) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE teacher_id = VALUES(teacher_id), class_id = VALUES(class_id), subject_id = VALUES(subject_id)');
    foreach ($seed['assignments'] as $item) $assignmentStatement->execute([$item['id'], $item['teacherId'], $item['classId'], $item['subjectId']]);
    $pdo->commit();
    echo "WamghomSchool installé avec succès.\n";
} catch (Throwable $exception) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    fwrite(STDERR, "Installation impossible : {$exception->getMessage()}\n");
    exit(1);
}
