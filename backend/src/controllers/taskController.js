const { PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const createTask = async (req, res) => {
  try {
    const { title, type, startDate, endDate, repeatableType, attachmentUrl } = req.body;
    const userId = req.user.userId;

    if (!title || !type) {
      return res.status(400).json({ status: 'error', message: 'Field title dan type wajib diisi.' });
    }

    const taskId = uuidv4();
    const now = new Date().toISOString();
    const dynamodb = req.app.get('dynamodb');
    const TABLES = req.app.get('TABLES');

    await dynamodb.send(new PutCommand({
      TableName: TABLES.TASKS,
      Item: {
        userId,
        taskId,
        title,
        type,
        startDate: startDate || now,
        endDate: endDate || now,
        repeatableType: repeatableType || 'disable',
        attachmentUrl: attachmentUrl || null,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      },
    }));

    return res.status(201).json({
      status: 'success',
      data: { id: taskId, userId, taskId, title, type, startDate, endDate, repeatableType, attachmentUrl, completedAt: null, createdAt: now, updatedAt: now },
    });
  } catch (error) {
    console.error('createTask error:', error);
    return res.status(500).json({ status: 'error', message: 'Gagal membuat task.' });
  }
};

const getAllTasks = async (req, res) => {
  try {
    const userId = req.user.userId;
    const dynamodb = req.app.get('dynamodb');
    const TABLES = req.app.get('TABLES');

    const { Items } = await dynamodb.send(new QueryCommand({
      TableName: TABLES.TASKS,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
      ScanIndexForward: true,
    }));

    const data = (Items || []).map(item => ({ ...item, id: item.taskId }));
    return res.json({ status: 'success', data });
  } catch (error) {
    console.error('getAllTasks error:', error);
    return res.status(500).json({ status: 'error', message: 'Gagal mengambil tasks.' });
  }
};

const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { title, type, startDate, endDate, repeatableType, attachmentUrl, completedAt } = req.body;
    const dynamodb = req.app.get('dynamodb');
    const TABLES = req.app.get('TABLES');

    const { Item } = await dynamodb.send(new GetCommand({
      TableName: TABLES.TASKS,
      Key: { userId, taskId: id },
    }));

    if (!Item) {
      return res.status(404).json({ status: 'error', message: 'Task tidak ditemukan.' });
    }

    const updateExpr = [];
    const exprAttrValues = {};
    const exprAttrNames = {};

    if (title !== undefined) { updateExpr.push('#title = :title'); exprAttrValues[':title'] = title; exprAttrNames['#title'] = 'title'; }
    if (type !== undefined) { updateExpr.push('#type = :type'); exprAttrValues[':type'] = type; exprAttrNames['#type'] = 'type'; }
    if (startDate !== undefined) { updateExpr.push('#startDate = :startDate'); exprAttrValues[':startDate'] = startDate; exprAttrNames['#startDate'] = 'startDate'; }
    if (endDate !== undefined) { updateExpr.push('#endDate = :endDate'); exprAttrValues[':endDate'] = endDate; exprAttrNames['#endDate'] = 'endDate'; }
    if (repeatableType !== undefined) { updateExpr.push('#repeatableType = :repeatableType'); exprAttrValues[':repeatableType'] = repeatableType; exprAttrNames['#repeatableType'] = 'repeatableType'; }
    if (attachmentUrl !== undefined) { updateExpr.push('#attachmentUrl = :attachmentUrl'); exprAttrValues[':attachmentUrl'] = attachmentUrl; exprAttrNames['#attachmentUrl'] = 'attachmentUrl'; }
    if (completedAt !== undefined) { updateExpr.push('#completedAt = :completedAt'); exprAttrValues[':completedAt'] = completedAt; exprAttrNames['#completedAt'] = 'completedAt'; }

    if (updateExpr.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Tidak ada field yang diupdate.' });
    }

    exprAttrValues[':updatedAt'] = new Date().toISOString();
    updateExpr.push('#updatedAt = :updatedAt');
    exprAttrNames['#updatedAt'] = 'updatedAt';

    await dynamodb.send(new UpdateCommand({
      TableName: TABLES.TASKS,
      Key: { userId, taskId: id },
      UpdateExpression: `SET ${updateExpr.join(', ')}`,
      ExpressionAttributeNames: exprAttrNames,
      ExpressionAttributeValues: exprAttrValues,
    }));

    return res.json({ status: 'success', message: 'Task berhasil diupdate.' });
  } catch (error) {
    console.error('updateTask error:', error);
    return res.status(500).json({ status: 'error', message: 'Gagal mengupdate task.' });
  }
};

const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const dynamodb = req.app.get('dynamodb');
    const TABLES = req.app.get('TABLES');

    const { Item } = await dynamodb.send(new GetCommand({
      TableName: TABLES.TASKS,
      Key: { userId, taskId: id },
    }));

    if (!Item) {
      return res.status(404).json({ status: 'error', message: 'Task tidak ditemukan.' });
    }

    await dynamodb.send(new DeleteCommand({
      TableName: TABLES.TASKS,
      Key: { userId, taskId: id },
    }));

    return res.json({ status: 'success', message: 'Task berhasil dihapus.' });
  } catch (error) {
    console.error('deleteTask error:', error);
    return res.status(500).json({ status: 'error', message: 'Gagal menghapus task.' });
  }
};

module.exports = { createTask, getAllTasks, updateTask, deleteTask };
