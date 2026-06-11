# Prompt for AI Diagram Generator

Copy paste ini ke AI yang bisa generate gambar diagram (seperti Eraser.io, Diagrams.net, atau AI dengan image output):

---

Buatkan diagram arsitektur AWS untuk aplikasi web "Habit Tracker" dengan detail berikut:

**Komponen:**
1. **S3 Static Website** — `habit-tracker-web-613872019542-prod` (bucket public, hosting SPA, output Vite build)
2. **API Gateway HTTP API v2** — URL: `r12t2i4xh3.execute-api.us-east-1.amazonaws.com` (CORS enabled, AWS_PROXY integration ke Lambda)
3. **Lambda Function** — `habit-tracker-api` (Node.js 22.x, 512MB, 30s timeout, handler: `src/app.handler`)
4. **DynamoDB** — 4 tables: `HabitTracker_Users`, `HabitTracker_Tasks`, `HabitTracker_Habits`, `HabitTracker_Logs` (masing-masing punya GSI `userId-date-index`)
5. **S3 Attachments** — `habit-tracker-attachments-613872019542-prod` (bucket untuk upload file user)
6. **IAM Role** — `LabRole` (Lambda execution role, sudah exist dari Vocareum)

**Alur request:**
- Browser request static assets → langsung ke S3 Web bucket (tanpa CloudFront)
- Browser request API (`/api/*`) → API Gateway → Lambda → Auth middleware (bypassed) → DynamoDB / S3 Attachments
- Auth tidak ada JWT, selalu inject dummy user

**Gaya diagram:**
- Gunakan icon AWS resmi
- Panah menunjukkan alur data
- Label setiap komponen dengan nama resource AWS-nya
- Tampilkan 4 tabel DynamoDB secara terpisah dalam satu grup Database

**Format output:** PNG atau SVG.
