# Anggota 7 - Frontend

## Tujuan

Membuat frontend lengkap untuk login, RBAC sederhana, dan CRUD Inventaris Barang.

## File Utama

- `frontend/`
- `frontend/src/`
- `vite.config.ts`

## Tugas

- Membuat setup React + Vite.
- Membuat halaman login.
- Menyimpan JWT token.
- Membuat helper API/fetch.
- Membuat halaman dashboard.
- Membuat halaman/list item inventaris.
- Membuat form tambah item.
- Membuat fitur edit item.
- Membuat fitur hapus item.
- Menampilkan data user aktif dari `/auth/me`.
- Menampilkan error dari backend.
- Menyiapkan tampilan sederhana untuk role/permission jika endpoint RBAC tersedia.

## Endpoint Yang Dipakai

```text
POST /auth/login
GET /auth/me
GET /items
POST /items
PATCH /items/:id
DELETE /items/:id
```

Jika waktu cukup, frontend juga bisa memakai endpoint:

```text
GET /users
GET /roles
GET /permissions
```

## Output Yang Diharapkan

- Frontend bisa dijalankan.
- Login dari frontend bisa dilakukan.
- Token bisa disimpan.
- Dashboard inventaris tersedia.
- CRUD item bisa dilakukan dari frontend.
- Error backend tampil jelas di frontend.
- Tampilan responsive sederhana untuk desktop dan mobile.
