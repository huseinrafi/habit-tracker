const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'habit_tracker.db');

// Ensure the data directory exists
const fs = require('fs');
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema Creation ─────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'OFFICE',
    priority INTEGER NOT NULL DEFAULT 0,
    start_date TEXT,
    start_time TEXT,
    end_date TEXT,
    end_time TEXT,
    completed INTEGER NOT NULL DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS task_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,
    name TEXT NOT NULL,
    size TEXT,
    url TEXT,
    data_url TEXT,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    streak INTEGER NOT NULL DEFAULT 0,
    day_mon INTEGER NOT NULL DEFAULT 0,
    day_tue INTEGER NOT NULL DEFAULT 0,
    day_wed INTEGER NOT NULL DEFAULT 0,
    day_thu INTEGER NOT NULL DEFAULT 0,
    day_fri INTEGER NOT NULL DEFAULT 0,
    day_sat INTEGER NOT NULL DEFAULT 0,
    day_sun INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// ─── Seed Default Data (only if tables are empty) ─────────────────────────────
const taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks').get();
if (taskCount.count === 0) {
  const insertTask = db.prepare(`
    INSERT INTO tasks (id, title, category, priority, start_date, start_time, end_date, end_time, completed, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAttachment = db.prepare(`
    INSERT INTO task_attachments (task_id, name, size, url) VALUES (?, ?, ?, ?)
  `);

  const seedTasks = db.transaction(() => {
    // Task 1
    insertTask.run('task-1', 'Project Q4 Strategy Document', 'OFFICE', 1, '2023-10-24', '10:00', '2023-10-24', '12:00', 0,
      'Coordinate with the infrastructure team to finalize the deployment roadmap for the upcoming fiscal quarter. Ensure all security compliance checks are cleared.');
    insertAttachment.run('task-1', 'Syllabus_v2.pdf', '1.2 MB', null);
    insertAttachment.run('task-1', 'Google Docs Link', null, 'https://docs.google.com');

    // Task 2
    insertTask.run('task-2', 'Advanced Algorithms Assignment', 'CAMPUS', 0, '2023-10-27', '14:00', '2023-10-27', '16:30', 0,
      'Implement the Floyd-Warshall and Bellman-Ford algorithm visualizer. Prepare the performance analysis chart.');
    insertAttachment.run('task-2', 'Resources_Zip_v1.zip', '45.8 MB', null);

    // Task 3
    insertTask.run('task-3', 'Weekly Sync Notes', 'OFFICE', 0, '2023-10-23', '09:00', '2023-10-23', '10:00', 1,
      'Summarized team items for sprint 4. Archiving notes to server.');
  });

  seedTasks();
  console.log('✅ Seeded default tasks into database.');
}

const habitCount = db.prepare('SELECT COUNT(*) as count FROM habits').get();
if (habitCount.count === 0) {
  const insertHabit = db.prepare(`
    INSERT INTO habits (id, name, streak, day_mon, day_tue, day_wed, day_thu, day_fri, day_sat, day_sun)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seedHabits = db.transaction(() => {
    insertHabit.run('habit-1', 'Coding Routine', 24, 1, 1, 1, 0, 1, 1, 0);
    insertHabit.run('habit-2', 'Exercise & Cardio', 12, 1, 0, 1, 0, 1, 0, 0);
    insertHabit.run('habit-3', 'Technical Reading', 8, 1, 1, 0, 0, 0, 1, 0);
  });

  seedHabits();
  console.log('✅ Seeded default habits into database.');
}

module.exports = db;
