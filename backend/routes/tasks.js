const express = require('express');
const router = express.Router();
const db = require('../db');

// ─── Helper: Format a task row from DB to the frontend JSON shape ────────────
function formatTask(row) {
  const attachments = db.prepare('SELECT * FROM task_attachments WHERE task_id = ?').all(row.id);
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    priority: row.priority === 1,
    startDate: row.start_date,
    startTime: row.start_time,
    endDate: row.end_date,
    endTime: row.end_time,
    completed: row.completed === 1,
    notes: row.notes || '',
    attachments: attachments.map(a => ({
      name: a.name,
      ...(a.size ? { size: a.size } : {}),
      ...(a.url ? { url: a.url } : {}),
      ...(a.data_url ? { dataUrl: a.data_url } : {})
    }))
  };
}

// ─── GET /api/tasks — Retrieve all tasks ─────────────────────────────────────
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all();
    const tasks = rows.map(formatTask);
    res.json(tasks);
  } catch (err) {
    console.error('GET /api/tasks error:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// ─── POST /api/tasks — Create a new task ─────────────────────────────────────
router.post('/', (req, res) => {
  try {
    const { id, title, category, priority, startDate, startTime, endDate, endTime, notes, attachments } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const taskId = id || 'task-' + Date.now();

    db.prepare(`
      INSERT INTO tasks (id, title, category, priority, start_date, start_time, end_date, end_time, completed, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(taskId, title, category || 'OFFICE', priority ? 1 : 0, startDate, startTime, endDate, endTime, notes || '');

    // Insert attachments
    if (attachments && attachments.length > 0) {
      const insertAtt = db.prepare('INSERT INTO task_attachments (task_id, name, size, url, data_url) VALUES (?, ?, ?, ?, ?)');
      for (const att of attachments) {
        insertAtt.run(taskId, att.name, att.size || null, att.url || null, att.dataUrl || null);
      }
    }

    const newTask = formatTask(db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId));
    res.status(201).json(newTask);
  } catch (err) {
    console.error('POST /api/tasks error:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// ─── PATCH /api/tasks/:id — Update task (toggle completed, etc.) ─────────────
router.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { completed, title, category, priority, notes } = req.body;

    if (completed !== undefined) {
      db.prepare('UPDATE tasks SET completed = ? WHERE id = ?').run(completed ? 1 : 0, id);
    }
    if (title !== undefined) {
      db.prepare('UPDATE tasks SET title = ? WHERE id = ?').run(title, id);
    }
    if (category !== undefined) {
      db.prepare('UPDATE tasks SET category = ? WHERE id = ?').run(category, id);
    }
    if (priority !== undefined) {
      db.prepare('UPDATE tasks SET priority = ? WHERE id = ?').run(priority ? 1 : 0, id);
    }
    if (notes !== undefined) {
      db.prepare('UPDATE tasks SET notes = ? WHERE id = ?').run(notes, id);
    }

    const updated = formatTask(db.prepare('SELECT * FROM tasks WHERE id = ?').get(id));
    res.json(updated);
  } catch (err) {
    console.error('PATCH /api/tasks/:id error:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// ─── DELETE /api/tasks/:id — Delete a task ───────────────────────────────────
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    db.prepare('DELETE FROM task_attachments WHERE task_id = ?').run(id);
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);

    res.json({ message: 'Task deleted', id });
  } catch (err) {
    console.error('DELETE /api/tasks/:id error:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
