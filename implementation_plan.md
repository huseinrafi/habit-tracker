# Fitur Login & Register dengan AWS Cognito & True Serverless Refactor

Sesuai permintaan, kita akan mengubah arsitektur backend menjadi **"True Serverless"** (1 Endpoint = 1 Fungsi Lambda) dan menambahkan autentikasi menggunakan **AWS Cognito**.

## Background & Analisis Kondisi Saat Ini

### Apa yang sudah ada:
- **Monolithic Lambda** (`src/app.js`) — Semua route dikendalikan oleh Express.js di dalam satu fungsi Lambda.
- **Auth middleware** ([auth.js](file:///home/ngabhuss/Documents/Project_CCS/habit-tracker/backend/src/middlewares/auth.js)) — di-bypass dengan hardcoded dummy user.
- **DynamoDB Users table** (`HabitTracker_Users`) — sudah ada.
- **Frontend API interceptor** ([api.js](file:///home/ngabhuss/Documents/Project_CCS/habit-tracker/frontend/src/api/api.js#L12-L21)) — sudah mengirim `Bearer token`.
- **Data isolation by design** — Semua tabel DynamoDB menggunakan `userId` sebagai partition key.

### Perubahan Arsitektur 1: Monolithic → Micro-Lambdas ("True Serverless")

Dosen Anda benar, arsitektur yang ideal untuk Serverless adalah memecah rute-rute menjadi fungsi-fungsi independen.

| Aspek | Sebelumnya (Monolith) | Sekarang (Micro-Lambdas) |
|-------|-----------------------|--------------------------|
| **Routing** | Express.js (`app.use()`, `router.get()`) | API Gateway + `serverless.yml` events |
| **Handlers** | Middleware Express → Controller | Standalone Lambda Handlers (menggabungkan middleware manual) |
| **Fungsi Lambda** | 1 (`habit-tracker-api`) | ~11 (Satu untuk setiap API action) |

### Perubahan Arsitektur 2: Custom JWT → AWS Cognito

| Aspek | Sebelumnya (Custom) | Sekarang (Cognito) |
|-------|---------------------|---------------------|
| **User management** | DynamoDB `HabitTracker_Users` + bcrypt | AWS Cognito User Pool |
| **Token generation** | Custom JWT (`jsonwebtoken`) | Cognito-issued JWT (ID/Access token) |
| **Token verification** | `jsonwebtoken.verify()` | `aws-jwt-verify` (official AWS lib) |
| **Auth flow (frontend)** | Custom API call → simpan token manual | `aws-amplify/auth` (`signIn`, `signUp`) |

---

## Proposed Changes

### Phase 1: AWS Infrastructure — Cognito User Pool & Region

#### [MODIFY] [serverless.yml](file:///home/ngabhuss/Documents/Project_CCS/habit-tracker/backend/serverless.yml)

Ubah region ke `us-east-1` dan tambahkan Cognito resources. Matikan email verification (`AutoVerifiedAttributes` kosong).

```yaml
provider:
  name: aws
  runtime: nodejs22.x
  stage: ${opt:stage, 'dev'}
  region: us-east-1 # Region diubah sesuai permintaan
  # ... environment variables lainnya ...
  environment:
    COGNITO_USER_POOL_ID: !Ref CognitoUserPool
    COGNITO_CLIENT_ID: !Ref CognitoUserPoolClient

# Di section resources.Resources:
CognitoUserPool:
  Type: AWS::Cognito::UserPool
  Properties:
    UserPoolName: HabitTracker-UserPool-${self:provider.stage}
    UsernameAttributes:
      - email
    # AutoVerifiedAttributes DIHAPUS (Email verification disable)
    Policies:
      PasswordPolicy:
        MinimumLength: 8
        RequireUppercase: true
        RequireLowercase: true
        RequireNumbers: true
        RequireSymbols: false
    Schema:
      - Name: name
        AttributeDataType: String
        Mutable: true
        Required: false

CognitoUserPoolClient:
  Type: AWS::Cognito::UserPoolClient
  Properties:
    ClientName: HabitTracker-Client-${self:provider.stage}
    UserPoolId: !Ref CognitoUserPool
    GenerateSecret: false
    ExplicitAuthFlows:
      - ALLOW_USER_SRP_AUTH
      - ALLOW_USER_PASSWORD_AUTH
      - ALLOW_REFRESH_TOKEN_AUTH
    PreventUserExistenceErrors: ENABLED

# Tambahkan API Gateway HTTP API setup for CORS
  httpApi:
    cors:
      allowedOrigins:
        - http://localhost:5173
        - !Sub http://${WebBucket}.s3-website-${AWS::Region}.amazonaws.com
      allowedHeaders:
        - Content-Type
        - Authorization
      allowedMethods:
        - GET
        - POST
        - PUT
        - DELETE
```

---

### Phase 2: Backend — "True Serverless" Refactoring

Kita akan membongkar Express dan mengekspos setiap fungsi controller sebagai Lambda handler langsung.

#### 1. Wrapper Handler dengan Token Verification

Kita perlu membuat wrapper yang akan melakukan verifikasi token sebelum mengeksekusi logika bisnis (mirip dengan middleware Express).

[NEW] `backend/src/middlewares/lambdaAuth.js`:
```javascript
const { CognitoJwtVerifier } = require('aws-jwt-verify');

// Initialize verifier ONCE (outside handler for Lambda caching)
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse: 'id',
  clientId: process.env.COGNITO_CLIENT_ID,
});

// Helper untuk format API Gateway HTTP API response
const formatResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*', // Biarkan API GW yang handle CORS secara presisi, atau fallback ke * jika perlu
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

    // Mock Express req object untuk kompatibilitas controller lama
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

    // Mock Express res object
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

module.exports = { withAuth, formatResponse };
```

#### 2. Ekspor Individual Handlers

[NEW] `backend/src/handlers.js`:
File ini akan mengimpor controller lama dan membungkusnya dengan `withAuth`.

```javascript
const { withAuth, formatResponse } = require('./middlewares/lambdaAuth');
const taskController = require('./controllers/taskController');
const habitController = require('./controllers/habitController');
const dashboardController = require('./controllers/dashboardController');

// Helper wrapper untuk public routes
const withPublic = (handler) => async (event, context) => {
    // Sama seperti withAuth mock req/res, tanpa verifikasi token
    // ...
}

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

// Auth Me Endpoint
module.exports.getProfile = withAuth(async (req, res) => {
  res.json({
    status: 'success',
    data: { userId: req.user.userId, email: req.user.email, name: req.user.name },
  });
});
```
*(Kita juga harus memisahkan upload logic menjadi standalone function).*

#### 3. Update `serverless.yml` Functions

Ganti blok `functions` yang tadinya cuma 1 `api`:

```yaml
functions:
  createTask:
    handler: src/handlers.createTask
    events:
      - httpApi:
          path: /api/tasks
          method: POST
  getAllTasks:
    handler: src/handlers.getAllTasks
    events:
      - httpApi:
          path: /api/tasks
          method: GET
  updateTask:
    handler: src/handlers.updateTask
    events:
      - httpApi:
          path: /api/tasks/{id}
          method: PUT
  deleteTask:
    handler: src/handlers.deleteTask
    events:
      - httpApi:
          path: /api/tasks/{id}
          method: DELETE
  # ... lanjutkan untuk Habits, Dashboard, Profile, Uploads, Health ...
```

#### 4. Cleanup
Hapus `src/app.js`, `src/routes/*`, paket `express`, `serverless-http`, `cors`, dan `jsonwebtoken`. Instal `aws-jwt-verify`.

---

### Phase 3: Frontend — AWS Amplify Auth SDK (Tanpa Email Verifikasi)

Karena `AutoVerifiedAttributes` dimatikan di Cognito (poin permintaan #1), user akan otomatis dikonfirmasi atau kita setting "Admin Confirm" yang otomatis jalan di pre-sign-up lambda trigger. Cara termudah mematikan konfirmasi email via serverless yml adalah tidak mendeclare auto verify dan mengirimkan parameter tertentu saat signUp, atau kita harus menambahkan Lambda Trigger `PreSignUp` untuk auto-confirm user.

**Lebih baik kita tambahkan PreSignUp Lambda Trigger** agar akun langsung terkonfirmasi tanpa verifikasi email.

#### 1. Tambah Auto-Confirm Lambda (Backend)

[NEW] `backend/src/handlers/autoConfirmUser.js`
```javascript
module.exports.handler = async (event, context) => {
    // Auto confirm the user so they don't need email verification
    event.response.autoConfirmUser = true;
    event.response.autoVerifyEmail = true;
    return event;
};
```

Update `serverless.yml` untuk trigger ini:
```yaml
functions:
  autoConfirmUser:
    handler: src/handlers/autoConfirmUser.handler

resources:
  Resources:
    CognitoUserPool:
      Properties:
        LambdaConfig:
          PreSignUp: !GetAtt AutoConfirmUserLambdaFunction.Arn # Referensi ke function di atas
```
*(Perhatikan bahwa IAM dan permission juga perlu disesuaikan untuk Cognito invoke Lambda).*

#### 2. Frontend Config & Dependencies

Install dependencies:
```bash
cd frontend && npm install aws-amplify
```

Ubah environment variable di `.env`:
```env
VITE_API_URL=https://<api_id>.execute-api.us-east-1.amazonaws.com/api
VITE_COGNITO_USER_POOL_ID=<akan diisi setelah deploy>
VITE_COGNITO_CLIENT_ID=<akan diisi setelah deploy>
```

#### 3. Frontend Login & Register UI

**`LoginPage.jsx` & `RegisterPage.jsx`**
Sama seperti plan sebelumnya: Desain identik dengan SettingsView.
Flow Register langsung memanggil `signIn` setelah `signUp` berhasil, karena user otomatis terkonfirmasi.

```javascript
// Di RegisterPage.jsx
const handleRegister = async (email, password, name) => {
  await signUp({
    username: email,
    password,
    options: { userAttributes: { name } },
  });
  // Auto confirm jalan di backend, jadi langsung login
  await login(email, password); 
};
```

#### 4. Frontend State Management & API Interceptor

- **Store**: Tambah `aws-amplify/auth` untuk login/logout/session.
- **API Interceptor**: Gunakan `fetchAuthSession()` untuk menempelkan Bearer token di headers, sama persis dengan plan sebelumnya.

---

## User Review Required

Tidak ada pertanyaan terbuka, konfigurasi ini sepenuhnya memenuhi permintaan Anda:
1. Verifikasi email di-disable (menggunakan PreSignUp Lambda Trigger auto-confirm).
2. Region diset ke `us-east-1`
3. Cognito default policy digunakan (minimal 8 char, angka, huruf besar/kecil).
4. Arsitektur direfactor menjadi "True Serverless" (1 Endpoint = 1 Fungsi Lambda), tidak menggunakan Express lagi.

Silahkan berikan `approval` atau feedback agar saya bisa mulai eksekusi modifikasi kodenya.
