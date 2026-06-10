# Deploy Habit Tracker ke AWS (Lambda + S3 + DynamoDB + CloudFront)

## Arsitektur

```
S3 Static Website (Frontend)
  └── API Gateway
        └── Lambda Function (Backend — single self-contained handler)
              ├── DynamoDB (Tables: users, tasks, habits, habit_logs)
              └── S3 (Uploads via pre-signed URL)
```

---

## ⚠️ Catatan untuk AWS Student Voclabs

| Aspek                     | Voclabs                                         | Solusi                                        |
| ------------------------- | ----------------------------------------------- | --------------------------------------------- |
| **Region**          | Cek dengan `aws configure list \| grep region` |                                               |
| **Credentials**     | Sudah terisi otomatis                           | Cek:`aws sts get-caller-identity`           |
| **IAM**             | Tidak bisa buat role                            | Pakai default role yang dibuat Console        |
| **CloudFront**      | Sering diblokir                                 | Pakai**S3 Static Website Hosting**      |
| **Session expired** | Kredensial hilang setelah lab                   | Simpan endpoint URL. Deploy ulang di lab baru |

```bash
# Cek region
aws configure list | grep region
export AWS_REGION=us-east-1   # ganti sesuai punyamu
```

---

## Prasyarat

1. Terminal Voclabs (AWS CLI siap pakai)
2. Node.js v20+ (`node -v`)
3. Browser — buka https://console.aws.amazon.com

---

## 1. Setup DynamoDB

Buat 4 tabel via **AWS Console** (lebih aman untuk Voclabs) atau CLI.

### Via AWS Console

Buka **DynamoDB** → **Tables** → **Create table**:

| Nama Tabel                   | Partition Key   | GSI                                               |
| ---------------------------- | --------------- | ------------------------------------------------- |
| `habit-tracker-users`      | `id` (String) | `email-index` → `email` (String) — optional |
| `habit-tracker-tasks`      | `id` (String) | `userId-index` → `userId` (String)           |
| `habit-tracker-habits`     | `id` (String) | `userId-index` → `userId` (String)           |
| `habit-tracker-habit-logs` | `id` (String) | `habitId-index` → `habitId` (String)         |

Semua pakai **On-demand** (PAY_PER_REQUEST).

### Via AWS CLI

```bash
aws dynamodb create-table --table-name habit-tracker-users \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST --region $AWS_REGION

aws dynamodb create-table --table-name habit-tracker-tasks \
  --attribute-definitions AttributeName=id,AttributeType=S AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --global-secondary-indexes "[{\"IndexName\":\"userId-index\",\"KeySchema\":[{\"AttributeName\":\"userId\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" \
  --billing-mode PAY_PER_REQUEST --region $AWS_REGION

aws dynamodb create-table --table-name habit-tracker-habits \
  --attribute-definitions AttributeName=id,AttributeType=S AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --global-secondary-indexes "[{\"IndexName\":\"userId-index\",\"KeySchema\":[{\"AttributeName\":\"userId\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" \
  --billing-mode PAY_PER_REQUEST --region $AWS_REGION

aws dynamodb create-table --table-name habit-tracker-habit-logs \
  --attribute-definitions AttributeName=id,AttributeType=S AttributeName=habitId,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --global-secondary-indexes "[{\"IndexName\":\"habitId-index\",\"KeySchema\":[{\"AttributeName\":\"habitId\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" \
  --billing-mode PAY_PER_REQUEST --region $AWS_REGION
```

---

## 2. S3 Bucket untuk Upload File

```bash
UNIQ=$(openssl rand -hex 4)
UPLOAD_BUCKET="habit-tracker-uploads-$UNIQ"

aws s3 mb s3://$UPLOAD_BUCKET --region $AWS_REGION

aws s3api put-public-access-block --bucket $UPLOAD_BUCKET \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

aws s3api put-bucket-cors --bucket $UPLOAD_BUCKET \
  --cors-configuration '{"CORSRules":[{"AllowedOrigins":["*"],"AllowedMethods":["PUT"],"AllowedHeaders":["Content-Type"],"MaxAgeSeconds":3600}]}'

echo "Upload bucket: $UPLOAD_BUCKET"
```

