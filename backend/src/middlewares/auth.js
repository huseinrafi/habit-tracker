const jwt = require('jsonwebtoken');
const { GetCommand, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const authenticate = async (req, res, next) => {
  if (process.env.NODE_ENV === 'development' || process.env.IS_OFFLINE === 'true') {
    const dummyUserId = '00000000-0000-0000-0000-000000000001';
    req.user = { userId: dummyUserId, email: 'test@developer.local' };
    console.log('[DEV] Auth Bypassed: Injecting Dummy User ID');
    return next();
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        status: 'error',
        message: 'Akses ditolak. Token tidak ditemukan.',
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        status: 'error',
        message: 'Format token tidak valid. Gunakan: Bearer <token>',
      });
    }

    const token = parts[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token telah kedaluwarsa. Silakan login kembali.',
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token tidak valid.',
      });
    }
    return res.status(401).json({
      status: 'error',
      message: 'Autentikasi gagal.',
    });
  }
};

const generateToken = (payload, expiresIn = '7d') => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

module.exports = { authenticate, generateToken, JWT_SECRET };
