const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ─── Helper: Get start-of-day in UTC ─────────────────────────────────────────
function startOfDay(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// ─── Helper: Get date range for a week (Mon–Sun) ─────────────────────────────
function getWeekRange(referenceDate) {
  const d = new Date(referenceDate);
  const dayOfWeek = d.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = startOfDay(d);
  monday.setUTCDate(monday.getUTCDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);

  return { start: monday, end: sunday };
}

// ─── GET /api/dashboard/streak ───────────────────────────────────────────────
// Menghitung Current Streak untuk setiap daily habit milik user.
//
// Logika:
//   1. Ambil semua habit daily milik user
//   2. Untuk tiap habit, ambil HabitLog diurutkan mundur dari hari ini
//   3. Mulai dari hari ini (atau kemarin jika hari ini belum check-in),
//      hitung hari berturut-turut tanpa bolong
//   4. Jika ada hari bolong, hentikan dan kembalikan angka streak
const getStreak = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get all daily habits for the user
    const dailyHabits = await prisma.habit.findMany({
      where: {
        userId,
        repeatableType: 'daily',
      },
      include: {
        logs: {
          orderBy: { dateCompleted: 'desc' },
        },
      },
    });

    const today = startOfDay(new Date());

    const streaks = dailyHabits.map((habit) => {
      const streak = calculateStreak(habit.logs, today);
      return {
        habitId: habit.id,
        title: habit.title,
        currentStreak: streak,
      };
    });

    // Also compute an overall "best" streak across all daily habits
    const totalStreak = streaks.reduce((sum, s) => sum + s.currentStreak, 0);
    const maxStreak = streaks.length > 0
      ? Math.max(...streaks.map((s) => s.currentStreak))
      : 0;

    return res.json({
      status: 'success',
      data: {
        habits: streaks,
        summary: {
          totalDailyHabits: streaks.length,
          maxStreak,
          totalStreak,
        },
      },
    });
  } catch (error) {
    console.error('getStreak error:', error);
    return res.status(500).json({ status: 'error', message: 'Gagal menghitung streak.' });
  }
};

/**
 * Calculate the current consecutive-day streak from a list of HabitLogs.
 *
 * @param {Array} logs  - HabitLog entries sorted by dateCompleted DESC
 * @param {Date}  today - Start-of-day UTC for "today"
 * @returns {number} The current streak count
 */
function calculateStreak(logs, today) {
  if (!logs || logs.length === 0) return 0;

  // Build a Set of date strings (YYYY-MM-DD) for O(1) lookup
  const completedDates = new Set(
    logs.map((log) => {
      const d = startOfDay(new Date(log.dateCompleted));
      return d.toISOString().slice(0, 10); // "2026-06-08"
    })
  );

  // Determine starting point: if today is already checked in, start from today.
  // Otherwise start from yesterday (user might check in later today).
  const todayStr = today.toISOString().slice(0, 10);
  let checkDate = new Date(today);

  if (!completedDates.has(todayStr)) {
    // Give grace — start counting from yesterday
    checkDate.setUTCDate(checkDate.getUTCDate() - 1);
  }

  let streak = 0;

  while (true) {
    const dateStr = checkDate.toISOString().slice(0, 10);

    if (completedDates.has(dateStr)) {
      streak++;
      checkDate.setUTCDate(checkDate.getUTCDate() - 1); // go one day back
    } else {
      break; // gap found, stop counting
    }
  }

  return streak;
}