---

## 3. Buat Lambda Function (Backend Baru dari NOL)

Kita buat Lambda **langsung dari AWS Console** — tanpa Express, tanpa npm, tanpa folder backend. Cukup satu file JavaScript yang bisa dicopas.

### 3a. Buat Function

1. Buka **AWS Console** → **Lambda** → **Create function**
2. **Author from scratch**
3. Name: `habit-tracker-api`
4. Runtime: **Node.js 20.x**
5. Architecture: **x86_64**
6. Permissions: pilih **"Create a new role with basic Lambda permissions"**
7. **Create**

### 3b. Paste Kode Berikut

Di tab **Code**, hapus code default, lalu paste kode di bawah ini, lalu klik **Deploy**:

```javascript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

const REGION = process.env.AWS_REGION || 'us-east-1';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE || 'habit-tracker-users';
const TASKS_TABLE = process.env.DYNAMODB_TASKS_TABLE || 'habit-tracker-tasks';
const HABITS_TABLE = process.env.DYNAMODB_HABITS_TABLE || 'habit-tracker-habits';
const LOGS_TABLE = process.env.DYNAMODB_HABIT_LOGS_TABLE || 'habit-tracker-habit-logs';
const UPLOAD_BUCKET = process.env.UPLOAD_S3_BUCKET || '';
const FRONTEND_URL = process.env.FRONTEND_URL || '*';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const s3 = new S3Client({ region: REGION });

// ─── Helpers ────────────────────────────────────────────────────────────────

const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

const verifyPassword = (password, stored) => {
  const [salt, hash] = stored.split(':');
  return crypto.scryptSync(password, salt, 64).toString('hex') === hash;
};

const signToken = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 604800 })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
};

const verifyToken = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${parts[0]}.${parts[1]}`).digest('base64url');
    if (sig !== parts[2]) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
};

const response = (statusCode, body, origin) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin || FRONTEND_URL,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  },
  body: JSON.stringify(body),
});

const getUserId = (event) => {
  const auth = event.headers?.authorization || event.headers?.Authorization || '';
  const token = auth.replace('Bearer ', '');
  const payload = verifyToken(token);
  return payload?.userId || null;
};

const getBody = (event) => {
  if (!event.body) return {};
  try { return JSON.parse(event.body); } catch { return {}; }
};

// ─── Auth Handlers ──────────────────────────────────────────────────────────

async function handleRegister(event) {
  const { name, email, password } = getBody(event);
  if (!name || !email || !password) return response(400, { message: 'Name, email, and password are required.' });

  const existing = await ddb.send(new QueryCommand({
    TableName: USERS_TABLE, IndexName: 'email-index',
    KeyConditionExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email },
  })).catch(() => ({ Items: [] }));

  if (existing.Items?.length > 0) return response(409, { message: 'Email already registered.' });

  const id = uuid();
  await ddb.send(new PutCommand({
    TableName: USERS_TABLE,
    Item: { id, email, name, password: hashPassword(password), createdAt: now(), updatedAt: now() },
  }));

  return response(201, { token: signToken({ userId: id, email }), user: { id, name, email } });
}

async function handleLogin(event) {
  const { email, password } = getBody(event);
  if (!email || !password) return response(400, { message: 'Email and password are required.' });

  const result = await ddb.send(new QueryCommand({
    TableName: USERS_TABLE, IndexName: 'email-index',
    KeyConditionExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email },
  })).catch(() => ({ Items: [] }));

  const user = result.Items?.[0];
  if (!user || !verifyPassword(password, user.password)) return response(401, { message: 'Invalid email or password.' });

  return response(200, { token: signToken({ userId: user.id, email: user.email }), user: { id: user.id, name: user.name, email: user.email } });
}

