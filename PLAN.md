# 🏗️ PLAN: Migrasi SQLite → DynamoDB + Deploy ke AWS (Voclab)

## 1. Arsitektur Target

```
                          AWS Cloud (ap-southeast-1)
┌──────────────────────┐      ┌──────────────────────┐      ┌──────────────────────┐
│  S3 Static Website   │      │  API Gateway (v1)    │      │  DynamoDB            │
│  habit-tracker-web   │─────▶│  /api/*              │─────▶│  HabitTracker_Users  │
│  (frontend/dist)     │      │         │            │      │  HabitTracker_Tasks  │
│  index.html = root   │      │    Lambda (Node20)   │      │  HabitTracker_Habits │
│  404 → index.html    │      │    src/app.handler   │      │  HabitTracker_Logs   │
└──────────────────────┘      └──────────┬───────────┘      └──────────────────────┘
                                          │
                                 ┌────────▼────────┐
                                 │  S3 Attachments  │
                                 │  habit-tracker-  │
                                 │  attachments-dev │
                                 │  (presigned URL) │
                                 └─────────────────┘
```

---

## 2. DynamoDB — Multi-Table Design

### 2.1 Tabel `HabitTracker_Users`

| Key | Type | Value |
|-----|------|-------|
| PK | `userId` (S) | UUID user |
| — | — | — |
| GSI | `email-index` (PK: `email`) | Untuk lookup by email |

**Attributes:** `email` (S), `nama` (S), `createdAt` (S – ISO8601), `updatedAt` (S – ISO8601)

### 2.2 Tabel `HabitTracker_Tasks`

| Key | Type | Value |
|-----|------|-------|
| PK | `userId` (S) | — |
| SK | `taskId` (S) | UUID task |

**Attributes:** `title` (S), `startDate` (S – ISO8601), `endDate` (S – ISO8601), `type` (S), `repeatableType` (S), `attachmentUrl` (S? — S3 key), `completedAt` (S? – ISO8601), `createdAt` (S), `updatedAt` (S)

### 2.3 Tabel `HabitTracker_Habits`

| Key | Type | Value |
|-----|------|-------|
| PK | `userId` (S) | — |
| SK | `habitId` (S) | UUID habit |

**Attributes:** `title` (S), `type` (S), `repeatableType` (S – `daily|weekly|monthly`), `createdAt` (S), `updatedAt` (S)

### 2.4 Tabel `HabitTracker_Logs`

| Key | Type | Value |
|-----|------|-------|
| PK | `habitId` (S) | — |
| SK | `dateCompleted#logId` (S) | `2026-06-10#uuid` — range query by date |
| GSI | `userId-date-index` (PK: `userId`, SK: `dateCompleted`) | Dashboard analytics count by date range |

**Attributes:** `dateCompleted` (S – `YYYY-MM-DD`), `createdAt` (S)

### 2.5 Mapping Access Pattern → DynamoDB Query

| Prisma Query | DynamoDB |
|---|---|
| `user.upsert({where:{email}})` | Query GSI `email-index` → jika tidak ada, `PutItem` |
| `task.findMany({where:{userId}})` | `Query` PK=userId, ScanIndexForward=true |
| `task.findFirst({where:{id,userId}})` | `GetItem` PK=userId, SK=taskId |
| `task.update({where:{id}})` | `UpdateItem` PK=userId, SK=taskId |
| `task.delete({where:{id}})` | `DeleteItem` PK=userId, SK=taskId |
| `task.count({where:{userId,startDate,lte,endDate,gte}})` | `Query` PK=userId + `FilterExpression` |
| `habit.findMany({where:{userId}})` | `Query` PK=userId |
| `habit.findFirst({where:{id,userId}})` | `GetItem` PK=userId, SK=habitId |
| `habit.create(...)` | `PutItem` PK=userId, SK=habitId |
| `habit.delete({where:{id}})` | `DeleteItem` PK=userId, SK=habitId + Query Logs → BatchDelete |
| `habitLog.findFirst({where:{habitId,dateCompleted,gte,lte}})` | `Query` PK=habitId, SK `between(dateA, dateB)` |
| `habitLog.create(...)` | `PutItem` PK=habitId, SK=`dateCompleted#logId` |
| `habitLog.delete({where:{id}})` | `DeleteItem` PK=habitId, SK=`dateCompleted#logId` |
| `habitLog.count({where:{habit:{userId},dateCompleted,gte,lte}})` | `Query` GSI `userId-date-index`, PK=userId, SK `between`, `Select=COUNT` |
| `habit.findMany({where:{userId,repeatableType}})` | `Query` PK=userId + `FilterExpression` |

