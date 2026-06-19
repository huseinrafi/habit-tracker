# Habit & Task Tracker

Aplikasi pelacakan kebiasaan (habit) dan manajemen tugas (task) harian dengan arsitektur **True Serverless** di AWS Lambda + DynamoDB + AWS Cognito, dan frontend React + Vite di S3.

## 🛠 Tech Stack

**Frontend:** React 19, Vite 8, Zustand, TailwindCSS (CDN), date-fns, AWS Amplify Auth (v6)

**Backend:** Node.js 22.x, AWS Lambda, DynamoDB, AWS SDK v3, S3 (presigned URL), AWS Cognito (aws-jwt-verify)

**Infrastructure:** AWS Lambda (Individual Functions per Endpoint), API Gateway HTTP API, DynamoDB (PAY_PER_REQUEST), S3 Static Website, AWS Cognito User Pool

---

## 📁 Struktur Proyek

```
habit-tracker/
├── frontend/          # React + Vite (S3 Static Hosting)
│   ├── src/
│   │   ├── api/       # API client (Axios + Amplify Auth)
│   │   ├── components/ # React components (Login, Register, dll)
│   │   └── store/     # Zustand state
│   └── ...
├── backend/           # True Serverless (1 Endpoint = 1 Lambda)
│   ├── src/
│   │   ├── controllers/ # Business logic
│   │   ├── handlers/    # Individual Lambda Handlers
│   │   ├── lib/         # DynamoDB & S3 clients
│   │   └── middlewares/ # lambdaAuth (Cognito JWT verification)
│   └── ...
├── DEPLOY_BACKEND.md  # Deploy dengan Serverless Framework
├── DEPLOY_MANUAL.md   # Deploy manual tanpa Serverless
└── README.md
```

---

## 🚀 Local Development

### Prasyarat
- Node.js 20+
- Docker (untuk DynamoDB Local)
- AWS CLI (terkonfigurasi)

### 1. Setup DynamoDB Local

```bash
docker run -d --name dynamodb-local -p 8000:8000 amazon/dynamodb-local
cd backend
npm run seed        # Buat tabel-tabel DynamoDB
```

### 2. Jalankan Backend

```bash
cd backend
npx serverless offline # serverless-offline di http://localhost:3001
```

### 3. Jalankan Frontend

```bash
cd frontend
npm run dev         # Vite dev server di http://localhost:5173
```

> **Catatan:** File upload tidak berfungsi di lokal tanpa mock S3. Deploy ke AWS untuk fungsionalitas penuh. Begitu juga autentikasi Cognito membutuhkan koneksi ke AWS.

---

## ☁️ Deployment

Pilih metode deploy sesuai kebutuhan:

| Dokumen | Metode | Cocok Untuk |
|---------|--------|-------------|
| [DEPLOY_BACKEND.md](./DEPLOY_BACKEND.md) | Serverless Framework | ✅ Cepat, 1 perintah |
| [DEPLOY_MANUAL.md](./DEPLOY_MANUAL.md) | Manual via AWS CLI / Console | Kontrol penuh, kebijakan ketat |

**Keduanya mendeploy:**
- Individual Lambda functions (True Serverless)
- API Gateway HTTP API
- 4 tabel DynamoDB
- 2 bucket S3 (web hosting + attachments)
- IAM role & policies
- AWS Cognito User Pool & Client

---

## 📡 API Endpoints

| Method | Path | Handlers | Deskripsi |
|--------|------|----------|-----------|
| GET | `/api/health` | `healthCheck` | Health check |
| GET | `/api/upload-url` | `uploadUrl` | Generate presigned S3 URL |
| POST | `/api/upload` | `upload` | Upload file via Base64 |
| **Tasks** | | | |
| GET | `/api/tasks` | `getAllTasks` | Ambil semua tasks |
| POST | `/api/tasks` | `createTask` | Buat task baru |
| PUT | `/api/tasks/:id` | `updateTask` | Update task |
| DELETE | `/api/tasks/:id` | `deleteTask` | Hapus task |
| **Habits** | | | |
| GET | `/api/habits` | `getAllHabits` | Ambil semua habits + logs |
| POST | `/api/habits` | `createHabit` | Buat habit baru |
| DELETE | `/api/habits/:id` | `deleteHabit`| Hapus habit |
| POST | `/api/habits/:id/check` | `checkHabit` | Check-in hari ini |
| POST | `/api/habits/:id/log` | `logHabitCompletion` | Log completion (toggle) |
| **Dashboard** | | | |
| GET | `/api/dashboard/streak` | `getStreak` | Streak data |
| GET | `/api/dashboard/analytics` | `getAnalytics`| Weekly analytics |
| **Auth** | | | |
| GET | `/api/auth/me` | `getProfile` | Get user profile info |

---

## 🗄️ DynamoDB Schema

| Table | PK | SK | GSI |
|-------|----|----|-----|
| `HabitTracker_Users` | `userId` | — | `email-index` |
| `HabitTracker_Tasks` | `userId` | `taskId` | — |
| `HabitTracker_Habits` | `userId` | `habitId` | — |
| `HabitTracker_Logs` | `habitId` | `dateCompleted#logId` | `userId-date-index` |