async function handleProfile(event) {
  const userId = getUserId(event);
  if (!userId) return response(401, { message: 'Unauthorized' });

  const user = await ddb.send(new GetCommand({ TableName: USERS_TABLE, Key: { id: userId } })).catch(() => ({}));
  if (!user.Item) return response(404, { message: 'User not found.' });

  return response(200, { user: { id: user.Item.id, name: user.Item.name, email: user.Item.email } });
}

// ─── Task Handlers ──────────────────────────────────────────────────────────

async function handleGetTasks(event) {
  const userId = getUserId(event);
  if (!userId) return response(401, { message: 'Unauthorized' });
  const result = await ddb.send(new QueryCommand({ TableName: TASKS_TABLE, IndexName: 'userId-index', KeyConditionExpression: 'userId = :uid', ExpressionAttributeValues: { ':uid': userId } }));
  return response(200, { data: result.Items || [] });
}

async function handleCreateTask(event) {
  const userId = getUserId(event);
  if (!userId) return response(401, { message: 'Unauthorized' });
  const body = getBody(event);
  const task = { id: uuid(), userId, title: body.title, startDate: body.startDate, endDate: body.endDate, type: body.type || 'OFFICE', repeatableType: body.repeatableType || 'disable', attachmentUrl: body.attachmentUrl || null, completedAt: null, createdAt: now(), updatedAt: now() };
  await ddb.send(new PutCommand({ TableName: TASKS_TABLE, Item: task }));
  return response(201, { data: task });
}

async function handleUpdateTask(event) {
  const userId = getUserId(event);
  if (!userId) return response(401, { message: 'Unauthorized' });
  const id = event.pathParameters?.id || event.path?.split('/').pop();
  const body = getBody(event);
  const updates = []; const expAttr = {}; const names = {};
  Object.entries(body).forEach(([k, v]) => { updates.push(`#${k} = :${k}`); names[`#${k}`] = k; expAttr[`:${k}`] = v; });
  updates.push('#updatedAt = :updatedAt'); names['#updatedAt'] = 'updatedAt'; expAttr[':updatedAt'] = now();
  if (!updates.length) return response(400, { message: 'No fields to update' });
  await ddb.send(new UpdateCommand({ TableName: TASKS_TABLE, Key: { id }, UpdateExpression: `SET ${updates.join(', ')}`, ExpressionAttributeNames: names, ExpressionAttributeValues: expAttr }));
  return response(200, { message: 'Task updated' });
}

async function handleDeleteTask(event) {
  const userId = getUserId(event);
  if (!userId) return response(401, { message: 'Unauthorized' });
  const id = event.pathParameters?.id || event.path?.split('/').pop();
  await ddb.send(new DeleteCommand({ TableName: TASKS_TABLE, Key: { id } }));
  return response(200, { message: 'Task deleted' });
}

// ─── Habit Handlers ─────────────────────────────────────────────────────────

async function handleGetHabits(event) {
  const userId = getUserId(event);
  if (!userId) return response(401, { message: 'Unauthorized' });
  const result = await ddb.send(new QueryCommand({ TableName: HABITS_TABLE, IndexName: 'userId-index', KeyConditionExpression: 'userId = :uid', ExpressionAttributeValues: { ':uid': userId } }));
  const habits = result.Items || [];
  for (const habit of habits) {
    const logs = await ddb.send(new QueryCommand({ TableName: LOGS_TABLE, IndexName: 'habitId-index', KeyConditionExpression: 'habitId = :hid', ExpressionAttributeValues: { ':hid': habit.id } }));
    habit.logs = logs.Items || [];
  }
  return response(200, { data: habits });
}

async function handleCreateHabit(event) {
  const userId = getUserId(event);
  if (!userId) return response(401, { message: 'Unauthorized' });
  const body = getBody(event);
  const habit = { id: uuid(), userId, title: body.title, type: body.type || 'general', repeatableType: body.repeatableType || 'daily', createdAt: now(), updatedAt: now() };
  await ddb.send(new PutCommand({ TableName: HABITS_TABLE, Item: habit }));
  return response(201, { data: habit });
}

