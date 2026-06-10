const { PutCommand, GetCommand, DeleteCommand, QueryCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const createHabit = async (req, res) => {
  try {
    const { title, type, repeatableType } = req.body;
    const userId = req.user.userId;

    if (!title || !type) {
      return res.status(400).json({ status: 'error', message: 'Field title dan type wajib diisi.' });
    }

    const validTypes = ['daily', 'weekly', 'monthly'];
    const finalRepeatableType = repeatableType || 'daily';
    if (!validTypes.includes(finalRepeatableType)) {
      return res.status(400).json({
        status: 'error',
        message: `repeatableType harus salah satu dari: ${validTypes.join(', ')}`,
      });
    }

    const habitId = uuidv4();
    const now = new Date().toISOString();
    const dynamodb = req.app.get('dynamodb');
    const TABLES = req.app.get('TABLES');

    await dynamodb.send(new PutCommand({
      TableName: TABLES.HABITS,
      Item: {
        userId,
        habitId,
        title,
        type,
        repeatableType: finalRepeatableType,
        createdAt: now,
        updatedAt: now,
      },
    }));

    return res.status(201).json({
      status: 'success',
      data: { id: habitId, userId, habitId, title, type, repeatableType: finalRepeatableType, createdAt: now, updatedAt: now },
    });
  } catch (error) {
    console.error('createHabit error:', error);
    return res.status(500).json({ status: 'error', message: 'Gagal membuat habit.' });
  }
};

const getAllHabits = async (req, res) => {
  try {
    const userId = req.user.userId;
    const dynamodb = req.app.get('dynamodb');
    const TABLES = req.app.get('TABLES');

    const { Items: habits } = await dynamodb.send(new QueryCommand({
      TableName: TABLES.HABITS,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
      ScanIndexForward: true,
    }));

    if (!habits || habits.length === 0) {
      return res.json({ status: 'success', data: [] });
    }

    const habitsWithLogs = await Promise.all(habits.map(async (habit) => {
      const { Items: logs } = await dynamodb.send(new QueryCommand({
        TableName: TABLES.LOGS,
        KeyConditionExpression: 'habitId = :habitId',
        ExpressionAttributeValues: { ':habitId': habit.habitId },
        ScanIndexForward: false,
      }));
      return { ...habit, id: habit.habitId, logs: logs || [] };
    }));

    return res.json({ status: 'success', data: habitsWithLogs });
  } catch (error) {
    console.error('getAllHabits error:', error);
    return res.status(500).json({ status: 'error', message: 'Gagal mengambil habits.' });
  }
};

const deleteHabit = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const dynamodb = req.app.get('dynamodb');
    const TABLES = req.app.get('TABLES');

    const { Item } = await dynamodb.send(new GetCommand({
      TableName: TABLES.HABITS,
      Key: { userId, habitId: id },
    }));

    if (!Item) {
      return res.status(404).json({ status: 'error', message: 'Habit tidak ditemukan.' });
    }

    const { Items: logs } = await dynamodb.send(new QueryCommand({
      TableName: TABLES.LOGS,
      KeyConditionExpression: 'habitId = :habitId',
      ExpressionAttributeValues: { ':habitId': id },
    }));

    if (logs && logs.length > 0) {
      const deleteRequests = logs.map((log) => ({
        DeleteRequest: { Key: { habitId: log.habitId, 'dateCompleted#logId': log['dateCompleted#logId'] } },
      }));
      const chunks = [];
      for (let i = 0; i < deleteRequests.length; i += 25) {
        chunks.push(deleteRequests.slice(i, i + 25));
      }
      await Promise.all(chunks.map((chunk) =>
        dynamodb.send(new BatchWriteCommand({
          RequestItems: { [TABLES.LOGS]: chunk },
        }))
      ));
    }

    await dynamodb.send(new DeleteCommand({
      TableName: TABLES.HABITS,
      Key: { userId, habitId: id },
    }));

    return res.json({ status: 'success', message: 'Habit berhasil dihapus.' });
  } catch (error) {
    console.error('deleteHabit error:', error);
    return res.status(500).json({ status: 'error', message: 'Gagal menghapus habit.' });
  }
};