---

## 3. Perubahan File (Backend)

### 3.1 `package.json`
**Tambah:**
```json
"@aws-sdk/client-dynamodb": "^3.1063.0",
"@aws-sdk/lib-dynamodb": "^3.1063.0",
"@aws-sdk/client-s3": "^3.1063.0",
"@aws-sdk/s3-request-presigner": "^3.1063.0"
```
**Hapus:**
```json
"@prisma/client",
"prisma",
"better-sqlite3",
"sqlite3"
```

### 3.2 File Baru: `src/lib/dynamodb.js`
```js
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-southeast-1",
  ...(process.env.DYNAMODB_ENDPOINT && {
    endpoint: process.env.DYNAMODB_ENDPOINT,
  }),
});

const docClient = DynamoDBDocumentClient.from(client);

export const TABLES = {
  USERS: process.env.USERS_TABLE || "HabitTracker_Users",
  TASKS: process.env.TASKS_TABLE || "HabitTracker_Tasks",
  HABITS: process.env.HABITS_TABLE || "HabitTracker_Habits",
  LOGS: process.env.HABIT_LOGS_TABLE || "HabitTracker_Logs",
};

export default docClient;
```

### 3.3 File Baru: `src/lib/s3.js`
```js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.ATTACHMENTS_BUCKET;

export async function generateUploadUrl(key, contentType) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn: 300 }); // 5 menit
}
```

### 3.4 Ubah `src/app.js`
- Hapus `PrismaClient` import dan inisialisasi
- Ganti `app.set('prisma', ...)` → `app.set('dynamodb', docClient)` + `app.set('s3bucket', BUCKET)`
- Hapus static uploads dan multer
- Health check: `ListTables` atau static response
- Tambah `GET /api/upload-url` untuk presigned URL

### 3.5 Ubah `src/middlewares/auth.js`
- Ganti `prisma.user.upsert()` → Query GSI email-index → PutItem

### 3.6 Ubah `src/controllers/habitController.js`
- Semua `prisma.habit.*` → DynamoDB `PutItem` / `Query` / `DeleteItem`
- `prisma.habitLog.*` → DynamoDB dengan composite SK `dateCompleted#logId`

### 3.7 Ubah `src/controllers/taskController.js`
- Semua `prisma.task.*` → DynamoDB

### 3.8 Ubah `src/controllers/dashboardController.js`
- Query Habits + Logs + Tasks menggunakan DynamoDB
- Streak dihitung manual di JavaScript

### 3.9 Update `serverless.yml`
- Hapus Prisma packaging patterns
- Tambah IAM statements untuk DynamoDB + S3
- Tambah resource definitions (4 DynamoDB tables + 2 S3 buckets)
- Environment variables pointing to table/bucket refs

---

## 4. Perubahan Frontend

### 4.1 File Baru: `frontend/.env`
```
VITE_API_URL=https://<api-gateway-id>.execute-api.ap-southeast-1.amazonaws.com/api
```

### 4.2 Ubah `src/api/api.js`
- Ganti method `uploadFile` menjadi 2-step: GET `/upload-url` → PUT ke S3

### 4.3 Build
```bash
VITE_API_URL=<api-url> npm run build  # output: dist/
```

