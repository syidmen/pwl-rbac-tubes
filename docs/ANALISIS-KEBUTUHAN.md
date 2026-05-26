# Analisis Kebutuhan Sistem

## Proses Bisnis

Sistem Inventaris Barang membantu admin mengelola data barang seperti kode, nama, kategori, lokasi, jumlah, kondisi, dan deskripsi. User biasa dapat membuat akun, login, melihat daftar barang secara read-only, serta memperbarui profil pribadi.

## Aktor

- Admin: mengelola data inventaris, user, role, dan assignment permission.
- User: registrasi, login, melihat data inventaris, dan mengedit profil pribadi.

## Use Case

- User melakukan registrasi akun.
- User dan admin melakukan login.
- Admin menambah, melihat, mengubah, dan menghapus data barang.
- User melihat daftar barang tanpa hak tambah, edit, atau hapus.
- Admin membuat user dan role.
- Admin memberi role kepada user.
- Admin memberi permission kepada role.
- User mengubah profil pribadi.

## Solusi Digital

Aplikasi dibangun sebagai full-stack web app dengan React untuk frontend dan Bun REST API untuk backend. JWT dipakai untuk menjaga sesi login, sedangkan RBAC membatasi akses berdasarkan role dan permission.
