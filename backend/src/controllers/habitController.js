const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ─── Create Habit ────────────────────────────────────────────────────────────
const createHabit = async (req, res) => {
  try {
    const { title, type, repeatableType } = req.body;
    const userId = req.user.userId;

    // Validation
    if (!title || !type) {
      return res.status(400).json({
        status: 'error',
        message: 'Field title dan type wajib diisi.',
      });
    }

    const validRepeatableTypes = ['daily', 'weekly', 'monthly'];
    const finalRepeatableType = repeatableType || 'daily';

    if (!validRepeatableTypes.includes(finalRepeatableType)) {
      return res.status(400).json({
        status: 'error',
        message: `repeatableType harus salah satu dari: ${validRepeatableTypes.join(', ')}`,
      });
    }

    const habit = await prisma.habit.create({
      data: {
        userId,
        title,
        type,
        repeatableType: finalRepeatableType,
      },
    });

    return res.status(201).json({ status: 'success', data: habit });
  } catch (error) {
    console.error('createHabit error:', error);
    return res.status(500).json({ status: 'error', message: 'Gagal membuat habit.' });
  }
};

// ─── Get All Habits ──────────────────────────────────────────────────────────
const getAllHabits = async (req, res) => {
  try {
    const userId = req.user.userId;

    const habits = await prisma.habit.findMany({
      where: { userId },
      include: {
        logs: {
          orderBy: { dateCompleted: 'desc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return res.json({ status: 'success', data: habits });
  } catch (error) {
    console.error('getAllHabits error:', error);
    return res.status(500).json({ status: 'error', message: 'Gagal mengambil habits.' });
  }
};

// ─── Delete Habit ────────────────────────────────────────────────────────────
const deleteHabit = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verify ownership
    const existing = await prisma.habit.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Habit tidak ditemukan.',
      });
    }

    // Cascade delete will also remove related HabitLogs (defined in schema)
    await prisma.habit.delete({ where: { id } });

    return res.json({ status: 'success', message: 'Habit berhasil dihapus.' });
  } catch (error) {
    console.error('deleteHabit error:', error);
    return res.status(500).json({ status: 'error', message: 'Gagal menghapus habit.' });
  }
};

// ─── Check Habit (Complete for Today) ────────────────────────────────────────
// POST /api/habits/:id/check
// Idempotent: jika sudah check-in hari ini, tidak membuat duplikat.
const checkHabit = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verify ownership
    const habit = await prisma.habit.findFirst({
      where: { id, userId },
    });

    if (!habit) {
      return res.status(404).json({
        status: 'error',
        message: 'Habit tidak ditemukan.',
      });
    }

    // Check if already completed today (prevent duplicate)
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);

    const existingLog = await prisma.habitLog.findFirst({
      where: {
        habitId: id,
        dateCompleted: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    if (existingLog) {
      return res.json({
        status: 'success',
        message: 'Habit sudah di-check hari ini.',
        data: existingLog,
        alreadyChecked: true,
      });
    }

    // Create new log for today
    const log = await prisma.habitLog.create({
      data: {
        habitId: id,
        dateCompleted: new Date(),
      },
    });

    return res.status(201).json({
      status: 'success',
      message: 'Habit berhasil di-check untuk hari ini!',
      data: log,
      alreadyChecked: false,
    });
  } catch (error) {
    console.error('checkHabit error:', error);
    return res.status(500).json({ status: 'error', message: 'Gagal check habit.' });
  }
};

// ─── Log Habit Completion ────────────────────────────────────────────────────
const logHabitCompletion = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { dateCompleted } = req.body;

    // Verify ownership
    const habit = await prisma.habit.findFirst({
      where: { id, userId },
    });

    if (!habit) {
      return res.status(404).json({
        status: 'error',
        message: 'Habit tidak ditemukan.',
      });
    }

    const completedDate = dateCompleted ? new Date(dateCompleted) : new Date();

    if (isNaN(completedDate.getTime())) {
      return res.status(400).json({
        status: 'error',
        message: 'Format dateCompleted tidak valid.',
      });
    }

    const log = await prisma.habitLog.create({
      data: {
        habitId: id,
        dateCompleted: completedDate,
      },
    });

    return res.status(201).json({ status: 'success', data: log });
  } catch (error) {
    console.error('logHabitCompletion error:', error);
    return res.status(500).json({ status: 'error', message: 'Gagal mencatat habit log.' });
  }
};

module.exports = {
  createHabit,
  getAllHabits,
  deleteHabit,
  checkHabit,
  logHabitCompletion,
};
