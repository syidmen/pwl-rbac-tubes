# PWL RBAC Tubes

Repo starter untuk kerja kelompok RBAC dengan studi kasus **Inventaris Barang Sederhana**. Setiap anggota kerja di branch masing-masing, lalu membuat pull request ke `review`.

## Cara Mulai

```bash
bun install
bunx prisma generate
bunx prisma migrate dev
bun prisma/seed.ts
bun run dev
```

Backend berjalan di:

```text
http://localhost:3000
```

Frontend dijalankan di terminal lain:

```bash
bun run frontend:dev
```

Biasanya frontend berjalan di:

```text
http://localhost:5173
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

Jika frontend menampilkan `Failed to fetch`, pastikan backend `bun run dev` masih hidup dan `frontend/.env` sudah benar.

## Setup Database dan Seed

Generate Prisma Client:

```bash
bunx prisma generate
```

Jalankan migration:

```bash
bunx prisma migrate dev
```

Jika database lama tidak cocok dengan schema, untuk kebutuhan demo bisa reset database:

```bash
bunx prisma migrate reset
```

Perintah di atas akan menghapus isi database, menjalankan migration ulang, lalu menjalankan seed.

Jika ingin seed manual:

```bash
bun prisma/seed.ts
```

Output berhasil:

```text
Seed selesai: Superadmin, Admin, dan permissions berhasil dibuat.
```

## Akun Seed

Superadmin:

```text
email: superadmin@example.com
password: password123
role: SUPERADMIN
```

Admin:

```text
email: admin@example.com
password: password123
role: ADMIN
```

Permission bawaan:

```text
item:create
item:read
item:update
item:delete
```

Kedua akun seed diberi semua permission item.

## Alur Testing

Jalankan validasi kode:

```bash
bun run typecheck
bun run frontend:typecheck
bun run frontend:build
```

Jalankan backend di terminal pertama:

```bash
bun run dev
```

Jalankan test API di terminal kedua:

```bash
bun test-api.ts
```

Tes manual di browser:

```text
http://localhost:3000
```

Tes frontend:

```bash
bun run frontend:dev
```

Login menggunakan akun seed, lalu coba:

- dashboard tampil
- tambah item
- edit item
- hapus item
- tambah user
- tambah role
- tambah permission
- assign role ke user
- assign permission ke role

## Aturan Singkat

- Jangan push langsung ke `main`.
- Jangan push langsung ke `review` kecuali Lead/Admin.
- Satu anggota pegang area file masing-masing.
- Jika perlu mengubah file anggota lain, koordinasi dulu.
- PR anggota masuk ke branch `review`.
- Testing akhir dilakukan oleh Lead/Admin di branch `review`.
- Jika sudah aman, Lead/Admin merge `review` ke `main`.

## Branch

```text
main
review
feature/project-lead
feature/database-prisma
feature/auth-jwt
feature/rbac-service
feature/middleware-security
feature/domain-api
feature/frontend
```

Alur branch:

```text
feature/* -> review -> main
```

## Pembagian Tugas

- Anggota 1: Project Lead/Admin, setup repo, review PR, testing akhir.
- Anggota 2: Database dan Prisma.
- Anggota 3: Auth dan JWT.
- Anggota 4: RBAC service.
- Anggota 5: Router, middleware, response, error handling.
- Anggota 6: API inventaris barang.
- Anggota 7: Frontend lengkap.

Detail tugas ada di:

```text
docs/tugas/
```

## Catatan Testing

Anggota cukup memastikan kodenya rapi sebelum push. Testing integrasi akhir dilakukan oleh Lead/Admin setelah semua PR masuk.

## Studi Kasus

Studi kasus yang dipakai adalah **Inventaris Barang Sederhana**.

Model utama:

```text
Item
```

Endpoint utama:

```text
GET /items
POST /items
GET /items/:id
PATCH /items/:id
DELETE /items/:id
```

Permission item:

```text
item:create
item:read
item:update
item:delete
```
