CREATE TABLE IF NOT EXISTS schools (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  motto VARCHAR(255) NOT NULL DEFAULT '',
  address VARCHAR(255) NOT NULL DEFAULT '',
  phone VARCHAR(50) NOT NULL DEFAULT '',
  email VARCHAR(180) NOT NULL DEFAULT '',
  academic_year VARCHAR(30) NOT NULL,
  principal VARCHAR(180) NOT NULL DEFAULT '',
  logo LONGTEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS series (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS subjects (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  username VARCHAR(80) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NULL,
  legacy_password_hash VARCHAR(80) NULL,
  role ENUM('developer', 'administration', 'teacher') NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  email_verified TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS classes (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  level VARCHAR(100) NOT NULL,
  series_id VARCHAR(32) NOT NULL,
  CONSTRAINT fk_classes_series FOREIGN KEY (series_id) REFERENCES series(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS teachers (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL UNIQUE,
  last_name VARCHAR(120) NOT NULL,
  first_name VARCHAR(150) NOT NULL,
  phone VARCHAR(50) NOT NULL DEFAULT '',
  email VARCHAR(180) NOT NULL DEFAULT '',
  classes_text TEXT NULL,
  subjects_text TEXT NULL,
  CONSTRAINT fk_teachers_users FOREIGN KEY (user_id) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS students (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  matricule VARCHAR(60) NOT NULL UNIQUE,
  last_name VARCHAR(120) NOT NULL,
  first_name VARCHAR(150) NOT NULL DEFAULT '',
  birth_date DATE NULL,
  birth_place VARCHAR(150) NOT NULL DEFAULT '',
  class_id VARCHAR(64) NOT NULL,
  gender ENUM('F', 'M') NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_students_classes FOREIGN KEY (class_id) REFERENCES classes(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_students_class (class_id),
  INDEX idx_students_name (last_name, first_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS curricula (
  id VARCHAR(100) NOT NULL PRIMARY KEY,
  series_id VARCHAR(32) NOT NULL,
  subject_id VARCHAR(64) NOT NULL,
  note_group TINYINT UNSIGNED NOT NULL,
  coefficient DECIMAL(5,2) NOT NULL,
  CONSTRAINT uq_curricula UNIQUE (series_id, subject_id),
  CONSTRAINT chk_curricula_group CHECK (note_group IN (1, 2)),
  CONSTRAINT chk_curricula_coefficient CHECK (coefficient > 0),
  CONSTRAINT fk_curricula_series FOREIGN KEY (series_id) REFERENCES series(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_curricula_subject FOREIGN KEY (subject_id) REFERENCES subjects(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS teacher_assignments (
  id VARCHAR(80) NOT NULL PRIMARY KEY,
  teacher_id VARCHAR(64) NOT NULL,
  class_id VARCHAR(64) NOT NULL,
  subject_id VARCHAR(64) NOT NULL,
  CONSTRAINT uq_teacher_assignment UNIQUE (teacher_id, class_id, subject_id),
  CONSTRAINT fk_assignments_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_assignments_class FOREIGN KEY (class_id) REFERENCES classes(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_assignments_subject FOREIGN KEY (subject_id) REFERENCES subjects(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  INDEX idx_assignments_class_subject (class_id, subject_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS grades (
  id VARCHAR(80) NOT NULL PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL,
  subject_id VARCHAR(64) NOT NULL,
  term VARCHAR(60) NOT NULL,
  value DECIMAL(5,2) NOT NULL,
  updated_by VARCHAR(64) NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT uq_grade UNIQUE (student_id, subject_id, term),
  CONSTRAINT chk_grade_value CHECK (value >= 0 AND value <= 20),
  CONSTRAINT fk_grades_student FOREIGN KEY (student_id) REFERENCES students(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_grades_subject FOREIGN KEY (subject_id) REFERENCES subjects(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_grades_user FOREIGN KEY (updated_by) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX idx_grades_term (term),
  INDEX idx_grades_student (student_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS activities (
  id VARCHAR(80) NOT NULL PRIMARY KEY,
  type VARCHAR(40) NOT NULL,
  title VARCHAR(255) NOT NULL,
  detail VARCHAR(255) NOT NULL DEFAULT '',
  occurred_at DATETIME NOT NULL,
  INDEX idx_activities_at (occurred_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS settings (
  setting_key VARCHAR(80) NOT NULL PRIMARY KEY,
  setting_value LONGTEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sync_state (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  revision BIGINT UNSIGNED NOT NULL DEFAULT 0,
  snapshot LONGTEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_sync_state_json CHECK (JSON_VALID(snapshot))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS processed_mutations (
  client_id VARCHAR(100) NOT NULL,
  mutation_id VARCHAR(100) NOT NULL,
  revision BIGINT UNSIGNED NOT NULL,
  processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (client_id, mutation_id),
  INDEX idx_processed_at (processed_at)
) ENGINE=InnoDB;
