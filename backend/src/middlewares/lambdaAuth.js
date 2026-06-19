const { CognitoJwtVerifier } = require('aws-jwt-verify');

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse: 'id',
  clientId: process.env.COGNITO_CLIENT_ID,
});

const formatResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  },
  body: JSON.stringify(body),
});

const withAuth = (handler) => async (event, context) => {
  try {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader) {
      return formatResponse(401, { status: 'error', message: 'Akses ditolak. Token tidak ditemukan.' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return formatResponse(401, { status: 'error', message: 'Format token tidak valid.' });
    }

    const token = parts[1];
    const payload = await verifier.verify(token);

    const req = {
      user: {
        userId: payload.sub,
        email: payload.email,
        name: payload.name || payload.email,
      },
      body: event.body ? JSON.parse(event.body) : {},
      params: event.pathParameters || {},
      query: event.queryStringParameters || {},
      app: {
        get: (key) => {
            if(key === 'dynamodb') return require('../lib/dynamodb').dynamodb;
            if(key === 'TABLES') return require('../lib/dynamodb').TABLES;
        }
      }
    };

    let finalResponse;
    const res = {
      status: (code) => ({
        json: (data) => { finalResponse = formatResponse(code, data); return finalResponse; }
      }),
      json: (data) => { finalResponse = formatResponse(200, data); return finalResponse; }
    };

    await handler(req, res);

    return finalResponse;

  } catch (error) {
    console.error('Auth/Handler error:', error);
    if (error.name === 'JwtExpiredError' || error.name === 'JwtInvalidSignatureError' || error.name === 'JwtInvalidIssuerError' || error.name === 'JwtInvalidAudienceError') {
      return formatResponse(401, { status: 'error', message: 'Token tidak valid atau kedaluwarsa.' });
    }
    return formatResponse(500, { status: 'error', message: 'Internal Server Error' });
  }
};

const withPublic = (handler) => async (event, context) => {
  try {
    const req = {
      body: event.body ? JSON.parse(event.body) : {},
      params: event.pathParameters || {},
      query: event.queryStringParameters || {},
    };

    let finalResponse;
    const res = {
      status: (code) => ({
        json: (data) => { finalResponse = formatResponse(code, data); return finalResponse; }
      }),
      json: (data) => { finalResponse = formatResponse(200, data); return finalResponse; }
    };

    await handler(req, res);

    return finalResponse;
  } catch (error) {
    console.error('Public handler error:', error);
    return formatResponse(500, { status: 'error', message: 'Internal Server Error' });
  }
};

module.exports = { withAuth, withPublic, formatResponse };
