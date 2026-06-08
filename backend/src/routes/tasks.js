const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const {
  createTask,
  getAllTasks,
  updateTask,
  deleteTask,
  getPresignedUrl,
} = require('../controllers/taskController');

// All task routes require authentication
router.use(authenticate);

// GET  /api/tasks/presigned-url  → S3 presigned URL for direct upload
// Must be defined BEFORE /:id to avoid route conflict
router.get('/presigned-url', getPresignedUrl);

// POST   /api/tasks       → Create a new task
router.post('/', createTask);

// GET    /api/tasks       → Get all tasks for the authenticated user
router.get('/', getAllTasks);

// PUT    /api/tasks/:id   → Update a task
router.put('/:id', updateTask);

// DELETE /api/tasks/:id   → Delete a task
router.delete('/:id', deleteTask);

module.exports = router;