### 4.4 Deploy ke S3
```bash
aws s3 sync frontend/dist/ s3://habit-tracker-web-<account>-dev/
```

---

## 5. Development Lokal (Docker + DynamoDB Local)

### 5.1 Install Docker
```bash
sudo apt update && sudo apt install -y docker.io
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
# Kemudian logout & login ulang
```

### 5.2 Jalankan DynamoDB Local
```bash
docker run -d --name dynamodb-local -p 8000:8000 amazon/dynamodb-local
```

### 5.3 Seed Tables (`scripts/seed-local.js`)
Script untuk membuat tabel-tabel di DynamoDB Local sesuai definisi.

### 5.4 `.env` untuk Lokal
```
NODE_ENV=development
IS_OFFLINE=true
JWT_SECRET=super-secret-local-jwt-key-for-development
AWS_REGION=ap-southeast-1
DYNAMODB_ENDPOINT=http://localhost:8000
USERS_TABLE=HabitTracker_Users
TASKS_TABLE=HabitTracker_Tasks
HABITS_TABLE=HabitTracker_Habits
HABIT_LOGS_TABLE=HabitTracker_Logs
ATTACHMENTS_BUCKET=habit-tracker-attachments-local
```

### 5.5 Jalankan Backend
```bash
cd backend
npx serverless offline
```

---

## 6. Urutan Implementasi

| Step | Area | Detail |
|------|------|--------|
| 1 | Docker | Install Docker + jalankan DynamoDB Local |
| 2 | Backend | `package.json` — tambah SDK, hapus Prisma |
| 3 | Backend | Buat `src/lib/dynamodb.js` — client + table constants |
| 4 | Backend | Buat `src/lib/s3.js` — presigned URL helper |
| 5 | Backend | Buat `scripts/seed-local.js` — seed DynamoDB Local |
| 6 | Backend | Ubah `src/app.js` — ganti Prisma → DynamoDB |
| 7 | Backend | Ubah `src/middlewares/auth.js` — ganti upsert |
| 8 | Backend | Ubah `src/controllers/taskController.js` |
| 9 | Backend | Ubah `src/controllers/habitController.js` |
| 10 | Backend | Ubah `src/controllers/dashboardController.js` |
| 11 | Backend | Update `serverless.yml` — IAM + resources |
| 12 | Testing | Test lokal via serverless-offline + DynamoDB Local |
| 13 | Frontend | Ubah `src/api/api.js` — presigned URL flow |
| 14 | Frontend | Buat `frontend/.env` — VITE_API_URL placeholder |
| 15 | Deploy | `cd backend && npx serverless deploy` |
| 16 | Deploy | Update `VITE_API_URL` dengan API Gateway URL hasil deploy |
| 17 | Deploy | Build frontend + sync ke S3 web bucket |
| 18 | Final test | Test dari S3 website endpoint |

---

## 7. Cleanup setelah Migrasi

| File/Folder | Action |
|-------------|--------|
| `backend/prisma/` | Hapus |
| `backend/db.js` | Hapus |
| `backend/routes/` | Hapus |
| `backend/server.js` | Hapus |
| `backend/data/` | Hapus |
| `backend/public/` | Hapus |

---

## 8. Voclab-Specific Notes

| No | Catatan |
|----|---------|
| 1 | **DynamoDB PAY_PER_REQUEST** — tidak perlu provisioned capacity, cocok untuk Voclab |
| 2 | **S3 bucket name** — gunakan `!Sub` dengan `AWS::AccountId` untuk hindari konflik nama |
| 3 | **IAM Role** — definisikan di `serverless.yml`, Serverless Framework buatkan otomatis |
| 4 | **API Gateway HTTP API** — lebih murah dari REST API |
| 5 | **S3 Static Website** — enable public access via bucket policy |
| 6 | **No custom domain** — akses via `http://<bucket>.s3-website-ap-southeast-1.amazonaws.com` |
| 7 | **CORS** — S3 attachments bucket harus allow origin dari web bucket |
