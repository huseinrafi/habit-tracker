const express = require('express');
const router = express.Router();
const { PutCommand, QueryCommand, UpdateCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const crypto = require('crypto');
const { authenticate } = require('../middlewares/auth'); // Tetap gunakan keamanan middleware Anda

// Mengaktifkan autentikasi token untuk semua rute di bawah ini
router.use(authenticate);

// Fungsi pembantu mengambil ID User dari JWT token middleware Anda
const getUserId = (req) => {
  return req.user?.id || "LOCAL_USER_123";
};

// ─── 1. GET S3 PRESIGNED URL (GET /api/tasks/presigned-url) ────────────────
// Ditaruh paling atas agar tidak bertabrakan dengan rute /:id
router.get('/presigned-url', async (req, res) => {
  try {
    const fileName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    // Catatan: Jika Anda nanti mengimplementasikan upload langsung ke AWS S3, 
    // pasang @aws-sdk/s3-request-presigner di sini. Untuk lokal kita berikan mock format:
    res.json({
      uploadUrl: `http://localhost:3001/api/upload`,
      key: `tasks/${fileName}`
    });
  } catch (error) {
    res.status(500).json({ error: "Gagal membuat presigned URL", details: error.message });
  }
});

// ─── 2. CREATE TASK (POST /api/tasks) ──────────────────────────────────────
router.post('/', async (req, res) => {
  const dynamo = req.app.get('dynamo');
  const { title, description, dueDate } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const userId = getUserId(req);
  const taskId = crypto.randomUUID(); // Generator ID otomatis untuk Task

  const params = {
    TableName: "TasksTable", // 💡 Menembak tabel TasksTable dari script seed
    Item: {
      PK: `USER#${userId}`,
      SK: `TASK#${taskId}`,
      id: taskId,
      title: title,
      description: description || "",
      dueDate: dueDate || null,
      isCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };

  try {
    await dynamo.send(new PutCommand(params));
    res.status(201).json(params.Item);
  } catch (error) {
    console.error("🚨 DynamoDB Task Put Error:", error);
    res.status(500).json({ error: "Gagal menyimpan task baru", details: error.message });
  }
});

// ─── 3. GET ALL USER TASKS (GET /api/tasks) ────────────────────────────────
router.get('/', async (req, res) => {
  const dynamo = req.app.get('dynamo');
  const userId = getUserId(req);

  const params = {
    TableName: "TasksTable",
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": `USER#${userId}`,
      ":skPrefix": "TASK#"
    }
  };

  try {
    const data = await dynamo.send(new QueryCommand(params));
    res.json(data.Items || []);
  } catch (error) {
    console.error("🚨 DynamoDB Task Query Error:", error);
    res.status(500).json({ error: "Gagal mengambil daftar tasks", details: error.message });
  }
});

// ─── 4. UPDATE TASK (PUT /api/tasks/:id) ───────────────────────────────────
router.put('/:id', async (req, res) => {
  const dynamo = req.app.get('dynamo');
  const userId = getUserId(req);
  const taskId = req.params.id;
  const { title, description, isCompleted, dueDate } = req.body;

  const params = {
    TableName: "TasksTable",
    Key: {
      PK: `USER#${userId}`,
      SK: `TASK#${taskId}`
    },
    // Mengupdate hanya field yang dikirim dari frontend
    UpdateExpression: "set title = :t, description = :d, isCompleted = :c, dueDate = :du, updatedAt = :u",
    ExpressionAttributeValues: {
      ":t": title,
      ":d": description || "",
      ":c": isCompleted !== undefined ? isCompleted : false,
      ":du": dueDate || null,
      ":u": new Date().toISOString()
    },
    ReturnValues: "ALL_NEW" // Mengembalikan data hasil update terbaru
  };

  try {
    const data = await dynamo.send(new UpdateCommand(params));
    res.json(data.Attributes);
  } catch (error) {
    console.error("🚨 DynamoDB Task Update Error:", error);
    res.status(500).json({ error: "Gagal memperbarui data task", details: error.message });
  }
});

// ─── 5. DELETE TASK (DELETE /api/tasks/:id) ────────────────────────────────
router.delete('/:id', async (req, res) => {
  const dynamo = req.app.get('dynamo');
  const userId = getUserId(req);
  const taskId = req.params.id;

  const params = {
    TableName: "TasksTable",
    Key: {
      PK: `USER#${userId}`,
      SK: `TASK#${taskId}`
    }
  };

  try {
    await dynamo.send(new DeleteCommand(params));
    res.json({ success: true, message: `Task dengan ID ${taskId} berhasil dihapus.` });
  } catch (error) {
    console.error("🚨 DynamoDB Task Delete Error:", error);
    res.status(500).json({ error: "Gagal menghapus task", details: error.message });
  }
});

module.exports = router;