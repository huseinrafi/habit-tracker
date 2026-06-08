const express = require('express');
const router = express.Router();
const { docClient, HABITS_TABLE } = require('../db');
const { ScanCommand, PutCommand, UpdateCommand, DeleteCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

// ─── Helper: Recalculate streak from days ────────────────────────────────────
function recalculateStreak(days) {
  let count = 0;
  for (const val of Object.values(days)) {
    if (val) count++;
  }
  return count * 3 + 2;
}

// ─── GET /api/habits — Retrieve all habits ───────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const data = await docClient.send(new ScanCommand({ TableName: HABITS_TABLE }));
    let habits = data.Items || [];
    habits.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    habits = habits.map(row => ({
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
    }));
    res.json(habits);
  } catch (err) {
    console.error('GET /api/habits error:', err);
    res.status(500).json({ error: 'Failed to fetch habits' });
  }
});

// ─── POST /api/habits — Create a new habit ───────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Habit name is required' });
    }

    const id = 'habit-' + Date.now();
    const newHabit = {
      id,
      name,
      streak: 0,
      day_mon: 0, day_tue: 0, day_wed: 0, day_thu: 0,
      day_fri: 0, day_sat: 0, day_sun: 0,
      created_at: new Date().toISOString()
    };

    await docClient.send(new PutCommand({ TableName: HABITS_TABLE, Item: newHabit }));

    res.status(201).json({
      id: newHabit.id,
      name: newHabit.name,
      streak: newHabit.streak,
      days: { MON: false, TUE: false, WED: false, THU: false, FRI: false, SAT: false, SUN: false }
    });
  } catch (err) {
    console.error('POST /api/habits error:', err);
    res.status(500).json({ error: 'Failed to create habit' });
  }
});

// ─── PUT /api/habits/:id — Update a habit (toggle days, etc.) ────────────────
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const existing = await docClient.send(new GetCommand({ TableName: HABITS_TABLE, Key: { id } }));
    if (!existing.Item) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    const { days, name } = req.body;
    
    let updateExpression = 'SET';
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    if (name !== undefined) {
      updateExpression += ' #name = :name,';
      expressionAttributeNames['#name'] = 'name';
      expressionAttributeValues[':name'] = name;
    }

    if (days) {
      const streak = recalculateStreak(days);
      updateExpression += ' day_mon = :mon, day_tue = :tue, day_wed = :wed, day_thu = :thu, day_fri = :fri, day_sat = :sat, day_sun = :sun, streak = :streak,';
      expressionAttributeValues[':mon'] = days.MON ? 1 : 0;
      expressionAttributeValues[':tue'] = days.TUE ? 1 : 0;
      expressionAttributeValues[':wed'] = days.WED ? 1 : 0;
      expressionAttributeValues[':thu'] = days.THU ? 1 : 0;
      expressionAttributeValues[':fri'] = days.FRI ? 1 : 0;
      expressionAttributeValues[':sat'] = days.SAT ? 1 : 0;
      expressionAttributeValues[':sun'] = days.SUN ? 1 : 0;
      expressionAttributeValues[':streak'] = streak;
    }

    updateExpression = updateExpression.slice(0, -1);

    if (Object.keys(expressionAttributeValues).length === 0) {
       const row = existing.Item;
       return res.json({
         id: row.id,
         name: row.name,
         streak: row.streak,
         days: {
           MON: row.day_mon === 1, TUE: row.day_tue === 1, WED: row.day_wed === 1, THU: row.day_thu === 1,
           FRI: row.day_fri === 1, SAT: row.day_sat === 1, SUN: row.day_sun === 1
         }
       });
    }

    const updatedData = await docClient.send(new UpdateCommand({
      TableName: HABITS_TABLE,
      Key: { id },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    }));

    const row = updatedData.Attributes;
    res.json({
      id: row.id,
      name: row.name,
      streak: row.streak,
      days: {
        MON: row.day_mon === 1, TUE: row.day_tue === 1, WED: row.day_wed === 1, THU: row.day_thu === 1,
        FRI: row.day_fri === 1, SAT: row.day_sat === 1, SUN: row.day_sun === 1
      }
    });

  } catch (err) {
    console.error('PUT /api/habits/:id error:', err);
    res.status(500).json({ error: 'Failed to update habit' });
  }
});

// ─── DELETE /api/habits/:id — Delete a habit ─────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const existing = await docClient.send(new GetCommand({ TableName: HABITS_TABLE, Key: { id } }));
    if (!existing.Item) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    await docClient.send(new DeleteCommand({ TableName: HABITS_TABLE, Key: { id } }));
    res.json({ message: 'Habit deleted', id });
  } catch (err) {
    console.error('DELETE /api/habits/:id error:', err);
    res.status(500).json({ error: 'Failed to delete habit' });
  }
});

module.exports = router;
