# Anggota 2 - Database & Prisma

## Tujuan

Membuat database untuk RBAC dan studi kasus Inventaris Barang Sederhana.

## Ketentuan Dari Modul

Berdasarkan modul praktikum, schema yang wajib dibuat adalah Full RBAC dengan 5 tabel utama:

- `User`
- `Role`
- `Permission`
- `UserRole`
- `RolePermission`

Relasi yang wajib ada:

- Satu user bisa punya banyak role melalui `UserRole`.
- Satu role bisa punya banyak permission melalui `RolePermission`.
- `UserRole` memakai composite primary key `userId` dan `roleId`.
- `RolePermission` memakai composite primary key `roleId` dan `permissionId`.
- Relasi memakai `onDelete: Cascade`.

Model studi kasus tidak disebut sebagai ketentuan khusus di modul. Untuk project kelompok ini, model studi kasus yang dipilih adalah `Item`.

## File Utama

- `prisma/schema.prisma`
- `prisma/migrations/`
- `prisma/seed.ts`
- `src/infrastructure/database/prisma-client.ts`

## Tugas

- Membuat model `User`.
- Membuat model `Role`.
- Membuat model `Permission`.
- Membuat relasi user-role.
- Membuat relasi role-permission.
- Membuat model `Item`.
- Membuat migration.
- Membuat seed data awal.
- Membuat Prisma Client singleton.

## Output Yang Diharapkan

- Schema Prisma selesai.
- Migration tersedia.
- Seed data awal tersedia.
- Prisma Client bisa dipakai anggota lain.
- Model `Item` tersedia untuk API inventaris.

## Catatan Studi Kasus

Studi kasus yang dipilih adalah **Inventaris Barang Sederhana**. Tambahkan model `Item` ke `schema.prisma`.

Model `Item` yang disarankan:

```text
id
code
name
category
location
quantity
condition
description
createdAt
updatedAt
```
