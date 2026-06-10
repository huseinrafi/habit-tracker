# 🛠️ Deploy Backend Manual (tanpa Serverless Framework)

> Panduan ini untuk deploy ke AWS **tanpa** Serverless Framework — cocok jika ingin kontrol penuh atau Serverless Framework tidak bisa digunakan.

## Prasyarat

1. **Akun AWS** dengan akses ke: Lambda, API Gateway, DynamoDB, S3, IAM
2. **AWS CLI** terkonfigurasi: `aws configure`
3. **Node.js 20+**
4. **Docker** (untuk build packaging Lambda)

## Arsitektur

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

---

## Langkah 1: Buat Tabel DynamoDB

Jalankan di **AWS Console** atau via CLI:

```bash
# Users Table
aws dynamodb create-table \
  --table-name HabitTracker_Users \
  --attribute-definitions AttributeName=userId,AttributeType=S AttributeName=email,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --global-secondary-indexes IndexName=email-index,KeySchema=["{AttributeName=email,KeyType=HASH}"],Projection="{ProjectionType=KEYS_ONLY}" \
  --billing-mode PAY_PER_REQUEST

# Tasks Table
aws dynamodb create-table \
  --table-name HabitTracker_Tasks \
  --attribute-definitions AttributeName=userId,AttributeType=S AttributeName=taskId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH AttributeName=taskId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST

# Habits Table
aws dynamodb create-table \
  --table-name HabitTracker_Habits \
  --attribute-definitions AttributeName=userId,AttributeType=S AttributeName=habitId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH AttributeName=habitId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST

# Logs Table
aws dynamodb create-table \
  --table-name HabitTracker_Logs \
  --attribute-definitions AttributeName=habitId,AttributeType=S AttributeName='dateCompleted#logId',AttributeType=S AttributeName=userId,AttributeType=S AttributeName=dateCompleted,AttributeType=S \
  --key-schema AttributeName=habitId,KeyType=HASH AttributeName='dateCompleted#logId',KeyType=RANGE \
  --global-secondary-indexes IndexName=userId-date-index,KeySchema=["{AttributeName=userId,KeyType=HASH}","{AttributeName=dateCompleted,KeyType=RANGE}"],Projection="{ProjectionType=ALL}" \
  --billing-mode PAY_PER_REQUEST
```

---

## Langkah 2: Buat Bucket S3

```bash
# Attachments bucket
aws s3 mb s3://habit-tracker-attachments-<account-id>-prod

# Web bucket (static hosting)
aws s3 mb s3://habit-tracker-web-<account-id>-prod
aws s3 website s3://habit-tracker-web-<account-id>-prod \
  --index-document index.html \
  --error-document index.html

# Bucket policy untuk web (biar bisa diakses publik)
cat > /tmp/web-bucket-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::habit-tracker-web-<account-id>-prod/*"
  }]
}
EOF
aws s3api put-bucket-policy --bucket habit-tracker-web-<account-id>-prod --policy file:///tmp/web-bucket-policy.json
```

---

## Langkah 3: Buat IAM Role untuk Lambda

```bash
# Trust policy
cat > /tmp/trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "lambda.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
EOF

# Buat role
aws iam create-role \
  --role-name habit-tracker-lambda-role \
  --assume-role-policy-document file:///tmp/trust-policy.json

# Attach policy DynamoDB
aws iam attach-role-policy \
  --role-name habit-tracker-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess

# Attach policy S3
aws iam attach-role-policy \
  --role-name habit-tracker-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

# Attach policy CloudWatch Logs
aws iam attach-role-policy \
  --role-name habit-tracker-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

---

## Langkah 4: Package & Upload Backend ke Lambda

```bash
cd backend

# 1. Hapus devDependencies
npm prune --omit=dev

# 2. Zip seluruh folder backend (kecuali yang tidak perlu)
zip -r ../deployment-package.zip . \
  -x "node_modules/.prisma/**" \
  -x ".serverless/**" \
  -x "scripts/**" \
  -x "*.git*"

