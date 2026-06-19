const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { PutCommand, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { authenticate, generateToken } = require('../middlewares/auth');

function getDynamodb(req) {
  return req.app.get('dynamodb');
}
function getTables(req) {
  return req.app.get('TABLES');
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ status: 'error', message: 'Name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ status: 'error', message: 'Password must be at least 6 characters.' });
    }

    const dynamodb = getDynamodb(req);
    const tables = getTables(req);

    const existing = await dynamodb.send(
      new QueryCommand({
        TableName: tables.USERS,
        IndexName: 'email-index',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: { ':email': email },
      })
    );

    if (existing.Items.length > 0) {
      return res.status(409).json({ status: 'error', message: 'An account with this email already exists.' });
    }

    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);

    await dynamodb.send(
      new PutCommand({
        TableName: tables.USERS,
        Item: {
          userId,
          email,
          name,
          password: hashedPassword,
          createdAt: new Date().toISOString(),
        },
      })
    );

    const token = generateToken({ userId, email });

    res.status(201).json({
      token,
      user: { id: userId, name, email },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ status: 'error', message: 'Registration failed.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ status: 'error', message: 'Email and password are required.' });
    }

    const dynamodb = getDynamodb(req);
    const tables = getTables(req);

    const lookup = await dynamodb.send(
      new QueryCommand({
        TableName: tables.USERS,
        IndexName: 'email-index',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: { ':email': email },
      })
    );

    if (!lookup.Items || lookup.Items.length === 0) {
      return res.status(401).json({ status: 'error', message: 'Invalid email or password.' });
    }

    const result = await dynamodb.send(
      new GetCommand({
        TableName: tables.USERS,
        Key: { userId: lookup.Items[0].userId },
      })
    );

    const user = result.Item;
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ status: 'error', message: 'Invalid email or password.' });
    }

    const token = generateToken({ userId: user.userId, email: user.email });

    res.json({
      token,
      user: { id: user.userId, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ status: 'error', message: 'Login failed.' });
  }
});

router.get('/profile', authenticate, async (req, res) => {
  try {
    const dynamodb = getDynamodb(req);
    const tables = getTables(req);

    const result = await dynamodb.send(
      new GetCommand({
        TableName: tables.USERS,
        Key: { userId: req.user.userId },
      })
    );

    const user = result.Item;
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found.' });
    }

    res.json({
      user: { id: user.userId, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch profile.' });
  }
});

module.exports = router;
