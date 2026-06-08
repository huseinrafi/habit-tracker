const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// ─── Prisma Client (singleton) ──────────────────────────────────────────────
// Reuse the client across warm Lambda invocations to avoid exhausting DB connections
const prisma = new PrismaClient();

// ─── Express App ─────────────────────────────────────────────────────────────
const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json({ limit: '5mb' }));

// Make prisma available to route handlers via req.app
app.set('prisma', prisma);

// Serve static files for uploads
const uploadDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Multer Config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
});
const upload = multer({ storage: storage });

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `http://localhost:3001/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

// ─── API Routes ──────────────────────────────────────────────────────────────
const tasksRouter = require('./routes/tasks');
const habitsRouter = require('./routes/habits');
const dashboardRouter = require('./routes/dashboard');

app.use('/api/tasks', tasksRouter);
app.use('/api/habits', habitsRouter);
app.use('/api/dashboard', dashboardRouter);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health-check', (req, res) => {
  res.json({ status: 'connected', message: 'Backend Serverless siap menerima request!' });
});

app.get('/api/health', async (req, res) => {
  try {
    // Verify DB connectivity
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      message: error.message,
    });
  }
});

// ─── 404 Fallback ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Export ──────────────────────────────────────────────────────────────────
// 1. `app`     → for local development (imported by server.js)
// 2. `handler` → for AWS Lambda via serverless-http
module.exports.app = app;
module.exports.handler = serverless(app);