// ─── GET /api/dashboard/analytics ────────────────────────────────────────────
// Menghitung persentase penyelesaian habit dan task:
//   - Minggu ini  (current week Mon–Sun)
//   - Minggu lalu (previous week Mon–Sun)
//
// Response shape:
// {
//   habits: { thisWeek: { completed, total, percentage }, lastWeek: { ... } },
//   tasks:  { thisWeek: { completed, total, percentage }, lastWeek: { ... } },
// }
const getAnalytics = async (req, res) => {
  try {
    const userId = req.user.userId;
    const now = new Date();

    // Date ranges
    const thisWeek = getWeekRange(now);
    const lastWeekRef = new Date(now);
    lastWeekRef.setUTCDate(lastWeekRef.getUTCDate() - 7);
    const lastWeek = getWeekRange(lastWeekRef);

    // ── Habit Analytics ────────────────────────────────────────────────────
    // "Total" = number of daily habits × 7 days in the week
    // (weekly habits × 1, monthly habits × 1 as applicable)
    const userHabits = await prisma.habit.findMany({
      where: { userId },
    });

    const habitExpected = calculateExpectedHabitCompletions(userHabits);

    // Count actual completions this week
    const habitLogsThisWeek = await prisma.habitLog.count({
      where: {
        habit: { userId },
        dateCompleted: {
          gte: thisWeek.start,
          lte: thisWeek.end,
        },
      },
    });

    // Count actual completions last week
    const habitLogsLastWeek = await prisma.habitLog.count({
      where: {
        habit: { userId },
        dateCompleted: {
          gte: lastWeek.start,
          lte: lastWeek.end,
        },
      },
    });

    // ── Task Analytics ─────────────────────────────────────────────────────
    // Total tasks whose date range overlaps the week
    const tasksThisWeekTotal = await prisma.task.count({
      where: {
        userId,
        startDate: { lte: thisWeek.end },
        endDate: { gte: thisWeek.start },
      },
    });

    const tasksThisWeekCompleted = await prisma.task.count({
      where: {
        userId,
        startDate: { lte: thisWeek.end },
        endDate: { gte: thisWeek.start },
        completedAt: { not: null },
      },
    });

    const tasksLastWeekTotal = await prisma.task.count({
      where: {
        userId,
        startDate: { lte: lastWeek.end },
        endDate: { gte: lastWeek.start },
      },
    });

    const tasksLastWeekCompleted = await prisma.task.count({
      where: {
        userId,
        startDate: { lte: lastWeek.end },
        endDate: { gte: lastWeek.start },
        completedAt: { not: null },
      },
    });

    // ── Build response ─────────────────────────────────────────────────────
    const pct = (completed, total) =>
      total === 0 ? 0 : Math.round((completed / total) * 100);

    return res.json({
      status: 'success',
      data: {
        habits: {
          thisWeek: {
            completed: habitLogsThisWeek,
            expected: habitExpected,
            percentage: pct(habitLogsThisWeek, habitExpected),
          },
          lastWeek: {
            completed: habitLogsLastWeek,
            expected: habitExpected,
            percentage: pct(habitLogsLastWeek, habitExpected),
          },
        },
        tasks: {
          thisWeek: {
            completed: tasksThisWeekCompleted,
            total: tasksThisWeekTotal,
            percentage: pct(tasksThisWeekCompleted, tasksThisWeekTotal),
          },
          lastWeek: {
            completed: tasksLastWeekCompleted,
            total: tasksLastWeekTotal,
            percentage: pct(tasksLastWeekCompleted, tasksLastWeekTotal),
          },
        },
        period: {
          thisWeek: { start: thisWeek.start, end: thisWeek.end },
          lastWeek: { start: lastWeek.start, end: lastWeek.end },
        },
      },
    });
  } catch (error) {
    console.error('getAnalytics error:', error);
    return res.status(500).json({ status: 'error', message: 'Gagal menghitung analytics.' });
  }
};

/**
 * Calculate expected completions per week based on habit repeatable types.
 *   - daily   → 7 per week
 *   - weekly  → 1 per week
 *   - monthly → 0.25 per week (≈1 per month, rounded up to 1 for display)
 */
function calculateExpectedHabitCompletions(habits) {
  let expected = 0;
  for (const habit of habits) {
    switch (habit.repeatableType) {
      case 'daily':
        expected += 7;
        break;
      case 'weekly':
        expected += 1;
        break;
      case 'monthly':
        expected += 1; // treat as 1 expected per week for simplicity
        break;
    }
  }
  return expected;
}

module.exports = {
  getStreak,
  getAnalytics,
};
