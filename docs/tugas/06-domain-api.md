# Anggota 6 - Domain API

## Tujuan

Membuat API untuk studi kasus **Inventaris Barang Sederhana**.

Studi kasus ini dipilih karena paling sederhana untuk RBAC:

- cukup 1 model utama
- mudah dibuat CRUD
- cocok untuk demo permission
- mudah dibuat frontend

## Model Studi Kasus

Gunakan model:

```text
Item
```

Field yang disarankan:

```text
id
code
name
category
location
quantity
condition
createdAt
updatedAt
```

Field opsional:

```text
description
```

Permission item:

```text
item:create
item:read
item:update
item:delete
```

Endpoint item:

```text
GET /items
POST /items
GET /items/:id
PATCH /items/:id
DELETE /items/:id
```

## File Utama

- `src/application/services/item-service.ts`
- `src/interfaces/http/routes/item-routes.ts`

## Tugas

- Menggunakan studi kasus Inventaris Barang Sederhana.
- Membuat service item.
- Membuat route item.
- Membuat CRUD item.
- Menggunakan permission `item:create`, `item:read`, `item:update`, `item:delete`.
- Menyiapkan response yang mudah dipakai frontend.

## Output Yang Diharapkan

- API item tersedia.
- CRUD item tersedia.
- Permission item tersedia.
- Response item siap dipakai frontend.
