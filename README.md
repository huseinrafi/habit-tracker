# Habit & Task Tracker

Aplikasi pelacakan kebiasaan (habit) dan manajemen tugas (task) harian. Backend serverless di AWS Lambda + DynamoDB, frontend React + Vite di S3.

## 🛠 Tech Stack

**Frontend:** React 19, Vite 8, Zustand, TailwindCSS (CDN), date-fns

**Backend:** Node.js 20, Express, DynamoDB, AWS SDK v3, S3 (presigned URL)

**Infrastructure:** AWS Lambda, API Gateway HTTP API, DynamoDB (PAY_PER_REQUEST), S3 Static Website

---

## 📁 Struktur Proyek

```
habit-tracker/
├── frontend/          # React + Vite (S3 Static Hosting)
│   ├── src/
│   │   ├── api/       # API client (Axios)
│   │   ├── components/ # React components
│   │   └── store/     # Zustand state
│   └── ...
├── backend/           # Express + DynamoDB (Lambda)
│   ├── src/
│   │   ├── controllers/ # Route handlers
│   │   ├── lib/         # DynamoDB & S3 clients
│   │   ├── middlewares/  # JWT auth
│   │   └── routes/      # Express routes
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
npm start           # serverless-offline di http://localhost:3001
```

### 3. Jalankan Frontend

```bash
cd frontend
npm run dev         # Vite dev server di http://localhost:5173
```

> **Catatan:** File upload tidak berfungsi di lokal tanpa mock S3. Deploy ke AWS untuk upload penuh.

---

## ☁️ Deployment

Pilih metode deploy sesuai kebutuhan:

| Dokumen | Metode | Cocok Untuk |
|---------|--------|-------------|
| [DEPLOY_BACKEND.md](./DEPLOY_BACKEND.md) | Serverless Framework | ✅ Cepat, 1 perintah |
| [DEPLOY_MANUAL.md](./DEPLOY_MANUAL.md) | Manual via AWS CLI / Console | Kontrol penuh, kebijakan ketat |

**Keduanya mendeploy:**
- Lambda function (backend Express)
- API Gateway HTTP API
- 4 tabel DynamoDB
- 2 bucket S3 (web hosting + attachments)
- IAM role & policies

---

## 📡 API Endpoints

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/health` | Health check |
| GET | `/api/upload-url` | Generate presigned S3 URL |
| **Tasks** | | |
| GET | `/api/tasks` | Ambil semua tasks |
| POST | `/api/tasks` | Buat task baru |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Hapus task |
| **Habits** | | |
| GET | `/api/habits` | Ambil semua habits + logs |
| POST | `/api/habits` | Buat habit baru |
| DELETE | `/api/habits/:id` | Hapus habit |
| POST | `/api/habits/:id/check` | Check-in hari ini |
| POST | `/api/habits/:id/log` | Log completion (toggle) |
| **Dashboard** | | |
| GET | `/api/dashboard/streak` | Streak data |
| GET | `/api/dashboard/analytics` | Weekly analytics |

---

## 🗄️ DynamoDB Schema

| Table | PK | SK | GSI |
|-------|----|----|-----|
| `HabitTracker_Users` | `userId` | — | `email-index` |
| `HabitTracker_Tasks` | `userId` | `taskId` | — |
| `HabitTracker_Habits` | `userId` | `habitId` | — |
| `HabitTracker_Logs` | `habitId` | `dateCompleted#logId` | `userId-date-index` |
