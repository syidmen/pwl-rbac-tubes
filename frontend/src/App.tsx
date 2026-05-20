import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import {
  ApiError,
  assignPermissionToRole,
  assignRoleToUser,
  clearToken,
  createPermission,
  createItem,
  createRole,
  createUser,
  deleteItem,
  getItems,
  getMe,
  getPermissions,
  getRoles,
  getToken,
  getUsers,
  login,
  updateItem,
} from "./api";
import type { ActiveUser, InventoryItem, ItemFormData } from "./types";

type MetricKey = "user" | "role" | "items" | "rbac";

const emptyForm: ItemFormData = {
  name: "",
  description: "",
  quantity: 0,
  location: "",
};

const emptyUserForm = {
  username: "",
  email: "",
  password: "",
};

const emptyRoleForm = {
  name: "",
  description: "",
};

const emptyPermissionForm = {
  name: "",
  description: "",
};

const permissionOptions = [
  { name: "item:create", description: "Boleh menambah data inventaris" },
  { name: "item:read", description: "Boleh melihat data inventaris" },
  { name: "item:update", description: "Boleh mengubah data inventaris" },
  { name: "item:delete", description: "Boleh menghapus data inventaris" },
  { name: "user:create", description: "Boleh menambah user" },
  { name: "user:read", description: "Boleh melihat daftar user" },
  { name: "user:update", description: "Boleh mengubah data user" },
  { name: "user:delete", description: "Boleh menghapus user" },
  { name: "role:manage", description: "Boleh mengelola role" },
  { name: "permission:manage", description: "Boleh mengelola permission" },
];

function readField(item: InventoryItem, keys: string[], fallback = "-") {
  for (const key of keys) {
    const value = item[key];
    if (value !== undefined && value !== null && value !== "") return String(value);
  }

  return fallback;
}

function itemId(item: InventoryItem) {
  const id = item.id ?? item.itemId ?? item.uuid;
  return typeof id === "string" || typeof id === "number" ? id : null;
}

function formatList(values?: Array<string | Record<string, unknown>>) {
  if (!values?.length) return "-";

  return values
    .map((value) => {
      if (typeof value === "string") return value;
      return String(value.name ?? value.nama ?? value.code ?? value.slug ?? "-");
    })
    .join(", ");
}

function getRoleName(user: ActiveUser | null) {
  if (typeof user?.role === "string") return user.role.toLowerCase();

  const firstRole = user?.roles?.[0];
  if (typeof firstRole === "string") return firstRole.toLowerCase();
  if (firstRole && typeof firstRole === "object") {
    return String(firstRole.name ?? firstRole.nama ?? firstRole.code ?? "").toLowerCase();
  }

  return "user";
}

function getPermissionSet(user: ActiveUser | null) {
  return new Set(
    user?.permissions?.map((permission) => {
      if (typeof permission === "string") return permission;
      return String(permission.name ?? permission.nama ?? permission.code ?? permission.slug ?? "");
    }) ?? [],
  );
}

function errorText(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan yang tidak diketahui.";
}

function normalizeCollection(payload: unknown) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.data)) return record.data;
    if (Array.isArray(record.items)) return record.items;
  }

  return [];
}

