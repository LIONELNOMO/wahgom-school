<?php

declare(strict_types=1);

$root = dirname(__DIR__);
require_once $root . '/src/Database.php';

use Wamghom\Database;

const STUDENT_IMPORT_SOURCE = 'liste-eleves-etablissement-2026';
const EXPECTED_STUDENT_COUNT = 111;

function indexById(array $items): array
{
    $indexed = [];
    foreach ($items as $item) {
        if (isset($item['id'])) $indexed[$item['id']] = $item;
    }
    return $indexed;
}

function ensureStudentColumns(PDO $pdo): void
{
    $pdo->exec("ALTER TABLE students MODIFY COLUMN first_name VARCHAR(150) NOT NULL DEFAULT '', MODIFY COLUMN birth_date DATE NULL, MODIFY COLUMN birth_place VARCHAR(150) NOT NULL DEFAULT '', MODIFY COLUMN gender ENUM('F', 'M') NULL");
}

$config = require $root . '/config/config.php';
$localConfig = $root . '/config/config.local.php';
if (is_file($localConfig)) $config = array_replace_recursive($config, require $localConfig);

try {
    $seed = json_decode(file_get_contents($root . '/database/seed.json'), true, 512, JSON_THROW_ON_ERROR);
    $students = array_values(array_filter(
        $seed['students'] ?? [],
        static fn(array $student): bool => ($student['source'] ?? '') === STUDENT_IMPORT_SOURCE
    ));

    if (count($students) !== EXPECTED_STUDENT_COUNT) {
        throw new RuntimeException('La source doit contenir exactement 111 élèves avant import.');
    }

    $classIds = array_fill_keys(array_column($seed['classes'] ?? [], 'id'), true);
    foreach ($students as $student) {
        if (!isset($classIds[$student['classId'] ?? ''])) {
            throw new RuntimeException("Classe inconnue pour l'élève {$student['matricule']}.");
        }
    }

    $pdo = Database::connection($config['database']);
    ensureStudentColumns($pdo);
    $pdo->beginTransaction();

    $stateStatement = $pdo->query('SELECT revision, snapshot FROM sync_state WHERE id = 1 FOR UPDATE');
    $state = $stateStatement->fetch();
    if (!$state) throw new RuntimeException("L'application doit être installée avant l'import des élèves.");
    $snapshot = json_decode($state['snapshot'], true, 512, JSON_THROW_ON_ERROR);

    $demoStudentIds = array_fill_keys(array_map(static fn(int $index): string => "student-{$index}", range(1, 8)), true);
    $snapshotStudents = indexById(array_values(array_filter(
        $snapshot['students'] ?? [],
        static fn(array $student): bool => !isset($demoStudentIds[$student['id'] ?? ''])
    )));
    foreach ($students as $student) {
        // Les corrections effectuées plus tard dans l'application restent prioritaires lors d'une réimportation.
        $snapshotStudents[$student['id']] = array_replace($student, $snapshotStudents[$student['id']] ?? []);
    }
    $snapshot['students'] = array_values($snapshotStudents);
    $snapshot['grades'] = array_values(array_filter(
        $snapshot['grades'] ?? [],
        static fn(array $grade): bool => !isset($demoStudentIds[$grade['studentId'] ?? ''])
    ));
    $snapshot['activities'] = array_values(array_filter(
        $snapshot['activities'] ?? [],
        static fn(array $activity): bool => ($activity['id'] ?? '') !== 'act-student-import-2026'
    ));
    array_unshift($snapshot['activities'], [
        'id' => 'act-student-import-2026',
        'type' => 'student',
        'title' => 'Liste des élèves importée',
        'detail' => '111 élèves · 14 classes',
        'at' => gmdate('c'),
    ]);
    $snapshot['activities'] = array_slice($snapshot['activities'], 0, 80);
    $snapshot['meta']['updatedAt'] = gmdate('c');

    $seriesUpsert = $pdo->prepare('INSERT INTO series (id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)');
    foreach ($seed['series'] as $item) $seriesUpsert->execute([$item['id'], $item['name']]);
    $classUpsert = $pdo->prepare('INSERT INTO classes (id, name, level, series_id) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), level = VALUES(level), series_id = VALUES(series_id)');
    foreach ($seed['classes'] as $item) $classUpsert->execute([$item['id'], $item['name'], $item['level'], $item['seriesId']]);

    $pdo->exec("DELETE FROM students WHERE id IN ('student-1', 'student-2', 'student-3', 'student-4', 'student-5', 'student-6', 'student-7', 'student-8')");
    $studentUpsert = $pdo->prepare("INSERT INTO students (id, matricule, last_name, first_name, birth_date, birth_place, class_id, gender, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE matricule = VALUES(matricule), class_id = VALUES(class_id), active = VALUES(active)");
    foreach ($students as $student) {
        $createdAt = str_replace('T', ' ', substr($student['createdAt'], 0, 19));
        $studentUpsert->execute([
            $student['id'],
            $student['matricule'],
            $student['lastName'],
            $student['firstName'] ?? '',
            $student['birthDate'] ?: null,
            $student['birthPlace'] ?? '',
            $student['classId'],
            $student['gender'] ?: null,
            !empty($student['active']) ? 1 : 0,
            $createdAt,
        ]);
    }

    $revision = (int) $state['revision'] + 1;
    $update = $pdo->prepare('UPDATE sync_state SET revision = ?, snapshot = ? WHERE id = 1');
    $update->execute([$revision, json_encode($snapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)]);
    $pdo->commit();

    $counts = [];
    $classesById = indexById($seed['classes']);
    foreach ($students as $student) {
        $className = $classesById[$student['classId']]['name'] ?? $student['classId'];
        $counts[$className] = ($counts[$className] ?? 0) + 1;
    }
    echo count($students) . " élèves importés ou mis à jour. Révision {$revision}.\n";
    foreach ($counts as $className => $count) echo "- {$className}: {$count}\n";
    echo "Les dates, lieux de naissance, prénoms séparés et sexes absents de la source restent à compléter.\n";
} catch (Throwable $exception) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    fwrite(STDERR, "Import impossible : {$exception->getMessage()}\n");
    exit(1);
}

