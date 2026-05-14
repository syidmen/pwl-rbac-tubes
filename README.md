# PWL RBAC Tubes

Repo starter untuk kerja kelompok RBAC dengan studi kasus **Inventaris Barang Sederhana**. Setiap anggota kerja di branch masing-masing, lalu membuat pull request ke `main`.

## Cara Mulai

```bash
bun install
bun run dev
```

## Aturan Singkat

- Jangan push langsung ke `main`.
- Satu anggota pegang area file masing-masing.
- Jika perlu mengubah file anggota lain, koordinasi dulu.
- Testing akhir dilakukan oleh Lead/Admin setelah PR anggota masuk.

## Branch

```text
feature/project-lead
feature/database-prisma
feature/auth-jwt
feature/rbac-service
feature/middleware-security
feature/domain-api
feature/frontend
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
