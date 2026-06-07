const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '5mb' }));  // Allow larger payloads for file attachments

// ─── Serve Frontend Static Files ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ─── API Routes ──────────────────────────────────────────────────────────────
const tasksRouter = require('./routes/tasks');
const habitsRouter = require('./routes/habits');

app.use('/api/tasks', tasksRouter);
app.use('/api/habits', habitsRouter);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
