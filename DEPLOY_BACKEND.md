# 🚀 Deploy Backend dengan Serverless Framework

> Panduan ini untuk deploy **seluruh stack** (Lambda + API Gateway + DynamoDB + S3) menggunakan Serverless Framework. Backend, database, dan storage semuanya diatur dalam satu perintah.

## Prasyarat

1. **Akun AWS** (Voclab atau pribadi) — pastikan punya akses ke:
   - Lambda
   - API Gateway
   - DynamoDB
   - S3
   - IAM

2. **AWS CLI terkonfigurasi:**
   ```bash
   aws configure
   # Masukkan Access Key ID, Secret Access Key, region: ap-southeast-1
   ```

3. **Node.js 20+** dan **Serverless Framework:**
   ```bash
   npm install -g serverless
   ```

## Struktur yang Dideploy

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  S3 Web      │────▶│  API Gateway │────▶│  DynamoDB    │
│  (frontend)  │     │  HTTP API    │     │  4 Tables    │
└──────────────┘     │      │       │     └──────────────┘
                     │  Lambda      │
                     │  (Node 20)   │
                     └──────┬───────┘
                            │
                     ┌──────▼───────┐
                     │  S3 Uploads  │
                     │  (attachments)│
                     └──────────────┘
```

## Langkah Deploy

### 1. Backend

```bash
cd backend

# (Opsional) Deploy ke stage tertentu
npx serverless deploy --stage prod
```

**Proses:**
- Membuat 4 tabel DynamoDB: `HabitTracker_Users`, `HabitTracker_Tasks`, `HabitTracker_Habits`, `HabitTracker_Logs`
- Membuat 2 bucket S3: Web hosting + Attachments
- Deploy Lambda function + API Gateway HTTP API
- Mengatur IAM role dengan permission yang diperlukan

**Output** (catat untuk langkah selanjutnya):
```
Service Information
─────────────────────────────────────────────────
ApiUrl:        https://xxxxxxxxxx.execute-api.ap-southeast-1.amazonaws.com
WebBucketUrl:  http://habit-tracker-web-123456789-prod.s3-website-ap-southeast-1.amazonaws.com
AttachmentsBucketName: habit-tracker-attachments-123456789-prod
```

### 2. Frontend

```bash
cd frontend

# 1. Set API URL (pakai ApiUrl dari output deploy)
echo "VITE_API_URL=https://xxxxxxxxxx.execute-api.ap-southeast-1.amazonaws.com/api" > .env

# 2. Build
npm run build

# 3. Upload ke S3 Web Bucket
aws s3 sync dist/ s3://habit-tracker-web-123456789-prod/ --delete
```

### 3. Debug jika Gagal

| Error | Penyebab | Solusi |
|-------|----------|--------|
| `AccessDenied` saat deploy | IAM user tidak punya cukup permission | Tambah policy: `AdministratorAccess` atau minimal `AWSLambda_FullAccess`, `AmazonDynamoDBFullAccess`, `AmazonS3FullAccess`, `IAMFullAccess` |
| Bucket name already exists | Nama bucket S3 harus global unique | Serverless.yml sudah pakai `!Sub` dengan `AWS::AccountId` — seharusnya unique |
| Lambda timeout | Query terlalu lambat | Naikkan `timeout` di serverless.yml atau optimize query |
| 502 Bad Gateway | Error di kode Lambda | Cek CloudWatch Logs: `npx serverless logs -f api --stage prod` |

## Update Setelah Deploy Awal

```bash
cd backend
npx serverless deploy --stage prod          # Update backend
npx serverless deploy function -f api --stage prod  # Update fungsi saja (lebih cepat)

# Frontend
cd frontend
npm run build
aws s3 sync dist/ s3://habit-tracker-web-123456789-prod/ --delete
```

## Hapus Semua Resource

```bash
cd backend
npx serverless remove --stage prod
```

> ⚠️ Perintah ini akan menghapus **semua** resource: Lambda, API Gateway, tabel DynamoDB, dan bucket S3.
