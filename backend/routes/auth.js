const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-local-jwt-key-for-development';

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ status: 'error', message: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ status: 'error', message: 'Password must be at least 6 characters.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ status: 'error', message: 'An account with this email already exists.' });
    }

    const id = 'user-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    const hashedPassword = bcrypt.hashSync(password, 10);

    db.prepare('INSERT INTO users (id, email, name, password) VALUES (?, ?, ?, ?)').run(id, email, name, hashedPassword);

    const token = generateToken({ userId: id, email });

    res.status(201).json({
      token,
      user: { id, name, email }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ status: 'error', message: 'Registration failed.' });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ status: 'error', message: 'Email and password are required.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Invalid email or password.' });
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return res.status(401).json({ status: 'error', message: 'Invalid email or password.' });
    }

    const token = generateToken({ userId: user.id, email: user.email });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ status: 'error', message: 'Login failed.' });
  }
});

// GET /api/auth/profile
router.get('/profile', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ status: 'error', message: 'No token provided.' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ status: 'error', message: 'Invalid token format.' });
    }

    const decoded = jwt.verify(parts[1], JWT_SECRET);
    const user = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').get(decoded.userId);

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found.' });
    }

    res.json({
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ status: 'error', message: 'Token has expired.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ status: 'error', message: 'Invalid token.' });
    }
    console.error('Profile error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch profile.' });
  }
});

module.exports = router;
