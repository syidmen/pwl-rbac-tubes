# PWL RBAC Tubes

Repo starter untuk kerja kelompok RBAC dengan studi kasus **Inventaris Barang Sederhana**. Setiap anggota kerja di branch masing-masing, lalu membuat pull request ke `review`.

## Cara Mulai

```bash
bun install
bun run dev
```

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
