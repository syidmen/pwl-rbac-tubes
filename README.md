# PWL RBAC Tubes

Sistem Informasi Inventaris Barang Sekolah SMA berbasis web untuk UAS Pemrograman Web Lanjut. Aplikasi ini menggunakan React + Vite untuk frontend, Bun REST API untuk backend, Prisma untuk database, JWT untuk autentikasi, dan RBAC untuk pembatasan hak akses.

## Struktur Proyek

```text
pwl-rbac-tubes/
|-- src/              # Backend Bun REST API
|-- frontend/         # Frontend React + Vite
|-- prisma/           # Prisma schema, migration, dan seed
|-- docs/             # Dokumen tugas dan analisis kebutuhan
|-- Dockerfile        # Konfigurasi backend untuk Render
|-- render.yaml       # Blueprint Render
|-- vercel.json       # Konfigurasi frontend untuk Vercel
|-- package.json
`-- vite.config.ts
```

Catatan: folder `frontend/` memang berada di luar `src/`. `src/` dipakai khusus untuk backend, sedangkan `frontend/` dipakai khusus untuk React.

## Fitur

- Login JWT.
- Registrasi akun user baru.
- Dashboard Admin.
- Dashboard User.
- Edit profil pribadi.
- CRUD inventaris barang.
- User read-only untuk data inventaris.
- RBAC role dan permission.
- Manajemen user dan role untuk admin.
- Assign role ke user.
- Assign permission ke role.
- Statistik ringkas inventaris.
- Searching dan filtering tabel inventaris.
- Pagination tabel inventaris.
- Validasi jumlah item harus lebih dari 0.
- Pilihan lokasi inventaris menggunakan dropdown.
- Admin dapat menambah kategori barang dan ruangan.

## Role dan Hak Akses

```text
ADMIN
- Login
- Dashboard Admin
- CRUD item
- Manajemen user
- Manajemen role
- Assign role ke user
- Assign permission ke role
- Melihat data user/role/permission

USER
- Register
- Login
- Dashboard User
- Edit profil pribadi
- Melihat data item secara read-only
```

## Setup Environment

Buat file `.env` di root project:

```env
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/rbac_db"
JWT_SECRET="ganti-dengan-secret-bebas"
JWT_EXPIRES_IN_SECONDS=86400
```

Buat file `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:3000
```

## Install dan Setup Database

```bash
bun install
bunx prisma generate
bunx prisma migrate dev
bun prisma/seed.ts
```

Jika database lama tidak cocok dengan schema, gunakan reset untuk kebutuhan demo:

```bash
bunx prisma migrate reset
```

Perintah reset akan menghapus isi database, menjalankan migration ulang, lalu menjalankan seed.

Output seed berhasil:

```text
Seed selesai: Admin, User, dan permissions berhasil dibuat.
```

## Akun Seed

```text
Admin
email: admin@example.com
password: password123
role: ADMIN
```

```text
User
email: user@example.com
password: password123
role: USER
```

Permission bawaan:

```text
item:create
item:read
item:update
item:delete
```

Admin diberi semua permission item. User hanya diberi `item:read`.

## Menjalankan Aplikasi Lokal

Terminal 1 untuk backend:

```bash
bun run dev
```

Backend berjalan di:

```text
http://localhost:3000
```

Terminal 2 untuk frontend:

```bash
bun run frontend:dev
```

Frontend biasanya berjalan di:

```text
http://localhost:5173
```

Jika frontend menampilkan `Failed to fetch`, pastikan backend masih hidup dan `frontend/.env` mengarah ke `http://localhost:3000`.

## Endpoint Utama

Auth:

```text
POST /auth/register
POST /auth/login
GET /auth/me
PATCH /auth/me
```

Item:

```text
GET /items
POST /items
GET /items/:id
PUT /items/:id
PATCH /items/:id
DELETE /items/:id
```

RBAC:

```text
GET /users
POST /users
PATCH /users/:id
DELETE /users/:id
GET /roles
POST /roles
PATCH /roles/:id
DELETE /roles/:id
GET /permissions
POST /users/:id/roles
POST /roles/:id/permissions
```

## Alur Testing

Jalankan validasi kode:

```bash
bun run typecheck
bun run frontend:typecheck
bun run frontend:build
bunx prisma validate
```

Jalankan backend:

```bash
bun run dev
```

Jalankan test API di terminal lain:

```bash
bun test-api.ts
```

Tes manual:

```text
http://localhost:3000
http://localhost:5173
```

Checklist frontend:

- Login sebagai admin.
- Login sebagai user.
- Registrasi akun user baru.
- Dashboard Admin tampil untuk admin.
- Dashboard User tampil untuk user.
- User hanya bisa melihat item.
- Admin bisa tambah, edit, dan hapus item.
- Jumlah item tidak boleh 0.
- Lokasi item dipilih dari dropdown.
- User bisa edit profil pribadi.
- Searching item berdasarkan keterangan.
- Filtering item berdasarkan kategori, kondisi, dan status.
- Pagination item dengan pilihan jumlah data per halaman.
- Admin bisa assign role ke user.
- Admin bisa assign beberapa permission sekaligus ke role.

## Deployment

Frontend disiapkan untuk Vercel.

Pengaturan Vercel:

```text
Build Command: bun run frontend:build
Output Directory: dist/frontend
Install Command: bun install
```

Environment variable frontend:

```env
VITE_API_BASE_URL=https://URL-BACKEND-RENDER
```

Backend disiapkan untuk Render menggunakan `Dockerfile` dan `render.yaml`.

Environment variable backend di Render:

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"
JWT_SECRET="ganti-dengan-secret-production"
JWT_EXPIRES_IN_SECONDS=86400
```

Setelah deploy, isi link production:

```text
Frontend Vercel: -
Backend Render: -
```

## Dokumentasi

Analisis kebutuhan sistem tersedia di:

```text
docs/ANALISIS-KEBUTUHAN.md
```

Dokumen pembagian tugas tersedia di:

```text
docs/tugas/
```

## Studi Kasus

Studi kasus yang dipakai adalah **Inventaris Barang Sekolah SMA**.

Model utama:

```text
Item
```

Field item:

```text
id
code
name
category
location
quantity
condition
status
description
createdAt
updatedAt
```

Status barang:

```text
Tersedia
Hilang
Dipinjam
```

Kondisi barang:

```text
Baik
Rusak
```

Kategori awal:

```text
Buku Pelajaran
Elektronik
Alat Laboratorium
Perabot Kelas
Peralatan Olahraga
Alat Kebersihan
ATK
Sarana Kelas
```