# 3. Install ulang devDependencies jika masih perlu lokal
npm install --only=dev

# 4. Buat Lambda function
aws lambda create-function \
  --function-name habit-tracker-api \
  --runtime nodejs20.x \
  --role arn:aws:iam::<account-id>:role/habit-tracker-lambda-role \
  --handler src/app.handler \
  --memory-size 512 \
  --timeout 29 \
  --zip-file fileb://../deployment-package.zip

# 5. Set environment variables
aws lambda update-function-configuration \
  --function-name habit-tracker-api \
  --environment "Variables={
    NODE_ENV=prod,
    AWS_REGION=ap-southeast-1,
    USERS_TABLE=HabitTracker_Users,
    TASKS_TABLE=HabitTracker_Tasks,
    HABITS_TABLE=HabitTracker_Habits,
    HABIT_LOGS_TABLE=HabitTracker_Logs,
    ATTACHMENTS_BUCKET=habit-tracker-attachments-<account-id>-prod
  }"
```

> ⚠️ Setelah deploy, install ulang dependencies: `npm install`

---

## Langkah 5: Buat API Gateway HTTP API

```bash
# 1. Buat API
API_ID=$(aws apigatewayv2 create-api \
  --name habit-tracker-api \
  --protocol-type HTTP \
  --target arn:aws:lambda:ap-southeast-1:<account-id>:function:habit-tracker-api \
  --query 'ApiId' \
  --output text)

echo "API Gateway ID: $API_ID"

# 2. Deploy API
aws apigatewayv2 create-stage \
  --api-id $API_ID \
  --stage-name prod \
  --auto-deploy

# 3. Tambah permission untuk API Gateway invoke Lambda
aws lambda add-permission \
  --function-name habit-tracker-api \
  --statement-id api-gateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn arn:aws:execute-api:ap-southeast-1:<account-id>:$API_ID/*/*/{proxy+}

# API URL: https://$API_ID.execute-api.ap-southeast-1.amazonaws.com
echo "API URL: https://$API_ID.execute-api.ap-southeast-1.amazonaws.com"
```

---

## Langkah 6: Deploy Frontend

```bash
cd frontend

# 1. Set API URL
echo "VITE_API_URL=https://$API_ID.execute-api.ap-southeast-1.amazonaws.com/api" > .env

# 2. Build
npm run build

# 3. Upload ke S3
aws s3 sync dist/ s3://habit-tracker-web-<account-id>-prod/ --delete
```

Akses frontend di: `http://habit-tracker-web-<account-id>-prod.s3-website-ap-southeast-1.amazonaws.com`

---

## Langkah 7: Update Backend (Setelah Perubahan Kode)

```bash
cd backend

npm prune --omit=dev
zip -r ../deployment-package.zip . \
  -x "node_modules/.prisma/**" \
  -x ".serverless/**" \
  -x "scripts/**" \
  -x "*.git*"

aws lambda update-function-code \
  --function-name habit-tracker-api \
  --zip-file fileb://../deployment-package.zip

npm install --only=dev
```

---

## Perbandingan: Serverless Framework vs Manual

| Aspek | Serverless Framework | Manual |
|-------|---------------------|--------|
| Kemudahan | ✅ 1 perintah | ❌ Banyak langkah |
| Infrastruktur sebagai Kode | ✅ serverless.yml | ❌ Script manual |
| Update Lamba | ✅ `serverless deploy` | ✅ `aws lambda update-function-code` |
| Rollback | ✅ `serverless rollback` | ❌ Harus deploy ulang |
| Local testing | ✅ `serverless offline` | ❌ Tidak ada |
| Kontrol penuh | ❌ Terbatas | ✅ Bebas atur |
| Cocok untuk | Development cepat, prototyping | Production dengan kebijakan ketat |
