const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { getStreak, getAnalytics } = require('../controllers/dashboardController');

// All dashboard routes require authentication
router.use(authenticate);

// GET /api/dashboard/streak    → Current streak per daily habit
router.get('/streak', getStreak);

// GET /api/dashboard/analytics → Completion percentages (this week vs last week)
router.get('/analytics', getAnalytics);

module.exports = router;
