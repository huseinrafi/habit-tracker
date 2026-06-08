# Habit & Task Tracker

Sebuah aplikasi pelacakan kebiasaan (habit) dan manajemen tugas (task) harian dengan desain modern yang interaktif. Aplikasi ini dibangun dengan memisahkan sisi *Frontend* dan *Backend* secara profesional, serta dirancang khusus agar siap untuk dideploy (diunggah) ke infrastruktur berbasis serverless di **AWS Lambda**.

## 🛠 Teknologi yang Digunakan

Aplikasi ini menggunakan stack teknologi modern berikut:

**Frontend:**
- **Framework:** React.js (menggunakan Vite untuk *build tool* yang lebih cepat)
- **Styling:** TailwindCSS (untuk desain utilitas yang cepat dan *custom*)
- **State Management:** Zustand (untuk manajemen state global yang ringan)
- **Utilities:** `date-fns` untuk pengolahan tanggal yang kompleks di kalender.

**Backend:**
- **Framework:** Node.js dengan Express.js
- **Database ORM:** Prisma ORM (mendukung skema relasional yang aman & cepat)
- **Serverless Adapter:** `serverless-http` (untuk menjalankan aplikasi Express.js di dalam AWS Lambda)
- **Cloud Service Integrations:** S3 AWS SDK (untuk penyimpanan *attachment* tugas)

---

## 🚀 Panduan Menjalankan Secara Lokal (Local Testing)

Anda dapat menjalankan kedua server secara bersamaan secara lokal di komputer Anda. Pastikan Anda memiliki Node.js terinstal.

### 1. Menjalankan Backend
Backend berjalan sebagai serverless API lokal menggunakan *plugin* `serverless-offline`.
1. Buka terminal baru dan masuk ke folder `backend`:
   ```bash
   cd backend
   ```
2. Pastikan file `.env` sudah diatur dengan konfigurasi database yang benar (`DATABASE_URL`).
3. Jalankan server backend:
   ```bash
   NODE_ENV=development npx serverless offline
   ```
   *Secara default, ini akan berjalan di `http://localhost:3001`.*

### 2. Menjalankan Frontend
Frontend dibangun dengan Vite.
1. Buka terminal baru (biarkan terminal backend tetap menyala) dan masuk ke folder `frontend`:
   ```bash
   cd frontend
   ```
2. Mulai *development server* Vite:
   ```bash
   npm run dev
   ```
   *Secara default, ini akan terbuka di `http://localhost:5173`.*
3. Buka URL tersebut di browser Anda untuk mulai bereksperimen!

---

## ☁️ Panduan Deploy ke AWS Lambda

Proses publikasi aplikasi ini ke internet dibuat semudah mungkin menggunakan **Serverless Framework**. Pastikan Anda sudah memiliki akun AWS dan telah mengonfigurasi AWS CLI (`aws configure`) dengan *Access Key* dan *Secret Key* yang valid.

### Langkah-Langkah Deploy Backend:

1. Masuk ke folder backend:
   ```bash
   cd backend
   ```
2. *(Opsional)* Jika Anda menggunakan S3 bucket untuk upload file, pastikan nama S3 Bucket di `serverless.yml` dan `.env` AWS Anda sudah di-set sesuai.
3. Jalankan perintah deploy Serverless:
   ```bash
   npx serverless deploy --stage prod
   ```
4. Serverless akan otomatis "membungkus" seluruh kode aplikasi Anda, mengunggahnya ke AWS S3 untuk staging, dan membuatkan AWS Lambda beserta API Gateway secara otomatis.
5. Setelah berhasil, Anda akan menerima link **Endpoint URL** dari API Gateway di terminal Anda. 

### Langkah-Langkah Deploy Frontend:

1. Di folder `frontend`, ubah koneksi API URL Anda. Buka file `.env` di dalam folder frontend (atau buat jika belum ada) dan ubah endpoint base URL:
   ```env
   VITE_API_URL="<URL_API_GATEWAY_ANDA>/api"
   ```
2. Build aplikasi Vite:
   ```bash
   npm run build
   ```
3. Folder `dist` akan digenerate. Anda dapat mengunggah (deploy) folder `dist` tersebut ke layanan hosting statis apa pun seperti **AWS S3 Static Hosting**, **Vercel**, **Netlify**, atau **GitHub Pages**.
