const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '5mb' }));  // Allow larger payloads for file attachments

// ─── Serve Frontend Static Files ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ─── File Upload ─────────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

// ─── API Routes ──────────────────────────────────────────────────────────────
const tasksRouter = require('./routes/tasks');
const habitsRouter = require('./routes/habits');
const authRouter = require('./routes/auth');

app.use('/api/tasks', tasksRouter);
app.use('/api/habits', habitsRouter);
app.use('/api/auth', authRouter);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/health-check', (req, res) => {
  res.json({ status: 'connected', message: 'Backend is ready!' });
});

// ─── Catch-All: Serve index.html for SPA ─────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ─── Start Server ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║   🚀 Habit Tracker Backend is running!                ║
║   📡 API:      http://localhost:${PORT}/api             ║
║   🌐 Frontend: http://localhost:${PORT}                 ║
║   💾 Database: SQLite (./data/habit_tracker.db)       ║
╚════════════════════════════════════════════════════════╝
  `);
});
