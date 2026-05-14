# Anggota 3 - Auth & JWT

## Tujuan

Membuat fitur login dan session token.

## File Utama

- `src/application/services/auth-service.ts`
- `src/interfaces/http/routes/auth-routes.ts`
- `src/config/auth.ts`

## Tugas

- Membuat login dengan username/email dan password.
- Membuat hash/verify password.
- Membuat JWT.
- Memvalidasi JWT.
- Membuat endpoint `/auth/login`.
- Membuat endpoint `/auth/me`.
- Mengembalikan role dan permission user di `/auth/me`.

## Output Yang Diharapkan

- User bisa login.
- Login menghasilkan token.
- Token bisa dipakai untuk membaca data user aktif.
- Frontend bisa memakai token untuk akses CRUD item.
- Route auth tersedia.
