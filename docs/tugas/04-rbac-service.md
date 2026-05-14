# Anggota 4 - RBAC Service

## Tujuan

Membuat fitur role dan permission.

## File Utama

- `src/application/services/rbac-service.ts`
- `src/interfaces/http/routes/rbac-routes.ts`

## Tugas

- CRUD user.
- CRUD role.
- CRUD permission.
- Assign role ke user.
- Assign permission ke role.
- Cek permission user.
- Menyiapkan permission inventaris: `item:create`, `item:read`, `item:update`, `item:delete`.
- Menghindari password tampil di response.

## Output Yang Diharapkan

- Service RBAC tersedia.
- Route RBAC tersedia.
- User bisa diberi role.
- Role bisa diberi permission.
- Permission user bisa dicek.
- Role bisa diberi permission untuk CRUD item inventaris.