async function handleDeleteHabit(event) {
  const userId = getUserId(event);
  if (!userId) return response(401, { message: 'Unauthorized' });
  const id = event.pathParameters?.id || event.path?.split('/').pop();
  await ddb.send(new DeleteCommand({ TableName: HABITS_TABLE, Key: { id } }));
  return response(200, { message: 'Habit deleted' });
}

async function handleCheckHabit(event) {
  const userId = getUserId(event);
  if (!userId) return response(401, { message: 'Unauthorized' });
  const id = event.pathParameters?.id || event.path?.split('/').pop();
  const body = getBody(event);
  await ddb.send(new PutCommand({ TableName: LOGS_TABLE, Item: { id: uuid(), habitId: id, dateCompleted: body.dateCompleted || now(), createdAt: now() } }));
  return response(200, { message: 'Habit checked' });
}

// ─── Dashboard Handlers ─────────────────────────────────────────────────────

async function handleGetStreak(event) {
  const userId = getUserId(event);
  if (!userId) return response(401, { message: 'Unauthorized' });
  const result = await ddb.send(new QueryCommand({ TableName: HABITS_TABLE, IndexName: 'userId-index', KeyConditionExpression: 'userId = :uid', ExpressionAttributeValues: { ':uid': userId } }));
  const habits = result.Items || [];
  let maxStreak = 0;
  const habitStreaks = [];
  for (const habit of habits) {
    const logs = await ddb.send(new QueryCommand({ TableName: LOGS_TABLE, IndexName: 'habitId-index', KeyConditionExpression: 'habitId = :hid', ExpressionAttributeValues: { ':hid': habit.id } }));
    const dates = [...new Set((logs.Items || []).map(l => l.dateCompleted?.split('T')[0]))].sort().reverse();
    let streak = 0;
    for (let i = 0; i < dates.length; i++) {
      const expected = new Date(); expected.setDate(expected.getDate() - i);
      if (dates[i] === expected.toISOString().split('T')[0]) streak++; else break;
    }
    maxStreak = Math.max(maxStreak, streak);
    habitStreaks.push({ habitId: habit.id, title: habit.title, currentStreak: streak });
  }
  return response(200, { data: { summary: { maxStreak }, habits: habitStreaks } });
}

async function handleGetAnalytics(event) {
  const userId = getUserId(event);
  if (!userId) return response(401, { message: 'Unauthorized' });
  const result = await ddb.send(new QueryCommand({ TableName: HABITS_TABLE, IndexName: 'userId-index', KeyConditionExpression: 'userId = :uid', ExpressionAttributeValues: { ':uid': userId } }));
  const habits = result.Items || [];
  const getWeekRange = (weekOffset) => {
    const now = new Date(); const day = now.getDay(); const diff = now.getDate() - day + (day === 0 ? -6 : 1) + (weekOffset * 7);
    const monday = new Date(now.setDate(diff)); monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday); sunday.setDate(sunday.getDate() + 7);
    return { start: monday.toISOString(), end: sunday.toISOString() };
  };
  const week = getWeekRange(0);
  let total = 0; let done = 0;
  for (const habit of habits) {
    const logs = await ddb.send(new QueryCommand({ TableName: LOGS_TABLE, IndexName: 'habitId-index', KeyConditionExpression: 'habitId = :hid', ExpressionAttributeValues: { ':hid': habit.id } }));
    const weekLogs = (logs.Items || []).filter(l => l.dateCompleted >= week.start && l.dateCompleted < week.end);
    total += 7; done += weekLogs.length;
  }
  return response(200, { data: { habits: { thisWeek: { percentage: total ? Math.round((done / total) * 100) : 0 } } } });
}

// ─── Upload Handler (Pre-signed URL) ────────────────────────────────────────

async function handleUpload(event) {
  const userId = getUserId(event);
  if (!userId) return response(401, { message: 'Unauthorized' });
  const body = getBody(event);
  const key = `uploads/${userId}/${uuid()}-${body.fileName || 'file'}`;
  const command = new PutObjectCommand({ Bucket: UPLOAD_BUCKET, Key: key, ContentType: body.contentType || 'application/octet-stream' });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
  return response(200, { uploadUrl, publicUrl: `https://${UPLOAD_BUCKET}.s3.${REGION}.amazonaws.com/${key}` });
}

