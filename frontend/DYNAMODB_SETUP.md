# Membuat Tabel DynamoDB di AWS Console

Panduan langkah-demi-langkah membuat 4 tabel DynamoDB untuk Habit Tracker.

---

## Daftar Isi

1. [Login ke AWS Console](#1-login-ke-aws-console)
2. [Buka Layanan DynamoDB](#2-buka-layanan-dynamodb)
3. [Tabel 1: habit-tracker-users](#3-tabel-1-habit-tracker-users)
4. [Tabel 2: habit-tracker-tasks](#4-tabel-2-habit-tracker-tasks)
5. [Tabel 3: habit-tracker-habits](#5-tabel-3-habit-tracker-habits)
6. [Tabel 4: habit-tracker-habit-logs](#6-tabel-4-habit-tracker-habit-logs)
7. [Verifikasi Semua Tabel](#7-verifikasi-semua-tabel)
8. [Penjelasan Konsep](#8-penjelasan-konsep)

---

## 1. Login ke AWS Console

1. Buka browser dan masuk ke **https://console.aws.amazon.com**
2. Login menggunakan akun Voclabs kamu
3. **Pastikan region sudah benar** — lihat di pojok kanan atas, sebelah nama akun

   ![Region selector](https://docs.aws.amazon.com/images/console/console_image.png)

   Voclabs biasanya pakai: `us-east-1` (N. Virginia), `ap-southeast-1` (Singapore), atau `eu-west-1` (Ireland).
   
   **Catat region ini** — semua tabel, Lambda, S3, dan API Gateway harus di region yang SAMA.

---

## 2. Buka Layanan DynamoDB

1. Di kolom pencarian (atas), ketik **"DynamoDB"**
2. Klik hasil pencarian **DynamoDB**

   ![DynamoDB Console](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/images/console.png)

3. Di sidebar kiri, klik **"Tables"** (atau "Explore items")

Kamu akan melihat halaman daftar tabel (masih kosong).

---

## 3. Tabel 1: habit-tracker-users

Tabel ini menyimpan data pengguna (nama, email, password terenkripsi).

### Klik "Create table"

Tombol **Create table** ada di pojok kanan atas halaman Tables.

### Isi Form

**Table details:**
| Field | Isi |
|-------|-----|
| **Table name** | `habit-tracker-users` |
| **Partition key** | `id` |
| **Key type** | `String` |

> **Partition key** = primary key, nilai unik untuk setiap baris data. Kita pakai UUID.

**Table settings:**
| Field | Pilih |
|-------|-------|
| **Table class** | **DynamoDB Standard** |
| **Read/write capacity** | **On-demand** |

> **On-demand** = bayar per request, cocok untuk aplikasi skala kecil/tidak menentu. Voclabs biasanya gratis.

### Tambah Global Secondary Index (GSI)

GSI diperlukan agar Lambda bisa mencari user berdasarkan **email** (saat login/register).

1. Klik **"Add global secondary index"**
2. Isi:

   | Field | Isi |
   |-------|-----|
   | **Index name** | `email-index` |
   | **Partition key** | `email` |
   | **Key type** | `String` |
   | **Index projection** | `All attributes` |

   ![GSI example](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/images/GSI-Create.png)

3. Klik **"Add index"**

### Create Table

Klik tombol **"Create table"** (pojok kanan bawah).

Tunggu 1-2 detik sampai status jadi **Active** (refresh jika perlu).

> **⚠️ Jika GSI tidak bisa dibuat** (Error: LimitExceeded):
> - Voclabs mungkin membatasi jumlah GSI
> - Hapus tabel, buat ulang **tanpa GSI**
> - Login/register akan tetap jalan, tapi lebih lambat (pakai Scan, bukan Query)

---

## 4. Tabel 2: habit-tracker-tasks

Tabel ini menyimpan tugas (task) milik user.

### Klik "Create table" lagi

### Isi Form

**Table details:**
| Field | Isi |
|-------|-----|
| **Table name** | `habit-tracker-tasks` |
| **Partition key** | `id` |
| **Key type** | `String` |

**Table settings:**
| Field | Pilih |
|-------|-------|
| **Table class** | **DynamoDB Standard** |
| **Read/write capacity** | **On-demand** |

### Tambah GSI: userId-index

GSI ini diperlukan agar Lambda bisa mengambil **semua task milik satu user**.

Klik **"Add global secondary index"**:

| Field | Isi |
|-------|-----|
| **Index name** | `userId-index` |
| **Partition key** | `userId` |
| **Key type** | `String` |
| **Index projection** | `All attributes` |

Klik **"Add index"**.

### Create Table

Klik **"Create table"** → tunggu status **Active**.

---

## 5. Tabel 3: habit-tracker-habits

Tabel ini menyimpan habit (kebiasaan) milik user.

### Klik "Create table"

**Table details:**
| Field | Isi |
|-------|-----|
| **Table name** | `habit-tracker-habits` |
| **Partition key** | `id` |
| **Key type** | `String` |

**Capacity:** On-demand

### Tambah GSI: userId-index

Sama seperti tabel tasks — GSI `userId-index` dengan Partition Key `userId` (String), Projection `All attributes`.

### Create Table

Klik **"Create table"**.

---

## 6. Tabel 4: habit-tracker-habit-logs

Tabel ini menyimpan log check-in habit (tanggal kapan user men-check habit).

### Klik "Create table"

**Table details:**
| Field | Isi |
|-------|-----|
| **Table name** | `habit-tracker-habit-logs` |
| **Partition key** | `id` |
| **Key type** | `String` |

**Capacity:** On-demand

### Tambah GSI: habitId-index

GSI ini diperlukan agar Lambda bisa mengambil **semua log milik satu habit** (misal untuk menghitung streak).

Klik **"Add global secondary index"**:

| Field | Isi |
|-------|-----|
| **Index name** | `habitId-index` |
| **Partition key** | `habitId` |
| **Key type** | `String` |
| **Index projection** | `All attributes` |

### Create Table

Klik **"Create table"**.

---

## 7. Verifikasi Semua Tabel

Setelah keempat tabel selesai, halaman **Tables** akan menampilkan:

| Table Name | Status | 
|-----------|--------|
| habit-tracker-users | ✅ Active |
| habit-tracker-tasks | ✅ Active |
| habit-tracker-habits | ✅ Active |
| habit-tracker-habit-logs | ✅ Active |

### Cek detail tabel (opsional)

1. Klik nama tabel → tab **"Items"** → (masih kosong, itu normal)
2. Tab **"Indexes"** → lihat GSI yang sudah dibuat
3. Tab **"Overview"** → lihat ARN tabel (dipakai untuk izin IAM nanti)

### Simpan ARN tabel

Di tab **Overview**, catat **Amazon Resource Name (ARN)** untuk setiap tabel. Contoh:

```
arn:aws:dynamodb:us-east-1:123456789012:table/habit-tracker-users
```

ARN ini akan dipakai saat membuat kebijakan IAM untuk Lambda.

---

## 8. Penjelasan Konsep

### Partition Key

Setiap item di DynamoDB punya satu **Partition Key** (wajib). Nilainya harus UNIK.

```
Tabel tasks:
  { id: "abc-123",  userId: "user-xyz", title: "Meeting" }   ✅
  { id: "abc-456",  userId: "user-xyz", title: "Laporan" }   ✅
  { id: "abc-123",  userId: "user-pqr", title: "Hack" }      ❌ (id duplikat!)
```

Partition key `id` kita isi dengan UUID yang digenerate oleh Lambda (`crypto.randomUUID()`).

### Global Secondary Index (GSI)

GSI memungkinkan kita mencari data dengan **kolom lain** selain partition key.

Tanpa GSI `userId-index`, untuk mengambil task user kita harus **Scan** seluruh tabel (lambat & mahal). Dengan GSI, kita bisa **Query** langsung:

```javascript
// Query by GSI — cepat & murah
const result = await doc.send(new QueryCommand({
  TableName: "habit-tracker-tasks",
  IndexName: "userId-index",               // ← GSI
  KeyConditionExpression: "userId = :uid",
  ExpressionAttributeValues: { ":uid": "user-xyz" },
}));
```

### Ringkasan 4 Tabel

| Tabel | Partition Key | GSI | Fungsi |
|-------|--------------|-----|--------|
| `habit-tracker-users` | `id` | `email-index` | Login, register, profil user |
| `habit-tracker-tasks` | `id` | `userId-index` | CRUD tugas per user |
| `habit-tracker-habits` | `id` | `userId-index` | CRUD habit per user |
| `habit-tracker-habit-logs` | `id` | `habitId-index` | Log check-in per habit |

### Cara Tabel Saling Terhubung

```
users (id: user-xyz)
  ├── tasks (userId: user-xyz)     ← ambil via GSI userId-index
  └── habits (userId: user-xyz)    ← ambil via GSI userId-index
        └── logs (habitId: habit-abc)  ← ambil via GSI habitId-index
```

Semua data "milik user" dihubungkan melalui kolom `userId`. Lambda memastikan user hanya bisa mengakses datanya sendiri (diperiksa via JWT token).

---

## Troubleshooting

### "Error: LimitExceededException" saat buat GSI

Voc labs sering membatasi jumlah GSI. Solusi:
1. Hapus tabel yang error
2. Buat ulang **tanpa GSI**
3. Lambda akan fallback ke `Scan` (lebih lambat, tapi tetap jalan)

### Lupa region

Cek di pojok kanan atas Console. Semua resource harus di region sama.

### Table name salah eja

Hapus tabel (butuh waktu 1-2 menit) lalu buat ulang dengan nama yang benar.

### Tidak bisa membuat tabel sama sekali

Voc labs mungkin memberikan izin terbatas. Coba logout/login ulang akun Voc labs, atau gunakan terminal dengan perintah CLI:

```bash
aws dynamodb create-table \
  --table-name habit-tracker-users \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

---

## Referensi

- [AWS DynamoDB Developer Guide](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/)
- [Working with Global Secondary Indexes](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html)
- [On-demand Capacity Mode](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadWriteCapacityMode.html)