const checkHabit = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const dynamodb = req.app.get('dynamodb');
    const TABLES = req.app.get('TABLES');

    const { Item: habit } = await dynamodb.send(new GetCommand({
      TableName: TABLES.HABITS,
      Key: { userId, habitId: id },
    }));

    if (!habit) {
      return res.status(404).json({ status: 'error', message: 'Habit tidak ditemukan.' });
    }

    const todayStart = toLocalDateString();

    const { Items: existingLogs } = await dynamodb.send(new QueryCommand({
      TableName: TABLES.LOGS,
      KeyConditionExpression: 'habitId = :habitId AND begins_with(#sk, :datePrefix)',
      ExpressionAttributeNames: { '#sk': 'dateCompleted#logId' },
      ExpressionAttributeValues: {
        ':habitId': id,
        ':datePrefix': todayStart,
      },
    }));

    if (existingLogs && existingLogs.length > 0) {
      return res.json({
        status: 'success',
        message: 'Habit sudah di-check hari ini.',
        data: existingLogs[0],
        alreadyChecked: true,
      });
    }

    const logId = uuidv4();
    const now = new Date().toISOString();
    await dynamodb.send(new PutCommand({
      TableName: TABLES.LOGS,
      Item: {
        habitId: id,
        'dateCompleted#logId': `${todayStart}#${logId}`,
        userId,
        dateCompleted: todayStart,
        createdAt: now,
      },
    }));

    return res.status(201).json({
      status: 'success',
      message: 'Habit berhasil di-check untuk hari ini!',
      data: { logId, habitId: id, dateCompleted: todayStart, createdAt: now },
      alreadyChecked: false,
    });
  } catch (error) {
    console.error('checkHabit error:', error);
    return res.status(500).json({ status: 'error', message: 'Gagal check habit.' });
  }
};

function pad2(n) { return String(n).padStart(2, '0'); }

function toLocalDateString(value) {
  const d = value ? new Date(value) : new Date();
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}

const logHabitCompletion = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { dateCompleted } = req.body;
    const dynamodb = req.app.get('dynamodb');
    const TABLES = req.app.get('TABLES');

    const { Item: habit } = await dynamodb.send(new GetCommand({
      TableName: TABLES.HABITS,
      Key: { userId, habitId: id },
    }));

    if (!habit) {
      return res.status(404).json({ status: 'error', message: 'Habit tidak ditemukan.' });
    }

    const targetDate = toLocalDateString(dateCompleted);

    const { Items: existingLogs } = await dynamodb.send(new QueryCommand({
      TableName: TABLES.LOGS,
      KeyConditionExpression: 'habitId = :habitId AND begins_with(#sk, :datePrefix)',
      ExpressionAttributeNames: { '#sk': 'dateCompleted#logId' },
      ExpressionAttributeValues: {
        ':habitId': id,
        ':datePrefix': targetDate,
      },
    }));

    if (existingLogs && existingLogs.length > 0) {
      await dynamodb.send(new DeleteCommand({
        TableName: TABLES.LOGS,
        Key: { habitId: id, 'dateCompleted#logId': existingLogs[0]['dateCompleted#logId'] },
      }));
      return res.status(200).json({ status: 'success', message: 'Habit log removed' });
    }

    const logId = uuidv4();
    const now = new Date().toISOString();
    await dynamodb.send(new PutCommand({
      TableName: TABLES.LOGS,
      Item: {
        habitId: id,
        'dateCompleted#logId': `${targetDate}#${logId}`,
        userId,
        dateCompleted: targetDate,
        createdAt: now,
      },
    }));

    return res.status(201).json({ status: 'success', data: { logId, habitId: id, dateCompleted: targetDate, createdAt: now } });
  } catch (error) {
    console.error('logHabitCompletion error:', error);
    return res.status(500).json({ status: 'error', message: 'Gagal mencatat habit log.' });
  }
};

module.exports = { createHabit, getAllHabits, deleteHabit, checkHabit, logHabitCompletion };