// ─── Router ─────────────────────────────────────────────────────────────────

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod;
  const path = event.requestContext?.http?.path || event.path || '';
  const origin = event.headers?.origin || event.headers?.Origin || FRONTEND_URL;

  if (method === 'OPTIONS') return response(204, null, origin);

  const route = `${method} ${path}`;

  try {
    if (route === 'GET /api/health-check' || route === 'GET /api/health')
      return response(200, { status: 'connected', message: 'Backend is ready!' });

    if (route === 'POST /api/auth/register') return await handleRegister(event);
    if (route === 'POST /api/auth/login') return await handleLogin(event);
    if (route === 'GET /api/auth/profile') return await handleProfile(event);

    if (route === 'GET /api/tasks') return await handleGetTasks(event);
    if (route === 'POST /api/tasks') return await handleCreateTask(event);
    if (method === 'PUT' && path.match(/^\/api\/tasks\/[\w-]+$/)) return await handleUpdateTask(event);
    if (method === 'DELETE' && path.match(/^\/api\/tasks\/[\w-]+$/)) return await handleDeleteTask(event);

    if (route === 'GET /api/habits') return await handleGetHabits(event);
    if (route === 'POST /api/habits') return await handleCreateHabit(event);
    if (method === 'DELETE' && path.match(/^\/api\/habits\/[\w-]+$/)) return await handleDeleteHabit(event);
    if (method === 'POST' && path.match(/^\/api\/habits\/[\w-]+\/(log|check)$/)) return await handleCheckHabit(event);

    if (route === 'GET /api/dashboard/streak') return await handleGetStreak(event);
    if (route === 'GET /api/dashboard/analytics') return await handleGetAnalytics(event);

    if ((route === 'POST /api/upload' || path === '/api/upload') && method === 'POST') return await handleUpload(event);

    return response(404, { error: 'Route not found' }, origin);
  } catch (err) {
    console.error('Lambda error:', err);
    return response(500, { error: 'Internal server error', message: err.message }, origin);
  }
};
```

### 3c. Runtime Settings

Setelah deploy code, atur **Configuration** → **General configuration** → **Edit**:

- Timeout: **30 detik**
- Memory: **256 MB**

### 3d. Environment Variables

**Configuration** → **Environment variables** → **Edit**:

| Key                           | Value                                                    |
| ----------------------------- | -------------------------------------------------------- |
| `AWS_REGION`                | `$AWS_REGION`                                          |
| `DYNAMODB_USERS_TABLE`      | `habit-tracker-users`                                  |
| `DYNAMODB_TASKS_TABLE`      | `habit-tracker-tasks`                                  |
| `DYNAMODB_HABITS_TABLE`     | `habit-tracker-habits`                                 |
| `DYNAMODB_HABIT_LOGS_TABLE` | `habit-tracker-habit-logs`                             |
| `UPLOAD_S3_BUCKET`          | `habit-tracker-uploads-<UNIQ>`                         |
| `JWT_SECRET`                | Hasil dari:`openssl rand -hex 32`                      |
| `FRONTEND_URL`              | `*` (sementara, nanti diganti setelah deploy frontend) |

### 3e. Izin DynamoDB & S3

1. **Configuration** → **Permissions** → Klik **role name** (buka tab IAM)
2. **Add permissions** → **Create inline policy**
3. Paste JSON ini:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem","dynamodb:PutItem","dynamodb:UpdateItem","dynamodb:DeleteItem","dynamodb:Query","dynamodb:Scan"],
      "Resource": "arn:aws:dynamodb:*:*:table/habit-tracker-*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject","s3:PutObjectAcl"],
      "Resource": "arn:aws:s3:::habit-tracker-uploads-*/*"
    }
  ]
}
```

Beri nama `DynamoS3Access` → **Create policy**.

### 3f. Integrasi API Gateway

1. **Configuration** → **Triggers** → **Add trigger**
2. Pilih **API Gateway**
3. **Create an HTTP API**
4. Security: **Open**
5. **Add**

