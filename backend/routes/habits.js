const express = require('express');
const router = express.Router();
const db = require('../db');

// ─── Helper: Format a habit row from DB to the frontend JSON shape ───────────
function formatHabit(row) {
  return {
    id: row.id,
    name: row.name,
    streak: row.streak,
    days: {
      MON: row.day_mon === 1,
      TUE: row.day_tue === 1,
      WED: row.day_wed === 1,
      THU: row.day_thu === 1,
      FRI: row.day_fri === 1,
      SAT: row.day_sat === 1,
      SUN: row.day_sun === 1
    }
  };
}

// ─── Helper: Recalculate streak from days ────────────────────────────────────
function recalculateStreak(days) {
  let count = 0;
  for (const val of Object.values(days)) {
    if (val) count++;
  }
  return count * 3 + 2;
}

// ─── GET /api/habits — Retrieve all habits ───────────────────────────────────
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM habits ORDER BY created_at ASC').all();
    const habits = rows.map(formatHabit);
    res.json(habits);
  } catch (err) {
    console.error('GET /api/habits error:', err);
    res.status(500).json({ error: 'Failed to fetch habits' });
  }
});

// ─── POST /api/habits — Create a new habit ───────────────────────────────────
router.post('/', (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Habit name is required' });
    }

    const id = 'habit-' + Date.now();

    db.prepare(`
      INSERT INTO habits (id, name, streak, day_mon, day_tue, day_wed, day_thu, day_fri, day_sat, day_sun)
      VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0, 0)
    `).run(id, name);

    const newHabit = formatHabit(db.prepare('SELECT * FROM habits WHERE id = ?').get(id));
    res.status(201).json(newHabit);
  } catch (err) {
    console.error('POST /api/habits error:', err);
    res.status(500).json({ error: 'Failed to create habit' });
  }
});

// ─── PUT /api/habits/:id — Update a habit (toggle days, etc.) ────────────────
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM habits WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    const { days, name } = req.body;

    if (name !== undefined) {
      db.prepare('UPDATE habits SET name = ? WHERE id = ?').run(name, id);
    }

    if (days) {
      const streak = recalculateStreak(days);
      db.prepare(`
        UPDATE habits SET
          day_mon = ?, day_tue = ?, day_wed = ?, day_thu = ?,
          day_fri = ?, day_sat = ?, day_sun = ?,
          streak = ?
        WHERE id = ?
      `).run(
        days.MON ? 1 : 0, days.TUE ? 1 : 0, days.WED ? 1 : 0, days.THU ? 1 : 0,
        days.FRI ? 1 : 0, days.SAT ? 1 : 0, days.SUN ? 1 : 0,
        streak, id
      );
    }

    const updated = formatHabit(db.prepare('SELECT * FROM habits WHERE id = ?').get(id));
    res.json(updated);
  } catch (err) {
    console.error('PUT /api/habits/:id error:', err);
    res.status(500).json({ error: 'Failed to update habit' });
  }
});

// ─── DELETE /api/habits/:id — Delete a habit ─────────────────────────────────
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM habits WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    db.prepare('DELETE FROM habits WHERE id = ?').run(id);
    res.json({ message: 'Habit deleted', id });
  } catch (err) {
    console.error('DELETE /api/habits/:id error:', err);
    res.status(500).json({ error: 'Failed to delete habit' });
  }
});

module.exports = router;
