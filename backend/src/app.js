const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');

const { dynamodb, TABLES } = require('./lib/dynamodb');
const { ATTACHMENTS_BUCKET, generateUploadUrl } = require('./lib/s3');
const { v4: uuidv4 } = require('uuid');

const app = express();

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    /\.s3-website-.*\.amazonaws\.com$/,
  ],
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));

app.set('dynamodb', dynamodb);
app.set('TABLES', TABLES);
app.set('ATTACHMENTS_BUCKET', ATTACHMENTS_BUCKET);

const tasksRouter = require('./routes/tasks');
const habitsRouter = require('./routes/habits');
const dashboardRouter = require('./routes/dashboard');
const authRouter = require('./routes/auth');

app.use('/api/tasks', tasksRouter);
app.use('/api/habits', habitsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/auth', authRouter);

app.get('/api/upload-url', async (req, res) => {
  try {
    const { fileName, contentType } = req.query;
    if (!fileName || !contentType) {
      return res.status(400).json({ error: 'fileName and contentType are required' });
    }
    const fileKey = `uploads/${uuidv4()}-${fileName}`;

    if (process.env.IS_OFFLINE === 'true' || process.env.NODE_ENV === 'development') {
      return res.json({
        uploadUrl: null,
        fileKey,
        message: 'Upload not available in offline mode. Use direct URL instead.',
      });
    }

    const uploadUrl = await generateUploadUrl(fileKey, contentType);
    res.json({ uploadUrl, fileKey });
  } catch (error) {
    console.error('upload-url error:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), database: 'dynamodb' });
});

app.get('/api/health-check', (req, res) => {
  res.json({ status: 'connected', message: 'Backend Serverless siap menerima request!' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

module.exports.app = app;
module.exports.handler = serverless(app, {
  binary: ['image/*', 'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'application/octet-stream', 'application/pdf'],
});
