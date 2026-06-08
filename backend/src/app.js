const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');
const { PrismaClient } = require('@prisma/client');

// ─── Prisma Client (singleton) ──────────────────────────────────────────────
// Reuse the client across warm Lambda invocations to avoid exhausting DB connections
const prisma = new PrismaClient();

// ─── Express App ─────────────────────────────────────────────────────────────
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Make prisma available to route handlers via req.app
app.set('prisma', prisma);

// ─── API Routes ──────────────────────────────────────────────────────────────
const tasksRouter = require('./routes/tasks');
const habitsRouter = require('./routes/habits');
const dashboardRouter = require('./routes/dashboard');

app.use('/api/tasks', tasksRouter);
app.use('/api/habits', habitsRouter);
app.use('/api/dashboard', dashboardRouter);

// ─── Health Check ────────────────────────────────────────────────────────────
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
