const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// ─── AWS SDK v3 DynamoDB Setup ──────────────────────────────────────────────
const { DynamoDBClient, ListTablesCommand } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");

const clientConfig = {
  region: process.env.AWS_REGION || 'ap-southeast-1'
};

// Deteksi otomatis jika aplikasi berjalan di komputer lokal (serverless-offline)
if (process.env.IS_OFFLINE) {
  clientConfig.endpoint = "http://localhost:8000"; // Endpoint default DynamoDB Local
  clientConfig.credentials = {
    accessKeyId: "localMajuJaya",
    secretAccessKey: "localMajuJayaSecret"
  };
}

const dynamoClient = new DynamoDBClient(clientConfig);

// Menggunakan DocumentClient agar manipulasi payload JSON database menjadi mudah
const dynamo = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true, // Menghapus otomatis properti bernilai undefined agar DB tidak error
  }
});

// ─── Express App ─────────────────────────────────────────────────────────────
const app = express();

// Middleware - Mengizinkan Cross-Origin dari port Vite Anda (5173 & 5174)
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174'
  ],
  credentials: true
}));
app.use(express.json({ limit: '5mb' }));

// Menyediakan instance DynamoDB ke seluruh router melalui object req.app
app.set('dynamo', dynamo);

// ─── Alokasi Berkas Upload yang Aman untuk AWS Lambda ────────────────────────
// AWS Lambda bersifat read-only kecuali folder /tmp. Jika offline, gunakan folder public bawaan.
const uploadDir = process.env.IS_OFFLINE ? path.join(__dirname, '../../public/uploads') : '/tmp';
if (!fs.existsSync(uploadDir) && process.env.IS_OFFLINE) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Konfigurasi Penyimpanan Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  // URL diarahkan dinamis ke port serverless-offline (3001)
  const fileUrl = `http://localhost:3000/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

// ─── API Routes ──────────────────────────────────────────────────────────────
const authRouter = require('./routes/auth');
const tasksRouter = require('./routes/tasks');
const habitsRouter = require('./routes/habits');
const dashboardRouter = require('./routes/dashboard');

// Registrasi endpoint
app.use('/api/auth', authRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/habits', habitsRouter);
app.use('/api/dashboard', dashboardRouter);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health-check', (req, res) => {
  res.json({ status: 'connected', message: 'Backend Serverless siap menerima request!' });
});

app.get('/api/health', async (req, res) => {
  try {
    // Memastikan koneksi database aktif dengan memanggil daftar tabel minimal di DynamoDB
    await dynamo.send(new ListTablesCommand({ Limit: 1 }));
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'DynamoDB Connected',
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'DynamoDB Disconnected',
      message: error.message,
    });
  }
});

// ─── 404 Fallback ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Export ──────────────────────────────────────────────────────────────────
module.exports.app = app;
module.exports.handler = serverless(app, {
  binary: [
    'image/*',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'application/octet-stream',
    'application/pdf'
  ]
});