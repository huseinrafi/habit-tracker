const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const {
  createHabit,
  getAllHabits,
  deleteHabit,
  checkHabit,
  logHabitCompletion,
} = require('../controllers/habitController');

// All habit routes require authentication
router.use(authenticate);

// POST   /api/habits            → Create a new habit
router.post('/', createHabit);

// GET    /api/habits            → Get all habits (with logs) for the authenticated user
router.get('/', getAllHabits);

// DELETE /api/habits/:id        → Delete a habit (and its logs via cascade)
router.delete('/:id', deleteHabit);

// POST   /api/habits/:id/check → Check-in habit for today (idempotent)
router.post('/:id/check', checkHabit);

// POST   /api/habits/:id/log   → Log a habit completion (arbitrary date)
router.post('/:id/log', logHabitCompletion);

module.exports = router;
