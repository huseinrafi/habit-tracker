const express = require('express');
const router = express.Router();
const { PutCommand, QueryCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const crypto = require('crypto');
const { authenticate } = require('../middlewares/auth'); // 👈 1. Impor middleware keamanan Anda

// 👈 2. Aktifkan autentikasi token untuk semua rute habit di bawah ini
router.use(authenticate);

// Fungsi pembantu untuk mengambil ID User dari JWT
const getUserId = (req) => {
  return req.user.id; // 👈 3. Sekarang aman langsung mengambil id asli user
};

// ─── 1. CREATE HABIT (POST /api/habits) ──────────────────────────────────
router.post('/', async (req, res) => {
  const dynamo = req.app.get('dynamo');
  const { title, description, repeatableType } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const userId = getUserId(req);
  const habitId = crypto.randomUUID();

  const params = {
    TableName: "HabitsTable",
    Item: {
      PK: `USER#${userId}`,
      SK: `HABIT#${habitId}`,
      id: habitId,
      title: title,
      description: description || "",
      repeatableType: repeatableType || "DAILY",
      isCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };

  try {
    await dynamo.send(new PutCommand(params));
    res.status(201).json(params.Item);
  } catch (error) {
    console.error("🚨 DynamoDB Put Error:", error);
    res.status(500).json({ error: "Gagal menyimpan habit ke database", details: error.message });
  }
});

// ─── 2. GET ALL USER HABITS (GET /api/habits) ────────────────────────────
router.get('/', async (req, res) => {
  const dynamo = req.app.get('dynamo');
  const userId = getUserId(req);

  const params = {
    TableName: "HabitsTable",
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": `USER#${userId}`,
      ":skPrefix": "HABIT#"
    }
  };

  try {
    const data = await dynamo.send(new QueryCommand(params));
    res.json(data.Items || []);
  } catch (error) {
    console.error("🚨 DynamoDB Query Error:", error);
    res.status(500).json({ error: "Gagal mengambil data habits", details: error.message });
  }
});

// ─── 3. DELETE HABIT (DELETE /api/habits/:id) ────────────────────────────
router.delete('/:id', async (req, res) => {
  const dynamo = req.app.get('dynamo');
  const userId = getUserId(req);
  const habitId = req.params.id;

  const params = {
    TableName: "HabitsTable",
    Key: {
      PK: `USER#${userId}`,
      SK: `HABIT#${habitId}`
    }
  };

  try {
    await dynamo.send(new DeleteCommand(params));
    res.json({ success: true, message: `Habit dengan ID ${habitId} berhasil dihapus.` });
  } catch (error) {
    console.error("🚨 DynamoDB Delete Error:", error);
    res.status(500).json({ error: "Gagal menghapus habit", details: error.message });
  }
});

module.exports = router;