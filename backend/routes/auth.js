const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { docClient, USERS_TABLE } = require('../db');
const { PutCommand, GetCommand, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_change_in_production';

// Helper to find user by email using Scan (since we didn't setup GSI Query here for simplicity, though GSI is defined)
async function findUserByEmail(email) {
  // Using scan for simplicity, in prod use Query with EmailIndex
  const { Items } = await docClient.send(new ScanCommand({
    TableName: USERS_TABLE,
    FilterExpression: 'email = :email',
    ExpressionAttributeValues: { ':email': email }
  }));
  return Items && Items.length > 0 ? Items[0] : null;
}

// ─── POST /api/auth/register ─────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      id: 'user-' + Date.now(),
      name,
      email,
      password: hashedPassword,
      created_at: new Date().toISOString()
    };

    await docClient.send(new PutCommand({ TableName: USERS_TABLE, Item: newUser }));

    const token = jwt.sign({ id: newUser.id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: newUser.id, name: newUser.name, email: newUser.email } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// ─── POST /api/auth/login ────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Middleware to verify token
function authMiddleware(req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid' });
  }
}

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const data = await docClient.send(new GetCommand({ TableName: USERS_TABLE, Key: { id: req.user.id } }));
    if (!data.Item) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { password, ...userWithoutPassword } = data.Item;
    res.json(userWithoutPassword);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── PUT /api/auth/profile ───────────────────────────────────────────────────
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    let updateExpression = 'SET';
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    if (name) {
      updateExpression += ' #name = :name,';
      expressionAttributeNames['#name'] = 'name';
      expressionAttributeValues[':name'] = name;
    }
    if (email) {
      updateExpression += ' #email = :email,';
      expressionAttributeNames['#email'] = 'email';
      expressionAttributeValues[':email'] = email;
    }
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updateExpression += ' #password = :password,';
      expressionAttributeNames['#password'] = 'password';
      expressionAttributeValues[':password'] = hashedPassword;
    }

    if (Object.keys(expressionAttributeValues).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateExpression = updateExpression.slice(0, -1);

    const updatedData = await docClient.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { id: req.user.id },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    }));

    const { password: _, ...userWithoutPassword } = updatedData.Attributes;
    res.json(userWithoutPassword);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