Catat endpoint URL:

```
https://xxxxxxxxxx.execute-api.$AWS_REGION.amazonaws.com
```

### 3g. Konfigurasi Routes di API Gateway

Buka **API Gateway** → Pilih API yang baru dibuat → **Routes**:

Pastikan route `$default` atau `/{proxy+}` sudah ada (method ANY). Jika belum:

1. **Create** → `ANY /{proxy+}` → Attach ke fungsi Lambda `habit-tracker-api`
2. **Create** → `ANY /` → Attach ke fungsi Lambda

---

## 4. S3 Bucket untuk Frontend

```bash
FRONTEND_BUCKET="habit-tracker-frontend-$UNIQ"
aws s3 mb s3://$FRONTEND_BUCKET --region $AWS_REGION
```

---

## 5. Build & Deploy Frontend

### 5a. Build

```bash
cd frontend
VITE_API_URL=https://xxxxxxxxxx.execute-api.$AWS_REGION.amazonaws.com npm run build
```

### 5b. Upload ke S3 & Aktifkan Static Website

```bash
aws s3 sync dist/ s3://$FRONTEND_BUCKET/ --region $AWS_REGION

aws s3 website s3://$FRONTEND_BUCKET/ --index-document index.html --error-document index.html --region $AWS_REGION

aws s3api put-public-access-block --bucket $FRONTEND_BUCKET \
  --public-access-block-configuration BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false

aws s3api put-bucket-policy --bucket $FRONTEND_BUCKET \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow","Principal":"*","Action":"s3:GetObject",
      "Resource": "arn:aws:s3:::'"${FRONTEND_BUCKET}"'/*"
    }]
  }'

S3_URL="http://${FRONTEND_BUCKET}.s3-website-${AWS_REGION}.amazonaws.com"
echo "Frontend URL: $S3_URL"
```

### 5c. Update CORS di Lambda

1. Buka Lambda → **Configuration** → **Environment variables**
2. Update `FRONTEND_URL` → `http://${FRONTEND_BUCKET}.s3-website-${AWS_REGION}.amazonaws.com`

---

## 6. Uji Coba

```bash
# Health check
curl https://xxxxxxxxxx.execute-api.$AWS_REGION.amazonaws.com/api/health-check

# Register
curl -X POST https://xxxxxxxxxx.execute-api.$AWS_REGION.amazonaws.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"test123"}'
```

Buka `$S3_URL` di browser.

---

## 7. Update Code Lambda

Kode Lambda bisa diedit langsung di Console (inline editor) kapan saja. Setelah edit → **Deploy**.

Jika butuh upload file zip (misal library tambahan):

1. Buat zip: `zip -r function.zip index.js node_modules`
2. Console → **Code** → **Upload from** → **.zip file**

Untuk proyek ini, **tidak perlu** — semua dependency sudah include dari AWS SDK bawaan.

---

## 8. Voclabs Session Expired

| Resource              | Setelah lab selesai                   |
| --------------------- | ------------------------------------- |
| Lambda                | ✅ Tetap jalan                        |
| API Gateway           | ✅ Tetap bisa diakses                 |
| DynamoDB              | ✅ Data tetap ada                     |
| S3 buckets            | ✅ File tetap ada                     |
| **AWS CLI**     | ❌ Perlu lab baru                     |
| **Update code** | ❌ Login Console dengan akun lab baru |

---

## 9. Troubleshooting

| Masalah              | Solusi                                                           |
| -------------------- | ---------------------------------------------------------------- |
| API Gateway 502      | Cek CloudWatch Logs Lambda. Pastikan timeout cukup (30s).        |
| CORS error           | Pastikan `FRONTEND_URL` di env var Lambda sesuai URL S3        |
| pre-signed URL gagal | Cek region S3 dan env `UPLOAD_S3_BUCKET`                       |
| Register gagal       | Pastikan tabel `habit-tracker-users` punya GSI `email-index` |
| Lambda error "buket" | IAM role belum di-update. Tambah inline policy DynamoDB+S3       |
