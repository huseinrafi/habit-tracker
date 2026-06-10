const { QueryCommand } = require('@aws-sdk/lib-dynamodb');

function getWeekRange(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d.setDate(diff));
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

const getStreak = async (req, res) => {
  try {
    const userId = req.user.userId;
    const dynamodb = req.app.get('dynamodb');
    const TABLES = req.app.get('TABLES');

    const { Items: habits } = await dynamodb.send(new QueryCommand({
      TableName: TABLES.HABITS,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':daily': 'daily',
      },
      FilterExpression: 'repeatableType = :daily',
    }));

    if (!habits || habits.length === 0) {
      return res.json({
        status: 'success',
        data: { summary: { maxStreak: 0 }, habits: [] },
      });
    }

    const habitsWithStreak = await Promise.all(habits.map(async (habit) => {
      const { Items: logs } = await dynamodb.send(new QueryCommand({
        TableName: TABLES.LOGS,
        KeyConditionExpression: 'habitId = :habitId',
        ExpressionAttributeValues: { ':habitId': habit.habitId },
        ScanIndexForward: false,
      }));

      const sortedDates = (logs || [])
        .map((l) => l.dateCompleted)
        .sort()
        .reverse();

      let streak = 0;
      const today = new Date().toISOString().slice(0, 10);

      for (let i = 0; i < sortedDates.length; i++) {
        const expected = new Date();
        expected.setDate(expected.getDate() - i);
        const expectedStr = expected.toISOString().slice(0, 10);
        if (sortedDates[i] === expectedStr) {
          streak++;
        } else {
          break;
        }
      }

      const currentStreak = streak;

      return { ...habit, id: habit.habitId, currentStreak, streak, logs: logs || [] };
    }));

    const maxStreak = Math.max(...habitsWithStreak.map(h => h.currentStreak), 0);

    return res.json({
      status: 'success',
      data: {
        summary: { maxStreak },
        habits: habitsWithStreak,
      },
    });
  } catch (error) {
    console.error('getStreak error:', error);
    return res.status(500).json({ status: 'error', message: 'Gagal mengambil streak.' });
  }
};

const getAnalytics = async (req, res) => {
  try {
    const userId = req.user.userId;
    const dynamodb = req.app.get('dynamodb');
    const TABLES = req.app.get('TABLES');

    const thisWeek = getWeekRange(new Date());
    const lastWeekStart = new Date(new Date().setDate(new Date().getDate() - 7));
    const lastWeek = getWeekRange(lastWeekStart);

    const { Count: totalHabits } = await dynamodb.send(new QueryCommand({
      TableName: TABLES.HABITS,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
      Select: 'COUNT',
    }));

    const countLogsInRange = async (startDate, endDate) => {
      const { Count } = await dynamodb.send(new QueryCommand({
        TableName: TABLES.LOGS,
        IndexName: 'userId-date-index',
        KeyConditionExpression: 'userId = :userId AND dateCompleted BETWEEN :start AND :end',
        ExpressionAttributeValues: {
          ':userId': userId,
          ':start': startDate,
          ':end': endDate,
        },
        Select: 'COUNT',
      }));
      return Count || 0;
    };

    const habitLogsThisWeek = await countLogsInRange(thisWeek.start, thisWeek.end);
    const habitLogsLastWeek = await countLogsInRange(lastWeek.start, lastWeek.end);

    const countTasksInRange = async (startDate, endDate, completedOnly = false) => {
      const { Items } = await dynamodb.send(new QueryCommand({
        TableName: TABLES.TASKS,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': userId },
      }));

      const tasks = Items || [];
      return tasks.filter((t) => {
        const taskStart = (t.startDate || '').slice(0, 10);
        const taskEnd = (t.endDate || '').slice(0, 10);
        const overlaps = taskStart <= endDate && taskEnd >= startDate;
        return completedOnly ? (overlaps && t.completedAt) : overlaps;
      }).length;
    };

    const tasksThisWeekTotal = await countTasksInRange(thisWeek.start, thisWeek.end);
    const tasksThisWeekCompleted = await countTasksInRange(thisWeek.start, thisWeek.end, true);
    const tasksLastWeekTotal = await countTasksInRange(lastWeek.start, lastWeek.end);
    const tasksLastWeekCompleted = await countTasksInRange(lastWeek.start, lastWeek.end, true);

    const habitsThisWeekPct = totalHabits > 0 ? Math.round((habitLogsThisWeek / totalHabits) * 100) : 0;
    const habitsLastWeekPct = totalHabits > 0 ? Math.round((habitLogsLastWeek / totalHabits) * 100) : 0;

    return res.json({
      status: 'success',
      data: {
        habits: {
          thisWeek: { total: habitLogsThisWeek, percentage: habitsThisWeekPct },
          lastWeek: { total: habitLogsLastWeek, percentage: habitsLastWeekPct },
        },
        tasksThisWeek: { total: tasksThisWeekTotal, completed: tasksThisWeekCompleted },
        tasksLastWeek: { total: tasksLastWeekTotal, completed: tasksLastWeekCompleted },
      },
    });
  } catch (error) {
    console.error('getAnalytics error:', error);
    return res.status(500).json({ status: 'error', message: 'Gagal mengambil analytics.' });
  }
};

module.exports = { getStreak, getAnalytics };
