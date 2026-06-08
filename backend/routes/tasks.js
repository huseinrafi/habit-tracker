const express = require('express');
const router = express.Router();
const { docClient, TASKS_TABLE } = require('../db');
const { ScanCommand, PutCommand, UpdateCommand, DeleteCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

// ─── GET /api/tasks — Retrieve all tasks ─────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const data = await docClient.send(new ScanCommand({ TableName: TASKS_TABLE }));
    let tasks = data.Items || [];
    // Sort by created_at desc
    tasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // Map to expected format
    tasks = tasks.map(t => ({
      id: t.id,
      title: t.title,
      category: t.category,
      priority: t.priority === 1,
      startDate: t.startDate,
      startTime: t.startTime,
      endDate: t.endDate,
      endTime: t.endTime,
      completed: t.completed === 1,
      notes: t.notes || '',
      attachments: t.attachments || []
    }));
    res.json(tasks);
  } catch (err) {
    console.error('GET /api/tasks error:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// ─── POST /api/tasks — Create a new task ─────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { id, title, category, priority, startDate, startTime, endDate, endTime, notes, attachments } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const taskId = id || 'task-' + Date.now();
    
    const newTask = {
      id: taskId,
      title,
      category: category || 'OFFICE',
      priority: priority ? 1 : 0,
      startDate: startDate || null,
      startTime: startTime || null,
      endDate: endDate || null,
      endTime: endTime || null,
      completed: 0,
      notes: notes || '',
      attachments: attachments || [],
      created_at: new Date().toISOString()
    };

    await docClient.send(new PutCommand({
      TableName: TASKS_TABLE,
      Item: newTask
    }));

    // Format for response
    const responseTask = {
      ...newTask,
      priority: newTask.priority === 1,
      completed: newTask.completed === 1,
    };

    res.status(201).json(responseTask);
  } catch (err) {
    console.error('POST /api/tasks error:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// ─── PATCH /api/tasks/:id — Update task (toggle completed, etc.) ─────────────
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const existing = await docClient.send(new GetCommand({ TableName: TASKS_TABLE, Key: { id } }));
    if (!existing.Item) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { completed, title, category, priority, notes } = req.body;
    
    let updateExpression = 'SET';
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    if (completed !== undefined) {
      updateExpression += ' #completed = :completed,';
      expressionAttributeNames['#completed'] = 'completed';
      expressionAttributeValues[':completed'] = completed ? 1 : 0;
    }
    if (title !== undefined) {
      updateExpression += ' #title = :title,';
      expressionAttributeNames['#title'] = 'title';
      expressionAttributeValues[':title'] = title;
    }
    if (category !== undefined) {
      updateExpression += ' #category = :category,';
      expressionAttributeNames['#category'] = 'category';
      expressionAttributeValues[':category'] = category;
    }
    if (priority !== undefined) {
      updateExpression += ' #priority = :priority,';
      expressionAttributeNames['#priority'] = 'priority';
      expressionAttributeValues[':priority'] = priority ? 1 : 0;
    }
    if (notes !== undefined) {
      updateExpression += ' #notes = :notes,';
      expressionAttributeNames['#notes'] = 'notes';
      expressionAttributeValues[':notes'] = notes;
    }

    // Remove trailing comma
    updateExpression = updateExpression.slice(0, -1);

    if (Object.keys(expressionAttributeValues).length === 0) {
      // Nothing to update
      const t = existing.Item;
      return res.json({
        ...t,
        priority: t.priority === 1,
        completed: t.completed === 1
      });
    }

    const updatedData = await docClient.send(new UpdateCommand({
      TableName: TASKS_TABLE,
      Key: { id },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    }));

    const t = updatedData.Attributes;
    res.json({
      ...t,
      priority: t.priority === 1,
      completed: t.completed === 1
    });
  } catch (err) {
    console.error('PATCH /api/tasks/:id error:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// ─── DELETE /api/tasks/:id — Delete a task ───────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const existing = await docClient.send(new GetCommand({ TableName: TASKS_TABLE, Key: { id } }));
    if (!existing.Item) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await docClient.send(new DeleteCommand({
      TableName: TASKS_TABLE,
      Key: { id }
    }));

    res.json({ message: 'Task deleted', id });
  } catch (err) {
    console.error('DELETE /api/tasks/:id error:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
