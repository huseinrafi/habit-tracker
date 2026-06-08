const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Authentication Middleware
 *
 * Validates the JWT token from the `Authorization: Bearer <token>` header.
 * On success, attaches the decoded payload to `req.user` (contains at least `userId`).
 * On failure, returns a 401 Unauthorized response.
 *
 * Usage:
 *   const { authenticate } = require('./middlewares/auth');
 *   router.get('/protected', authenticate, (req, res) => { ... });
 */
const authenticate = (req, res, next) => {
  try {
    // ─── 1. Extract token from Authorization header ──────────────────────
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        status: 'error',
        message: 'Akses ditolak. Token tidak ditemukan.',
      });
    }

    // Expect format: "Bearer <token>"
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        status: 'error',
        message: 'Format token tidak valid. Gunakan: Bearer <token>',
      });
    }

    const token = parts[1];

    // ─── 2. Verify token & attach payload to req.user ────────────────────
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = {
      userId: decoded.userId,
      email: decoded.email,   // optional, available if included at sign-in
    };

    next();
  } catch (error) {
    // ─── 3. Handle specific JWT errors ───────────────────────────────────
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

/**
 * Helper: Generate a JWT token (useful in auth controllers)
 *
 * @param {Object} payload - Data to encode (e.g. { userId, email })
 * @param {string} expiresIn - Token lifetime (default: '7d')
 * @returns {string} Signed JWT token
 */
const generateToken = (payload, expiresIn = '7d') => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

module.exports = { authenticate, generateToken, JWT_SECRET };
