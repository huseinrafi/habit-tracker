const { withAuth, withPublic, formatResponse } = require('./middlewares/lambdaAuth');
const taskController = require('./controllers/taskController');
const habitController = require('./controllers/habitController');
const dashboardController = require('./controllers/dashboardController');
const { v4: uuidv4 } = require('uuid');
const { generateUploadUrl, uploadFromBase64, generateDownloadUrl, ATTACHMENTS_BUCKET } = require('./lib/s3');

// Tasks
module.exports.createTask = withAuth(taskController.createTask);
module.exports.getAllTasks = withAuth(taskController.getAllTasks);
module.exports.updateTask = withAuth(taskController.updateTask);
module.exports.deleteTask = withAuth(taskController.deleteTask);

// Habits
module.exports.createHabit = withAuth(habitController.createHabit);
module.exports.getAllHabits = withAuth(habitController.getAllHabits);
module.exports.deleteHabit = withAuth(habitController.deleteHabit);
module.exports.checkHabit = withAuth(habitController.checkHabit);
module.exports.logHabitCompletion = withAuth(habitController.logHabitCompletion);

// Dashboard
module.exports.getStreak = withAuth(dashboardController.getStreak);
module.exports.getAnalytics = withAuth(dashboardController.getAnalytics);

// Auth Profile
module.exports.getProfile = withAuth(async (req, res) => {
  res.json({
    status: 'success',
    data: { userId: req.user.userId, email: req.user.email, name: req.user.name },
  });
});

// Upload
module.exports.getUploadUrl = withAuth(async (req, res) => {
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

module.exports.uploadFile = withAuth(async (req, res) => {
  try {
    const { fileName, contentType, fileBase64 } = req.body;
    if (!fileName || !contentType || !fileBase64) {
      return res.status(400).json({ error: 'fileName, contentType, and fileBase64 are required' });
    }
    const fileKey = `uploads/${uuidv4()}-${fileName}`;

    if (process.env.IS_OFFLINE === 'true' || process.env.NODE_ENV === 'development') {
      return res.json({ url: null, fileKey, message: 'Upload not available in offline mode' });
    }

    await uploadFromBase64(fileKey, contentType, fileBase64);
    const downloadUrl = await generateDownloadUrl(fileKey);

    res.json({ url: downloadUrl, fileKey });
  } catch (error) {
    console.error('upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Health (public - no auth)
module.exports.health = withPublic(async (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), database: 'dynamodb' });
});

module.exports.healthCheck = withPublic(async (req, res) => {
  res.json({ status: 'connected', message: 'Backend Serverless siap menerima request!' });
});