function recordId(record: unknown) {
  if (!record || typeof record !== "object") return "";
  const value = (record as Record<string, unknown>).id;
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function recordName(record: unknown) {
  if (!record || typeof record !== "object") return "-";
  const value = record as Record<string, unknown>;
  return String(value.username ?? value.name ?? value.email ?? value.code ?? value.id ?? "-");
}

export default function App() {
  const [token, setToken] = useState(getToken());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [user, setUser] = useState<ActiveUser | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [form, setForm] = useState<ItemFormData>(emptyForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [appError, setAppError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rbacData, setRbacData] = useState({ users: 0, roles: 0, permissions: 0 });
  const [usersList, setUsersList] = useState<unknown[]>([]);
  const [rolesList, setRolesList] = useState<unknown[]>([]);
  const [permissionsList, setPermissionsList] = useState<unknown[]>([]);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [roleForm, setRoleForm] = useState(emptyRoleForm);
  const [permissionForm, setPermissionForm] = useState(emptyPermissionForm);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedPermissionRoleId, setSelectedPermissionRoleId] = useState("");
  const [selectedPermissionId, setSelectedPermissionId] = useState("");
  const [selectedMetric, setSelectedMetric] = useState<MetricKey | null>(null);

  const hasSession = Boolean(token);

  async function loadDashboard() {
    setIsLoading(true);
    setAppError("");

    try {
      const [me, itemList] = await Promise.all([getMe(), getItems()]);
      setUser(me);
      setItems(Array.isArray(itemList) ? itemList : normalizeCollection(itemList));

      const [users, roles, permissions] = await Promise.allSettled([getUsers(), getRoles(), getPermissions()]);
      const userRows = users.status === "fulfilled" ? normalizeCollection(users.value) : [];
      const roleRows = roles.status === "fulfilled" ? normalizeCollection(roles.value) : [];
      const permissionRows = permissions.status === "fulfilled" ? normalizeCollection(permissions.value) : [];
      setUsersList(userRows);
      setRolesList(roleRows);
      setPermissionsList(permissionRows);
      setRbacData({
        users: userRows.length,
        roles: roleRows.length,
        permissions: permissionRows.length,
      });
    } catch (error) {
      setAppError(errorText(error));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (hasSession) {
      void loadDashboard();
    }
  }, [hasSession]);

  const userName = useMemo(() => {
    if (!user) return "User";
    return String(user.name ?? user.nama ?? user.email ?? "User");
  }, [user]);

  const activeRole = getRoleName(user);
  const permissions = getPermissionSet(user);
  const canReadRbac = activeRole === "superadmin" || permissions.has("rbac:read");
  const canCreateItem = activeRole === "superadmin" || activeRole === "admin" || permissions.has("item:create");
  const canUpdateItem = activeRole === "superadmin" || activeRole === "admin" || permissions.has("item:update");
  const canDeleteItem = activeRole === "superadmin" || activeRole === "admin" || permissions.has("item:delete");
  const canManageItems = canCreateItem || canUpdateItem || canDeleteItem;

  const inventoryStats = useMemo(() => {
    const rows = items.map((item) => ({
      id: itemId(item),
      name: readField(item, ["name", "nama", "itemName"], "Item"),
      quantity: Number(readField(item, ["quantity", "stok"], "0")) || 0,
    }));
    const totalQuantity = rows.reduce((total, item) => total + item.quantity, 0);
    const topRows = rows
      .slice()
      .sort((first, second) => second.quantity - first.quantity)
      .slice(0, 4);
    let cursor = 0;
    const colors = ["#1268d8", "#8ebcf2", "#d7a070", "#1f4e68"];
    const segments = topRows.map((item, index) => {
      const start = cursor;
      const percent = totalQuantity ? Math.round((item.quantity / totalQuantity) * 100) : 0;
      cursor += percent;
      return `${colors[index]} ${start}% ${Math.min(cursor, 100)}%`;
    });

    return {
      rows: topRows,
      totalQuantity,
      donut: segments.length ? segments.join(", ") : "#dbe9f0 0% 100%",
      colors,
    };
  }, [items]);

  const metricDetails: Record<MetricKey, { title: string; rows: Array<[string, string]> }> = {
    user: {
      title: "Detail User Aktif",
      rows: [
        ["Nama", userName],
        ["Email", user?.email ? String(user.email) : "-"],
        ["Sumber", "Endpoint /auth/me"],
      ],
    },
    role: {
      title: "Detail Role dan Permission",
      rows: [
        ["Role", activeRole],
        ["Permission", formatList(user?.permissions)],
        ["Akses item", canManageItems ? "Kelola inventaris" : "Baca data inventaris"],
      ],
    },
    items: {
      title: "Detail Inventaris",
      rows: [
        ["Jenis item", String(items.length)],
        ["Total stok", String(inventoryStats.totalQuantity)],
        ["Status", isLoading ? "Memuat data" : "Data siap"],
      ],
    },
    rbac: {
      title: "Detail RBAC",
      rows: [
        ["Status akses", canReadRbac ? "Terbuka" : "Terkunci"],
        ["User", canReadRbac ? String(rbacData.users) : "Khusus superadmin"],
        ["Role", canReadRbac ? String(rbacData.roles) : "Khusus superadmin"],
        ["Permission", canReadRbac ? String(rbacData.permissions) : "Khusus superadmin"],
      ],
    },
  };

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    try {
      const jwt = await login({ email, password });
      setToken(jwt);
      setPassword("");
    } catch (error) {
      setLoginError(errorText(error));
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppError("");

    if (!canReadRbac) {
      setAppError("Hanya superadmin yang dapat menambah user.");
      return;
    }

    try {
      await createUser(userForm);
      setUserForm(emptyUserForm);
      await loadDashboard();
    } catch (error) {
      setAppError(errorText(error));
    }
  }

  async function handleCreateRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppError("");

    if (!canReadRbac) {
      setAppError("Hanya superadmin yang dapat menambah role.");
      return;
    }

    try {
      await createRole(roleForm);
      setRoleForm(emptyRoleForm);
      await loadDashboard();
    } catch (error) {
      setAppError(errorText(error));
    }
  }

  async function handleCreatePermission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppError("");

    if (!canReadRbac) {
      setAppError("Hanya superadmin yang dapat menambah permission.");
      return;
    }

    try {
      await createPermission(permissionForm);
      setPermissionForm(emptyPermissionForm);
      await loadDashboard();
    } catch (error) {
      setAppError(errorText(error));
    }
  }

  async function handleAssignRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppError("");

    if (!selectedUserId || !selectedRoleId) {
      setAppError("Pilih user dan role terlebih dahulu.");
      return;
    }

    try {
      await assignRoleToUser(selectedUserId, selectedRoleId);
      setSelectedUserId("");
      setSelectedRoleId("");
      await loadDashboard();
    } catch (error) {
      setAppError(errorText(error));
    }
  }

  async function handleAssignPermission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppError("");

    if (!selectedPermissionRoleId || !selectedPermissionId) {
      setAppError("Pilih role dan permission terlebih dahulu.");
      return;
    }

    try {
      await assignPermissionToRole(selectedPermissionRoleId, selectedPermissionId);
      setSelectedPermissionRoleId("");
      setSelectedPermissionId("");
      await loadDashboard();
    } catch (error) {
      setAppError(errorText(error));
    }
  }

  async function handleSubmitItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppError("");

    try {
      if ((editingId && !canUpdateItem) || (!editingId && !canCreateItem)) {
        setAppError("Role Anda tidak memiliki permission untuk menyimpan data item.");
        return;
      }

      if (editingId) {
        await updateItem(editingId, form);
      } else {
        await createItem(form);
      }

      setForm(emptyForm);
      setEditingId(null);
      setIsFormOpen(false);
      await loadDashboard();
    } catch (error) {
      setAppError(errorText(error));
    }
  }

  function handleEdit(item: InventoryItem) {
    if (!canUpdateItem) {
      setAppError("Role Anda tidak memiliki permission untuk edit item.");
      return;
    }

    const id = itemId(item);
    if (!id) {
      setAppError("Item ini tidak memiliki id, sehingga belum bisa diedit.");
      return;
    }

    setEditingId(id);
    setIsFormOpen(true);
    setForm({
      name: readField(item, ["name", "nama", "itemName"], ""),
      description: readField(item, ["description", "deskripsi"], ""),
      quantity: Number(readField(item, ["quantity", "stok"], "0")),
      location: readField(item, ["location", "lokasi"], ""),
    });
  }

  function handleCreate() {
    if (!canCreateItem) {
      setAppError("Role Anda tidak memiliki permission untuk tambah item.");
      return;
    }

    setEditingId(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  }

  function handleCancelForm() {
    setEditingId(null);
    setForm(emptyForm);
    setIsFormOpen(false);
  }

  async function handleDelete(item: InventoryItem) {
    if (!canDeleteItem) {
      setAppError("Role Anda tidak memiliki permission untuk hapus item.");
      return;
    }

    const id = itemId(item);
    if (!id) {
      setAppError("Item ini tidak memiliki id, sehingga belum bisa dihapus.");
      return;
    }

    const approved = window.confirm(`Hapus ${readField(item, ["name", "nama", "itemName"], "item ini")}?`);
    if (!approved) return;

    try {
      await deleteItem(id);
      await loadDashboard();
    } catch (error) {
      setAppError(errorText(error));
    }
  }

  function handleLogout() {
    clearToken();
    setToken(null);
    setUser(null);
    setItems([]);
    setRbacData({ users: 0, roles: 0, permissions: 0 });
  }

  if (!hasSession) {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <div>
            <p className="eyebrow">PWL RBAC</p>
            <h1>Inventaris Barang</h1>
            <p className="muted">Masuk untuk mengelola data inventaris sesuai role dan permission akun.</p>
          </div>

          <form className="stack" onSubmit={handleLogin}>
            <label>
              Email
              <input
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@example.com"
                required
                type="email"
                value={email}
              />
            </label>

            <label>
              Password
              <input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Masukkan password"
                required
                type="password"
                value={password}
              />
            </label>

            {loginError ? <div className="alert">{loginError}</div> : null}

            <button disabled={isLoggingIn} type="submit">
              {isLoggingIn ? "Memproses..." : "Login"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Inventaris Barang</h1>
        </div>
        <div className="topbar-actions">
          <button className="secondary" onClick={() => void loadDashboard()} type="button">
            Refresh
          </button>
          <button className="danger-outline" onClick={handleLogout} type="button">
            Logout
          </button>
        </div>
      </header>

      {appError ? <div className="alert">{appError}</div> : null}

      <section className="summary-grid">
        <article className="metric-card" onClick={() => setSelectedMetric("user")} role="button" tabIndex={0}>
          <div className="metric-icon">U</div>
          <div>
            <span>User aktif</span>
            <strong>{userName}</strong>
            <small>{user?.email ? String(user.email) : "Data dari /auth/me"}</small>
          </div>
        </article>
        <article className="metric-card" onClick={() => setSelectedMetric("role")} role="button" tabIndex={0}>
          <div className="metric-icon">R</div>
          <div>
            <span>Role</span>
            <strong>{activeRole}</strong>
            <small>{formatList(user?.permissions)}</small>
          </div>
        </article>
        <article className="metric-card" onClick={() => setSelectedMetric("items")} role="button" tabIndex={0}>
          <div className="metric-icon">I</div>
          <div>
            <span>Total item</span>
            <strong>{items.length}</strong>
            <small>{isLoading ? "Memuat data..." : "Siap dikelola"}</small>
          </div>
        </article>
        <article className="metric-card" onClick={() => setSelectedMetric("rbac")} role="button" tabIndex={0}>
          <div className="metric-icon">P</div>
          <div>
            <span>RBAC</span>
            <strong>{canReadRbac ? `${rbacData.roles} role` : "Terkunci"}</strong>
            <small>
              {canReadRbac ? `${rbacData.users} user, ${rbacData.permissions} permission` : "Khusus superadmin"}
            </small>
          </div>
        </article>
      </section>

      {selectedMetric ? (
        <section className="metric-detail">
          <div className="metric-detail-header">
            <div>
              <p className="eyebrow">Informasi</p>
              <h2>{metricDetails[selectedMetric].title}</h2>
            </div>
            <button className="secondary" onClick={() => setSelectedMetric(null)} type="button">
              Tutup
            </button>
          </div>
          <div className="metric-detail-body">
            <div className="detail-grid">
              {metricDetails[selectedMetric].rows.map(([label, value]) => (
                <div className="detail-row" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {canReadRbac ? (
        <section className="rbac-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Manajemen RBAC</p>
              <h2>User, role, dan permission</h2>
            </div>
          </div>

          <div className="rbac-grid">
            <form className="rbac-form" onSubmit={handleCreateUser}>
              <h3>Tambah User</h3>
              <input
                onChange={(event) => setUserForm((current) => ({ ...current, username: event.target.value }))}
                placeholder="Username"
                required
                value={userForm.username}
              />
              <input
                onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="Email"
                required
                type="email"
                value={userForm.email}
              />
              <input
                onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="Password"
                required
                type="password"
                value={userForm.password}
              />
              <button type="submit">Tambah User</button>
            </form>

            <form className="rbac-form" onSubmit={handleCreateRole}>
              <h3>Tambah Role</h3>
              <input
                onChange={(event) => setRoleForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Nama role"
                required
                value={roleForm.name}
              />
              <input
                onChange={(event) => setRoleForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Deskripsi"
                value={roleForm.description}
              />
              <button type="submit">Tambah Role</button>
            </form>

            <form className="rbac-form" onSubmit={handleCreatePermission}>
              <h3>Tambah Permission</h3>
              <select
                onChange={(event) => {
                  const selected = permissionOptions.find((option) => option.name === event.target.value);
                  setPermissionForm({
                    name: event.target.value,
                    description: selected?.description ?? "",
                  });
                }}
                required
                value={permissionForm.name}
              >
                <option value="">Pilih permission</option>
                {permissionOptions.map((option) => (
                  <option key={option.name} value={option.name}>
                    {option.name}
                  </option>
                ))}
              </select>
              <input
                onChange={(event) => setPermissionForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Deskripsi"
                value={permissionForm.description}
              />
              <button type="submit">Tambah Permission</button>
            </form>
          </div>

          <div className="rbac-grid two">
            <form className="rbac-form" onSubmit={handleAssignRole}>
              <h3>Assign Role ke User</h3>
              <select onChange={(event) => setSelectedUserId(event.target.value)} required value={selectedUserId}>
                <option value="">Pilih user</option>
                {usersList.map((row) => {
                  const id = recordId(row);
                  return id ? (
                    <option key={id} value={id}>
                      {recordName(row)}
                    </option>
                  ) : null;
                })}
              </select>
              <select onChange={(event) => setSelectedRoleId(event.target.value)} required value={selectedRoleId}>
                <option value="">Pilih role</option>
                {rolesList.map((row) => {
                  const id = recordId(row);
                  return id ? (
                    <option key={id} value={id}>
                      {recordName(row)}
                    </option>
                  ) : null;
                })}
              </select>
              <button type="submit">Assign Role</button>
            </form>

            <form className="rbac-form" onSubmit={handleAssignPermission}>
              <h3>Assign Permission ke Role</h3>
              <select
                onChange={(event) => setSelectedPermissionRoleId(event.target.value)}
                required
                value={selectedPermissionRoleId}
              >
                <option value="">Pilih role</option>
                {rolesList.map((row) => {
                  const id = recordId(row);
                  return id ? (
                    <option key={id} value={id}>
                      {recordName(row)}
                    </option>
                  ) : null;
                })}
              </select>
              <select
                onChange={(event) => setSelectedPermissionId(event.target.value)}
                required
                value={selectedPermissionId}
              >
                <option value="">Pilih permission</option>
                {permissionsList.map((row) => {
                  const id = recordId(row);
                  return id ? (
                    <option key={id} value={id}>
                      {recordName(row)}
                    </option>
                  ) : null;
                })}
              </select>
              <button type="submit">Assign Permission</button>
            </form>
          </div>
        </section>
      ) : null}

      <section className="content-grid">
        {isFormOpen ? (
          <form className="item-form" onSubmit={handleSubmitItem}>
            <div className="form-title">
              <div className="panel-mark">E</div>
              <div>
                <p className="eyebrow">{editingId ? "Edit Item" : "Tambah Item"}</p>
                <h2>{editingId ? "Perbarui inventaris" : "Item baru"}</h2>
              </div>
            </div>

            <label>
              Nama barang
              <input
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Contoh: Laptop Lab"
                required
                value={form.name}
              />
            </label>

            <label>
              Deskripsi
              <textarea
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Kondisi, merek, atau catatan singkat"
                rows={4}
                value={form.description}
              />
            </label>

            <div className="form-row">
              <label>
                Jumlah
                <input
                  min="0"
                  onChange={(event) => setForm((current) => ({ ...current, quantity: Number(event.target.value) }))}
                  required
                  type="number"
                  value={form.quantity}
                />
              </label>

              <label>
                Lokasi
                <input
                  onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                  placeholder="Gudang A"
                  value={form.location}
                />
              </label>
            </div>

            <div className="button-row">
              <button type="submit">{editingId ? "Simpan Perubahan" : "Tambah Item"}</button>
              <button className="secondary" onClick={handleCancelForm} type="button">
                Batal
              </button>
            </div>
          </form>
        ) : (
          <aside className="insight-panel">
            <div>
              <p className="eyebrow">Statistik Item</p>
              <h2>Komposisi stok</h2>
            </div>

            <div className="donut-shell">
              <div
                className="donut-chart"
                style={{ "--donut": inventoryStats.donut } as CSSProperties}
              >
                <span>Total Stok</span>
                <strong>{inventoryStats.totalQuantity}</strong>
              </div>
            </div>

            <div className="legend-list">
              {inventoryStats.rows.length ? (
                inventoryStats.rows.map((item, index) => {
                  const percent = inventoryStats.totalQuantity
                    ? Math.round((item.quantity / inventoryStats.totalQuantity) * 100)
                    : 0;
                  return (
                    <div className="legend-row" key={String(item.id ?? item.name)}>
                      <span
                        className="legend-dot"
                        style={{ "--dot": inventoryStats.colors[index] } as CSSProperties}
                      />
                      <strong>{item.name}</strong>
                      <small>
                        {item.quantity} ({percent}%)
                      </small>
                    </div>
                  );
                })
              ) : (
                <p className="empty">Belum ada data untuk ditampilkan.</p>
              )}
            </div>

            {canCreateItem ? (
              <button onClick={handleCreate} type="button">
                Tambah Item
              </button>
            ) : (
              <div className="notice">Role user hanya dapat melihat data inventaris.</div>
            )}
          </aside>
        )}

        <section className="table-wrap">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Data Item</p>
              <h2>Daftar Inventaris</h2>
            </div>
            {canCreateItem ? (
              <button className="secondary" onClick={handleCreate} type="button">
                Tambah
              </button>
            ) : null}
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Deskripsi</th>
                  <th>Jumlah</th>
                  <th>Lokasi</th>
                  {canManageItems ? <th>Aksi</th> : null}
                </tr>
              </thead>
              <tbody>
                {items.length ? (
                  items.map((item, index) => (
                    <tr key={String(itemId(item) ?? index)}>
                      <td>{readField(item, ["name", "nama", "itemName"])}</td>
                      <td>{readField(item, ["description", "deskripsi"])}</td>
                      <td>{readField(item, ["quantity", "stok"], "0")}</td>
                      <td>{readField(item, ["location", "lokasi"])}</td>
                      {canManageItems ? (
                        <td>
                          <div className="table-actions">
                            {canUpdateItem ? (
                              <button className="secondary" onClick={() => handleEdit(item)} type="button">
                                Edit
                              </button>
                            ) : null}
                            {canDeleteItem ? (
                              <button className="danger" onClick={() => void handleDelete(item)} type="button">
                                Hapus
                              </button>
                            ) : null}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="empty" colSpan={canManageItems ? 5 : 4}>
                      Belum ada data inventaris.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
