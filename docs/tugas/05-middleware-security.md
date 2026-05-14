# Anggota 5 - Middleware & Security

## Tujuan

Membuat fondasi HTTP, middleware, response, dan error handling.

## File Utama

- `src/interfaces/http/router.ts`
- `src/interfaces/http/response.ts`
- `src/interfaces/http/errors.ts`
- `src/interfaces/http/middleware/auth-middleware.ts`
- `src/interfaces/http/middleware/permission-middleware.ts`
- `src/interfaces/http/validation.ts`

## Tugas

- Membuat router utama.
- Mendaftarkan route auth, RBAC, dan items.
- Membuat response JSON standar.
- Membuat error handler.
- Membuat middleware auth.
- Membuat middleware permission.
- Membuat validasi request sederhana.
- Mengatur CORS.

## Output Yang Diharapkan

- Router utama tersedia.
- Middleware auth tersedia.
- Middleware permission tersedia.
- Error response konsisten.
- Route anggota lain bisa dipasang.
- Endpoint `/items` bisa diproteksi dengan permission `item:*`.
