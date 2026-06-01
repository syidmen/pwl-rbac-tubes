import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import {
  ApiError,
  assignPermissionToRole,
  assignRoleToUser,
  clearToken,
  createItem,
  createRole,
  createUser,
  deleteItem,
  deleteRole,
  deleteUser,
  getItems,
  getMe,
  getPermissions,
  getRoles,
  getToken,
  getUsers,
  login,
  register,
  removePermissionFromRole,
  updateItem,
  updateProfile,
} from "./api";
import type { ActiveUser, InventoryItem, ItemFormData } from "./types";

type MetricKey = "user" | "role" | "items" | "rbac";
type AppDialog =
  | null
  | {
      variant: "confirm";
      title: string;
      message: string;
      confirmText: string;
      tone?: "primary" | "danger";
      onConfirm: () => Promise<void> | void;
    }
  | {
      variant: "success";
      title: string;
      message: string;
    };

const CATEGORY_STORAGE_KEY = "pwl_inventory_categories";
const ROOM_STORAGE_KEY = "pwl_inventory_rooms";
const ROLE_DESCRIPTION_MAX_LENGTH = 120;

const defaultCategories = [
  "Buku Pelajaran",
  "Elektronik",
  "Alat Laboratorium",
  "Perabot Kelas",
  "Peralatan Olahraga",
  "Alat Kebersihan",
  "ATK",
  "Sarana Kelas",
];

const defaultRooms = [
  "Gudang Utama",
  "Ruang Kelas X",
  "Ruang Kelas XI",
  "Ruang Kelas XII",
  "Laboratorium Komputer",
  "Laboratorium IPA",
  "Perpustakaan",
  "Ruang Guru",
  "Aula",
];

function loadStoredList(key: string, fallback: string[]) {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return fallback;
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return fallback;
    return Array.from(new Set([...fallback, ...parsed.filter((value) => typeof value === "string" && value.trim())]));
  } catch {
    return fallback;
  }
}

function saveStoredList(key: string, values: string[]) {
  localStorage.setItem(key, JSON.stringify(values));
}

function categoryPrefix(category: string) {
  const words = category
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const prefix = words.length > 1
    ? words.map((word) => word[0]).join("")
    : category.slice(0, 3);

  return (prefix || "BRG").toUpperCase().slice(0, 4);
}

function slugCode(value: string, fallback: string) {
  const slug = value
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .join("")
    .toUpperCase()
    .slice(0, 14);

  return slug || fallback;
}

const naturalSorter = new Intl.Collator("id-ID", {
  numeric: true,
  sensitivity: "base",
});

function generateItemCode(category: string, name: string, entry = 1) {
  const prefix = categoryPrefix(category);
  const uniqueName = slugCode(name, "ITEM");
  return `${prefix}-${uniqueName}-${String(entry).padStart(3, "0")}`;
}

function sameItemGroup(item: InventoryItem, category: string, name: string) {
  return readField(item, ["category", "kategori"], "").trim().toLowerCase() === category.trim().toLowerCase()
    && readField(item, ["name", "nama", "itemName"], "").trim().toLowerCase() === name.trim().toLowerCase();
}

function codeEntryNumber(code: string, category: string, name: string) {
  const prefix = `${categoryPrefix(category)}-${slugCode(name, "ITEM")}-`;
  if (!code.startsWith(prefix)) return null;

  const entry = Number(code.slice(prefix.length));
  return Number.isInteger(entry) && entry > 0 ? entry : null;
}

const emptyForm: ItemFormData = {
  code: "",
  name: "",
  category: "",
  description: "",
  quantity: 1,
  location: "",
  condition: "",
  status: "Tersedia",
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

function activeUserId(user: ActiveUser | null) {
  if (!user) return "";
  const value = user.id ?? user.userId ?? user.sub;
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function activeUserRoleKeys(user: ActiveUser | null) {
  const keys = new Set<string>();

  user?.roles?.forEach((role) => {
    if (typeof role === "string") {
      keys.add(role.toLowerCase());
      return;
    }

    if (role && typeof role === "object") {
      ["id", "name", "nama", "code"].forEach((key) => {
        const value = role[key];
        if (typeof value === "string" || typeof value === "number") {
          keys.add(String(value).toLowerCase());
        }
      });
    }
  });

  return keys;
}

function assignedRoleKeys(users: unknown[]) {
  const keys = new Set<string>();

  users.forEach((userRow) => {
    userRoleRecords(userRow).forEach((role) => {
      ["id", "name", "nama", "code"].forEach((key) => {
        const value = role[key];
        if (typeof value === "string" || typeof value === "number") {
          keys.add(String(value).toLowerCase());
        }
      });
    });
  });

  return keys;
}

function userRoleRecords(userRow: unknown) {
  if (!userRow || typeof userRow !== "object") return [];

  const roles = (userRow as Record<string, unknown>).roles;
  if (!Array.isArray(roles)) return [];

  return roles
    .map((roleRow) => {
      const role = roleRow && typeof roleRow === "object" && "role" in roleRow
        ? (roleRow as Record<string, unknown>).role
        : roleRow;

      return role && typeof role === "object" ? role as Record<string, unknown> : null;
    })
    .filter((role): role is Record<string, unknown> => Boolean(role));
}

function userRoleLabel(userRow: unknown) {
  const names = userRoleRecords(userRow)
    .map((role) => String(role.name ?? role.nama ?? role.code ?? role.id ?? ""))
    .filter(Boolean);

  return names.length ? names.join(", ") : "belum ada role";
}

function userHasRole(userRow: unknown, roleName: string) {
  const normalizedRoleName = roleName.toLowerCase();

  return userRoleRecords(userRow).some((role) =>
    String(role.name ?? role.nama ?? role.code ?? "").toLowerCase() === normalizedRoleName,
  );
}

function roleRecordName(roleRow: unknown) {
  if (!roleRow || typeof roleRow !== "object") return "";
  const value = roleRow as Record<string, unknown>;
  return String(value.name ?? value.nama ?? value.code ?? value.id ?? "").toLowerCase();
}

function recordName(record: unknown) {
  if (!record || typeof record !== "object") return "-";
  const value = record as Record<string, unknown>;
  return String(value.username ?? value.name ?? value.email ?? value.code ?? value.id ?? "-");
}

function roleDescription(record: unknown) {
  if (!record || typeof record !== "object") return "";
  const value = (record as Record<string, unknown>).description;
  return typeof value === "string" ? value.trim() : "";
}

function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength).trimEnd()}...` : value;
}

function rolePermissionIds(role: unknown) {
  if (!role || typeof role !== "object") return [];
  const record = role as Record<string, unknown>;
  const permissions = Array.isArray(record.permissions) ? record.permissions : [];

  return permissions
    .map((row) => {
      if (!row || typeof row !== "object") return "";
      const permissionRecord = row as Record<string, unknown>;
      return recordId(permissionRecord.permission ?? permissionRecord);
    })
    .filter(Boolean);
}

function itemRowClass(item: InventoryItem) {
  const status = readField(item, ["status"], "").toLowerCase();
  const condition = readField(item, ["condition", "kondisi"], "").toLowerCase();

  if (status === "hilang") return "row-lost";
  if (condition === "rusak") return "row-damaged";
  return "";
}

export default function App() {
  const [token, setToken] = useState(getToken());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [user, setUser] = useState<ActiveUser | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [form, setForm] = useState<ItemFormData>(emptyForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [appError, setAppError] = useState("");
  const [dialog, setDialog] = useState<AppDialog>(null);
  const [isDialogBusy, setIsDialogBusy] = useState(false);
  const [confirmationLoadingText, setConfirmationLoadingText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [conditionFilter, setConditionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isRbacOpen, setIsRbacOpen] = useState(false);
  const [isAssetSettingsOpen, setIsAssetSettingsOpen] = useState(false);
  const [rbacData, setRbacData] = useState({ users: 0, roles: 0, permissions: 0 });
  const [usersList, setUsersList] = useState<unknown[]>([]);
  const [rolesList, setRolesList] = useState<unknown[]>([]);
  const [permissionsList, setPermissionsList] = useState<unknown[]>([]);
  const [expandedRoleDescriptions, setExpandedRoleDescriptions] = useState<string[]>([]);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [roleForm, setRoleForm] = useState(emptyRoleForm);
  const [profileForm, setProfileForm] = useState({ username: "", email: "", password: "" });
  const [categoryOptions, setCategoryOptions] = useState(() => loadStoredList(CATEGORY_STORAGE_KEY, defaultCategories));
  const [roomOptions, setRoomOptions] = useState(() => loadStoredList(ROOM_STORAGE_KEY, defaultRooms));
  const [newCategory, setNewCategory] = useState("");
  const [newRoom, setNewRoom] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedPermissionRoleId, setSelectedPermissionRoleId] = useState("");
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey | null>(null);

  const hasSession = Boolean(token);

  function notifySuccess(message: string) {
    setDialog({
      variant: "success",
      title: "Berhasil",
      message,
    });
  }

  function requestConfirmation(
    title: string,
    message: string,
    onConfirm: () => Promise<void> | void,
    confirmText = "Simpan",
    tone: "primary" | "danger" = "primary",
  ) {
    setDialog({
      variant: "confirm",
      title,
      message,
      confirmText,
      tone,
      onConfirm,
    });
  }

  function toggleRoleDescription(roleId: string) {
    setExpandedRoleDescriptions((current) =>
      current.includes(roleId)
        ? current.filter((id) => id !== roleId)
        : [...current, roleId],
    );
  }

  async function loadDashboard() {
    setIsLoading(true);
    setAppError("");

    try {
      const [me, itemList] = await Promise.all([getMe(), getItems()]);
      setUser(me);
      setProfileForm((current) => ({
        username: String(me.username ?? me.name ?? current.username ?? ""),
        email: String(me.email ?? current.email ?? ""),
        password: "",
      }));
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
  const currentUserId = activeUserId(user);
  const currentUserRoleKeys = activeUserRoleKeys(user);
  const usedRoleKeys = assignedRoleKeys(usersList);
  const selectedUser = usersList.find((row) => recordId(row) === selectedUserId);
  const selectedRole = rolesList.find((row) => recordId(row) === selectedRoleId);
  const selectedPermissionRole = rolesList.find((row) => recordId(row) === selectedPermissionRoleId);
  const isSelectedPermissionRoleAdmin = recordName(selectedPermissionRole).toLowerCase() === "admin";
  const adminUsersCount = usersList.filter((row) => userHasRole(row, "admin")).length;
  const isReplacingLastAdminRole = Boolean(
    selectedUser
      && userHasRole(selectedUser, "admin")
      && roleRecordName(selectedRole) !== "admin"
      && adminUsersCount <= 1,
  );
  const permissions = getPermissionSet(user);
  const isAdminDashboard = activeRole === "admin";
  const canReadRbac = isAdminDashboard || permissions.has("rbac:read");
  const canCreateItem = activeRole === "admin" || permissions.has("item:create");
  const canUpdateItem = activeRole === "admin" || permissions.has("item:update");
  const canDeleteItem = activeRole === "admin" || permissions.has("item:delete");
  const canManageItems = canCreateItem || canUpdateItem || canDeleteItem;
  const selectedRolePermissionIds = useMemo(() => {
    const role = rolesList.find((row) => recordId(row) === selectedPermissionRoleId);
    return rolePermissionIds(role);
  }, [rolesList, selectedPermissionRoleId]);

  const inventoryStats = useMemo(() => {
    const categoryMap = new Map<string, number>();

    items.forEach((item) => {
      const category = readField(item, ["category", "kategori"], "Tanpa Kategori");
      categoryMap.set(category, (categoryMap.get(category) ?? 0) + 1);
    });

    const rows = Array.from(categoryMap.entries()).map(([name, quantity]) => ({
      id: name,
      name,
      quantity,
    }));
    const totalQuantity = items.length;
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

  const conditionOptions = ["Baik", "Rusak"];
  const statusOptions = ["Tersedia", "Hilang", "Dipinjam"];

  const filteredItems = useMemo(() => {
    const keyword = itemSearch.trim().toLowerCase();

    return items
      .filter((item) => {
        const searchable = readField(item, ["name", "nama", "itemName"], "").toLowerCase();
        const itemCategory = readField(item, ["category", "kategori"], "");
        const itemCondition = readField(item, ["condition", "kondisi"], "");
        const itemStatus = readField(item, ["status"], "");

        return (!keyword || searchable.includes(keyword))
          && (!categoryFilter || itemCategory === categoryFilter)
          && (!conditionFilter || itemCondition === conditionFilter)
          && (!statusFilter || itemStatus === statusFilter);
      })
      .slice()
      .sort((first, second) => {
        const firstName = readField(first, ["name", "nama", "itemName"], "");
        const secondName = readField(second, ["name", "nama", "itemName"], "");
        const byName = naturalSorter.compare(firstName, secondName);
        if (byName !== 0) return byName;

        const byCategory = naturalSorter.compare(
          readField(first, ["category", "kategori"], ""),
          readField(second, ["category", "kategori"], ""),
        );
        if (byCategory !== 0) return byCategory;

        return naturalSorter.compare(readField(first, ["code"], ""), readField(second, ["code"], ""));
      });
  }, [categoryFilter, conditionFilter, itemSearch, items, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const visibleItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const visibleItemIds = visibleItems
    .map((item) => itemId(item))
    .filter((id): id is string | number => id !== null)
    .map(String);
  const isAllVisibleSelected = visibleItemIds.length > 0
    && visibleItemIds.every((id) => selectedItemIds.includes(id));

  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, conditionFilter, itemSearch, itemsPerPage, statusFilter]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    const existingIds = new Set(items.map((item) => itemId(item)).filter(Boolean).map(String));
    setSelectedItemIds((current) => current.filter((id) => existingIds.has(id)));
  }, [items]);

  useEffect(() => {
    document.body.classList.toggle("modal-open", Boolean(dialog));
    return () => document.body.classList.remove("modal-open");
  }, [dialog]);

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
        ["Total item", String(items.length)],
        ["Kategori terisi", String(inventoryStats.rows.length)],
        ["Status", isLoading ? "Memuat data" : "Data siap"],
      ],
    },
    rbac: {
      title: "Detail RBAC",
      rows: [
        ["Status akses", canReadRbac ? "Terbuka" : "Terkunci"],
        ["User", canReadRbac ? String(rbacData.users) : "Khusus admin"],
        ["Role", canReadRbac ? String(rbacData.roles) : "Khusus admin"],
        ["Permission", canReadRbac ? String(rbacData.permissions) : "Khusus admin"],
      ],
    },
  };

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    try {
      if (authMode === "register") {
        await register({ username, email, password });
      }

      const jwt = await login({ email, password });
      setToken(jwt);
      setUsername("");
      setPassword("");
    } catch (error) {
      setLoginError(errorText(error));
    } finally {
      setIsLoggingIn(false);
    }
  }

  function handleUpdateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppError("");

    requestConfirmation("Simpan perubahan profil?", "Data profil user aktif akan diperbarui.", async () => {
      try {
        const updatedUser = await updateProfile({
          username: profileForm.username,
          email: profileForm.email,
          password: profileForm.password || undefined,
        });
        setUser((current) => ({
          ...(current ?? {}),
          ...updatedUser,
        }));
        setProfileForm((current) => ({ ...current, password: "" }));
        await loadDashboard();
        notifySuccess("Edit profil berhasil.");
      } catch (error) {
        setAppError(errorText(error));
      }
    });
  }

  function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppError("");

    if (!canReadRbac) {
      setAppError("Hanya admin yang dapat menambah user.");
      return;
    }

    requestConfirmation("Tambah user?", `User ${userForm.username} akan dibuat.`, async () => {
      try {
        await createUser(userForm);
        setUserForm(emptyUserForm);
        await loadDashboard();
        notifySuccess("Tambah user berhasil.");
      } catch (error) {
        setAppError(errorText(error));
      }
    });
  }

  function handleCreateRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppError("");

    if (!canReadRbac) {
      setAppError("Hanya admin yang dapat menambah role.");
      return;
    }

    requestConfirmation("Tambah role?", `Role ${roleForm.name} akan dibuat.`, async () => {
      try {
        await createRole(roleForm);
        setRoleForm(emptyRoleForm);
        await loadDashboard();
        notifySuccess("Tambah role berhasil.");
      } catch (error) {
        setAppError(errorText(error));
      }
    });
  }

  function handleAssignRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppError("");

    if (!selectedUserId || !selectedRoleId) {
      setAppError("Pilih user dan role terlebih dahulu.");
      return;
    }

    if (isReplacingLastAdminRole) {
      setAppError("Role admin terakhir tidak boleh diganti.");
      return;
    }

    requestConfirmation("Assign role?", "Role user akan diganti dengan role terpilih.", async () => {
      try {
        await assignRoleToUser(selectedUserId, selectedRoleId);
        setSelectedUserId("");
        setSelectedRoleId("");
        await loadDashboard();
        notifySuccess("Assign role berhasil.");
      } catch (error) {
        setAppError(errorText(error));
      }
    });
  }

  function handleAssignPermission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppError("");

    if (!selectedPermissionRoleId) {
      setAppError("Pilih role terlebih dahulu.");
      return;
    }

    if (isSelectedPermissionRoleAdmin) {
      setAppError("Permission role ADMIN tidak boleh diubah.");
      return;
    }

    requestConfirmation("Simpan permission role?", "Permission role akan disesuaikan dengan checklist.", async () => {
      try {
        const currentIds = new Set(selectedRolePermissionIds);
        const nextIds = new Set(selectedPermissionIds);
        const permissionsToAdd = selectedPermissionIds.filter((permissionId) => !currentIds.has(permissionId));
        const permissionsToRemove = selectedRolePermissionIds.filter((permissionId) => !nextIds.has(permissionId));

        await Promise.all([
          ...permissionsToAdd.map((permissionId) => assignPermissionToRole(selectedPermissionRoleId, permissionId)),
          ...permissionsToRemove.map((permissionId) => removePermissionFromRole(selectedPermissionRoleId, permissionId)),
        ]);
        await loadDashboard();
        notifySuccess("Edit permission role berhasil.");
      } catch (error) {
        setAppError(errorText(error));
      }
    });
  }

  function handleAddCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = newCategory.trim();
    if (!value) return;

    requestConfirmation("Tambah kategori?", `Kategori ${value} akan ditambahkan.`, () => {
      const nextCategories = Array.from(new Set([...categoryOptions, value])).sort();
      setCategoryOptions(nextCategories);
      saveStoredList(CATEGORY_STORAGE_KEY, nextCategories);
      setNewCategory("");
      notifySuccess("Tambah kategori berhasil.");
    });
  }

  function handleAddRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = newRoom.trim();
    if (!value) return;

    requestConfirmation("Tambah ruangan?", `Ruangan ${value} akan ditambahkan.`, () => {
      const nextRooms = Array.from(new Set([...roomOptions, value])).sort();
      setRoomOptions(nextRooms);
      saveStoredList(ROOM_STORAGE_KEY, nextRooms);
      setNewRoom("");
      notifySuccess("Tambah ruangan berhasil.");
    });
  }

  function handleDeleteCategory(category: string) {
    requestConfirmation("Hapus kategori?", `Kategori ${category} akan dihapus dari pilihan.`, () => {
      const nextCategories = categoryOptions.filter((value) => value !== category);
      setCategoryOptions(nextCategories);
      saveStoredList(CATEGORY_STORAGE_KEY, nextCategories);
      setCategoryFilter((current) => (current === category ? "" : current));
      setForm((current) => (current.category === category ? { ...current, category: "", code: "" } : current));
      notifySuccess("Hapus kategori berhasil.");
    }, "Hapus", "danger");
  }

  function handleDeleteRoom(room: string) {
    requestConfirmation("Hapus ruangan?", `Ruangan ${room} akan dihapus dari pilihan.`, () => {
      const nextRooms = roomOptions.filter((value) => value !== room);
      setRoomOptions(nextRooms);
      saveStoredList(ROOM_STORAGE_KEY, nextRooms);
      setForm((current) => (current.location === room ? { ...current, location: "" } : current));
      notifySuccess("Hapus ruangan berhasil.");
    }, "Hapus", "danger");
  }

  function nextEntryNumbers(category: string, name: string, count: number, excludedItemId?: string | number) {
    const excludedId = excludedItemId ? String(excludedItemId) : "";
    const usedEntries = new Set(
      items
        .filter((item) => String(itemId(item) ?? "") !== excludedId && sameItemGroup(item, category, name))
        .map((item) => codeEntryNumber(readField(item, ["code"], ""), category, name))
        .filter((entry): entry is number => entry !== null),
    );
    const entries: number[] = [];
    let cursor = 1;

    while (entries.length < count) {
      if (!usedEntries.has(cursor)) {
        entries.push(cursor);
        usedEntries.add(cursor);
      }
      cursor += 1;
    }

    return entries;
  }

  async function handleDeleteUser(id: string) {
    requestConfirmation("Hapus user?", "User ini akan dihapus dari sistem.", async () => {
      try {
        setAppError("");
        await deleteUser(id);
        await loadDashboard();
        notifySuccess("Hapus user berhasil.");
      } catch (error) {
        setAppError(errorText(error));
      }
    }, "Hapus", "danger");
  }

  async function handleDeleteRole(id: string) {
    requestConfirmation("Hapus role?", "Role ini akan dihapus dari sistem.", async () => {
      try {
        setAppError("");
        await deleteRole(id);
        setSelectedRoleId((current) => (current === id ? "" : current));
        setSelectedPermissionRoleId((current) => (current === id ? "" : current));
        await loadDashboard();
        notifySuccess("Hapus role berhasil.");
      } catch (error) {
        setAppError(errorText(error));
      }
    }, "Hapus", "danger");
  }

  function handleSubmitItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppError("");

    if ((editingId && !canUpdateItem) || (!editingId && !canCreateItem)) {
      setAppError("Role Anda tidak memiliki permission untuk menyimpan data item.");
      return;
    }

    if (!form.name?.trim()) {
      setAppError("Nama barang wajib diisi.");
      return;
    }

    if (form.quantity <= 0) {
      setAppError("Jumlah barang harus lebih dari 0.");
      return;
    }

    requestConfirmation(editingId ? "Simpan edit barang?" : "Tambah barang?", editingId
      ? `Perubahan barang ${form.name} akan disimpan.`
      : `${form.quantity} entry barang ${form.name} akan ditambahkan.`, async () => {
      const itemBase = {
        ...form,
        name: form.name.trim(),
        description: form.description.trim(),
        quantity: 1,
      };

      if (editingId) {
        const existing = items.find((item) => String(itemId(item)) === String(editingId));
        const keepCode = existing ? sameItemGroup(existing, form.category, form.name) : false;
        const entry = keepCode ? 1 : nextEntryNumbers(form.category, form.name, 1, editingId)[0];

        await updateItem(editingId, {
          ...itemBase,
          code: keepCode && existing ? readField(existing, ["code"], form.code) : generateItemCode(form.category, form.name, entry),
        });
        notifySuccess("Edit barang berhasil.");
      } else {
        const quantity = Number(form.quantity);
        const entries = nextEntryNumbers(form.category, form.name, quantity);
        await Promise.all(
          Array.from({ length: quantity }, (_, index) =>
            createItem({
              ...itemBase,
              code: generateItemCode(form.category, form.name, entries[index]),
            }),
          ),
        );
        notifySuccess("Tambah barang berhasil.");
      }

      setForm(emptyForm);
      setEditingId(null);
      setIsFormOpen(false);
      await loadDashboard();
    });
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
      code: readField(item, ["code"], ""),
      name: readField(item, ["name", "nama", "itemName"], ""),
      category: readField(item, ["category", "kategori"], ""),
      description: readField(item, ["description", "deskripsi"], ""),
      quantity: Number(readField(item, ["quantity", "stok"], "0")),
      location: readField(item, ["location", "lokasi"], ""),
      condition: readField(item, ["condition", "kondisi"], ""),
      status: readField(item, ["status"], "Tersedia"),
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

  function handleDelete(item: InventoryItem) {
    if (!canDeleteItem) {
      setAppError("Role Anda tidak memiliki permission untuk hapus item.");
      return;
    }

    const id = itemId(item);
    if (!id) {
      setAppError("Item ini tidak memiliki id, sehingga belum bisa dihapus.");
      return;
    }

    requestConfirmation("Hapus barang?", `${readField(item, ["name", "nama", "itemName"], "Item ini")} akan dihapus.`, async () => {
      try {
        await deleteItem(id);
        await loadDashboard();
        notifySuccess("Hapus barang berhasil.");
      } catch (error) {
        setAppError(errorText(error));
      }
    }, "Hapus", "danger");
  }

  function toggleItemSelection(id: string) {
    setSelectedItemIds((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id],
    );
  }

  function toggleVisibleSelection() {
    setSelectedItemIds((current) => {
      if (isAllVisibleSelected) {
        return current.filter((id) => !visibleItemIds.includes(id));
      }

      return Array.from(new Set([...current, ...visibleItemIds]));
    });
  }

  function handleBulkDelete() {
    if (!canDeleteItem) {
      setAppError("Role Anda tidak memiliki permission untuk hapus item.");
      return;
    }

    requestConfirmation("Hapus barang terpilih?", `${selectedItemIds.length} item terpilih akan dihapus.`, async () => {
      try {
        setAppError("");
        const totalDeleted = selectedItemIds.length;
        await Promise.all(selectedItemIds.map((id) => deleteItem(id)));
        setSelectedItemIds([]);
        await loadDashboard();
        notifySuccess(`Hapus ${totalDeleted} barang berhasil.`);
      } catch (error) {
        setAppError(errorText(error));
      }
    }, "Hapus", "danger");
  }

  async function handleDialogConfirm() {
    if (!dialog || dialog.variant !== "confirm") return;

    setIsDialogBusy(true);
    setConfirmationLoadingText(dialog.confirmText);
    try {
      const action = dialog.onConfirm;
      setDialog(null);
      await action();
    } catch (error) {
      setAppError(errorText(error));
    } finally {
      setConfirmationLoadingText("");
      setIsDialogBusy(false);
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
            <h1>{authMode === "login" ? "Inventaris Barang" : "Registrasi User"}</h1>
            <p className="muted">
              {authMode === "login"
                ? "Masuk untuk mengelola data inventaris sesuai role dan permission akun."
                : "Buat akun user baru untuk mengakses dashboard read-only."}
            </p>
          </div>

          <form className="stack" onSubmit={handleLogin}>
            {authMode === "register" ? (
              <label>
                Username
                <input
                  autoComplete="username"
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Nama user"
                  required
                  value={username}
                />
              </label>
            ) : null}

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
              {isLoggingIn ? "Memproses..." : authMode === "login" ? "Login" : "Register & Login"}
            </button>
            <button
              className="secondary"
              onClick={() => {
                setAuthMode((current) => (current === "login" ? "register" : "login"));
                setLoginError("");
              }}
              type="button"
            >
              {authMode === "login" ? "Buat Akun User" : "Sudah punya akun? Login"}
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
          <p className="eyebrow">{isAdminDashboard ? "Dashboard Admin" : "Dashboard User"}</p>
          <h1>{isAdminDashboard ? "Inventaris Barang" : "Profil dan Inventaris"}</h1>
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

      {dialog ? (
        <div className="modal-backdrop" role="presentation">
          <section aria-modal="true" className="modal-panel" role="dialog">
            <div className={`modal-icon ${dialog.variant === "success" ? "success" : dialog.tone === "danger" ? "danger" : ""}`}>
              {dialog.variant === "success" ? <span className="icon-check" aria-hidden="true" /> : <span className="icon-alert" aria-hidden="true" />}
            </div>
            <div>
              <p className="eyebrow">{dialog.variant === "success" ? "Status Proses" : "Konfirmasi"}</p>
              <h2>{dialog.title}</h2>
              <p className="modal-message">{dialog.message}</p>
            </div>
            <div className="modal-actions">
              {dialog.variant === "confirm" ? (
                <>
                  <button className="secondary" disabled={isDialogBusy} onClick={() => setDialog(null)} type="button">
                    Batal
                  </button>
                  <button
                    className={dialog.tone === "danger" ? "danger" : ""}
                    disabled={isDialogBusy}
                    onClick={() => void handleDialogConfirm()}
                    type="button"
                  >
                    {isDialogBusy ? "Memproses..." : dialog.confirmText}
                  </button>
                </>
              ) : (
                <button onClick={() => setDialog(null)} type="button">
                  OK
                </button>
              )}
            </div>
          </section>
        </div>
      ) : null}

      {confirmationLoadingText ? (
        <div className="loading-backdrop" role="status" aria-live="polite">
          <div className="loading-panel">
            <span className="loading-spinner" aria-hidden="true" />
            <strong>Memproses...</strong>
            <small>{confirmationLoadingText}</small>
          </div>
        </div>
      ) : null}

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
              {canReadRbac ? `${rbacData.users} user, ${rbacData.permissions} permission` : "Khusus admin"}
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

      <section className="rbac-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Profil Saya</p>
            <h2>Edit profil pribadi</h2>
          </div>
        </div>
        <form className="rbac-grid two" onSubmit={handleUpdateProfile}>
          <label>
            Username
            <input
              onChange={(event) => setProfileForm((current) => ({ ...current, username: event.target.value }))}
              required
              value={profileForm.username}
            />
          </label>
          <label>
            Email
            <input
              onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))}
              required
              type="email"
              value={profileForm.email}
            />
          </label>
          <label>
            Password baru
            <input
              onChange={(event) => setProfileForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="Kosongkan jika tidak diganti"
              type="password"
              value={profileForm.password}
            />
          </label>
          <div className="profile-action">
            <button type="submit">Simpan Profil</button>
          </div>
        </form>
      </section>

      <div className="admin-toggle-row">
        <button
          className="secondary"
          disabled={!canReadRbac}
          onClick={() => setIsRbacOpen((current) => !current)}
          title={canReadRbac ? "Buka manajemen RBAC" : "Hanya role ADMIN yang dapat mengakses fitur ini"}
          type="button"
        >
          {isRbacOpen ? "Sembunyikan RBAC" : "Manajemen RBAC"}
        </button>
        <button
          className="secondary"
          disabled={!canReadRbac}
          onClick={() => setIsAssetSettingsOpen((current) => !current)}
          title={canReadRbac ? "Buka pengaturan inventaris" : "Hanya role ADMIN yang dapat mengakses fitur ini"}
          type="button"
        >
          {isAssetSettingsOpen ? "Sembunyikan Pengaturan" : "Kategori dan Ruangan"}
        </button>
        {!canReadRbac ? (
          <span className="access-note">Akses administrasi terkunci untuk role USER.</span>
        ) : null}
      </div>

      {canReadRbac && isRbacOpen ? (
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
                maxLength={ROLE_DESCRIPTION_MAX_LENGTH}
                value={roleForm.description}
              />
              <button type="submit">Tambah Role</button>
            </form>

            <div className="rbac-form">
              <h3>Daftar User</h3>
              <div className="management-list">
                {usersList.map((row) => {
                  const id = recordId(row);
                  const isCurrentUser = id === currentUserId;
                  return id ? (
                    <div className="management-row" key={id}>
                      <span>{recordName(row)}</span>
                      {!isCurrentUser ? (
                        <button
                          aria-label={`Hapus ${recordName(row)}`}
                          className="danger-outline compact-button icon-action"
                          onClick={() => void handleDeleteUser(id)}
                          title="Hapus"
                          type="button"
                        >
                          <span className="icon-trash" aria-hidden="true" />
                        </button>
                      ) : (
                        <button
                          aria-label="Hapus akun sendiri terkunci"
                          className="danger-outline compact-button icon-action locked-action"
                          disabled
                          title="Admin tidak boleh menghapus akun sendiri"
                          type="button"
                        >
                          <span className="icon-trash" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  ) : null;
                })}
              </div>
            </div>

            <div className="rbac-form">
              <h3>Daftar Role</h3>
              <div className="management-list">
                {rolesList.map((row) => {
                  const id = recordId(row);
                  const roleName = recordName(row).toLowerCase();
                  const description = roleDescription(row);
                  const isDescriptionOpen = expandedRoleDescriptions.includes(id);
                  const isProtectedRole = roleName === "admin";
                  const isCurrentUserRole = currentUserRoleKeys.has(id.toLowerCase()) || currentUserRoleKeys.has(roleName);
                  const isUsedRole = usedRoleKeys.has(id.toLowerCase()) || usedRoleKeys.has(roleName);
                  return id ? (
                    <div className="management-item" key={id}>
                      <div className="management-row">
                        <span>{recordName(row)}</span>
                        <div className="management-actions">
                          {description ? (
                            <button
                              aria-label={`${isDescriptionOpen ? "Tutup" : "Lihat"} deskripsi ${recordName(row)}`}
                              className="secondary compact-button icon-action"
                              onClick={() => toggleRoleDescription(id)}
                              title={isDescriptionOpen ? "Tutup deskripsi" : "Lihat deskripsi"}
                              type="button"
                            >
                              <span className={isDescriptionOpen ? "icon-chevron-up" : "icon-chevron-down"} aria-hidden="true" />
                            </button>
                          ) : null}
                          {!isProtectedRole && !isCurrentUserRole && !isUsedRole ? (
                            <button
                              aria-label={`Hapus ${recordName(row)}`}
                              className="danger-outline compact-button icon-action"
                              onClick={() => void handleDeleteRole(id)}
                              title="Hapus"
                              type="button"
                            >
                              <span className="icon-trash" aria-hidden="true" />
                            </button>
                          ) : (
                            <button
                              aria-label={`Hapus ${recordName(row)} terkunci`}
                              className="danger-outline compact-button icon-action locked-action"
                              disabled
                              title={
                                isProtectedRole
                                  ? "Role ADMIN tidak boleh dihapus"
                                  : isCurrentUserRole
                                    ? "Admin tidak boleh menghapus role yang sedang dipakai sendiri"
                                    : "Role masih digunakan oleh user"
                              }
                              type="button"
                            >
                              <span className="icon-trash" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </div>
                      {isProtectedRole || isCurrentUserRole || isUsedRole ? (
                        <small className="restriction-label">
                          {isProtectedRole
                            ? "Role ADMIN dilindungi"
                            : isCurrentUserRole
                              ? "Role sedang dipakai admin aktif"
                              : "Role masih digunakan pengguna"}
                        </small>
                      ) : null}
                      {isDescriptionOpen && description ? (
                        <p className="role-description">{truncateText(description, ROLE_DESCRIPTION_MAX_LENGTH)}</p>
                      ) : null}
                    </div>
                  ) : null;
                })}
              </div>
            </div>
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
              {selectedUser ? (
                <p className="assign-role-hint">
                  {recordName(selectedUser)} <span>{userRoleLabel(selectedUser)}</span>
                </p>
              ) : null}
              {isReplacingLastAdminRole ? (
                <div className="notice">Role admin terakhir tidak boleh diganti.</div>
              ) : null}
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
              <button disabled={isReplacingLastAdminRole} type="submit">Assign Role</button>
            </form>

            <form className="rbac-form" onSubmit={handleAssignPermission}>
              <h3>Assign Permission ke Role</h3>
              <select
                onChange={(event) => {
                  const roleId = event.target.value;
                  const role = rolesList.find((row) => recordId(row) === roleId);
                  setSelectedPermissionRoleId(roleId);
                  setSelectedPermissionIds(rolePermissionIds(role));
                }}
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
              {isSelectedPermissionRoleAdmin ? (
                <div className="notice">Permission role ADMIN dikunci agar akses admin tetap lengkap.</div>
              ) : (
                <>
                  <div className="permission-checklist">
                    {permissionsList.map((row) => {
                      const id = recordId(row);
                      if (!id) return null;

                      return (
                        <label className="check-row" key={id}>
                          <input
                            checked={selectedPermissionIds.includes(id)}
                            onChange={(event) =>
                              setSelectedPermissionIds((current) =>
                                event.target.checked
                                  ? [...current, id]
                                  : current.filter((permissionId) => permissionId !== id),
                              )
                            }
                            type="checkbox"
                          />
                          <span>{recordName(row)}</span>
                        </label>
                      );
                    })}
                  </div>
                  <small className="field-help">Checklist yang dimatikan akan menghapus permission dari role saat disimpan.</small>
                  <button type="submit">Simpan Permission</button>
                </>
              )}
            </form>
          </div>
        </section>
      ) : null}

      {canReadRbac && isAssetSettingsOpen ? (
        <section className="rbac-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Pengaturan Inventaris</p>
              <h2>Kategori barang dan ruangan</h2>
            </div>
          </div>

          <div className="rbac-grid two">
            <form className="rbac-form" onSubmit={handleAddCategory}>
              <h3>Tambah Kategori Barang</h3>
              <input
                onChange={(event) => setNewCategory(event.target.value)}
                placeholder="Contoh: Alat Seni"
                required
                value={newCategory}
              />
              <button type="submit">Tambah Kategori</button>
              <div className="management-list">
                {categoryOptions.map((category) => (
                  <div className="management-row" key={category}>
                    <span>{category}</span>
                    <button
                      aria-label={`Hapus ${category}`}
                      className="danger-outline compact-button icon-action"
                      onClick={() => handleDeleteCategory(category)}
                      title="Hapus"
                      type="button"
                    >
                      <span className="icon-trash" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </form>

            <form className="rbac-form" onSubmit={handleAddRoom}>
              <h3>Tambah Ruangan</h3>
              <input
                onChange={(event) => setNewRoom(event.target.value)}
                placeholder="Contoh: Ruang BK"
                required
                value={newRoom}
              />
              <button type="submit">Tambah Ruangan</button>
              <div className="management-list">
                {roomOptions.map((room) => (
                  <div className="management-row" key={room}>
                    <span>{room}</span>
                    <button
                      aria-label={`Hapus ${room}`}
                      className="danger-outline compact-button icon-action"
                      onClick={() => handleDeleteRoom(room)}
                      title="Hapus"
                      type="button"
                    >
                      <span className="icon-trash" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
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
              Kode item
              <input
                readOnly
                placeholder="Otomatis"
                required
                value={form.code}
              />
            </label>

            <label>
              Nama barang
              <input
                onChange={(event) => {
                  const name = event.target.value;
                  setForm((current) => ({
                    ...current,
                    name,
                    code: current.category && name
                      ? generateItemCode(current.category, name, nextEntryNumbers(current.category, name, 1, editingId ?? undefined)[0])
                      : "",
                  }));
                }}
                placeholder="Nama barang"
                required
                value={form.name}
              />
            </label>

            <label>
              Keterangan
              <textarea
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Keterangan opsional"
                rows={3}
                value={form.description}
              />
            </label>

            <div className="form-row">
              <label>
                Kategori
                <select
                  onChange={(event) => {
                    const category = event.target.value;
                    setForm((current) => ({
                      ...current,
                      category,
                      code: category && current.name
                        ? generateItemCode(category, current.name, nextEntryNumbers(category, current.name, 1, editingId ?? undefined)[0])
                        : "",
                    }));
                  }}
                  required
                  value={form.category}
                >
                  <option value="">Pilih kategori</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Kondisi
                <select
                  onChange={(event) => setForm((current) => ({ ...current, condition: event.target.value }))}
                  required
                  value={form.condition}
                >
                  <option value="">Pilih kondisi</option>
                  <option value="Baik">Baik</option>
                  <option value="Rusak">Rusak</option>
                </select>
              </label>
            </div>

            <div className="form-row">
              <label>
                Jumlah item baru
                <input
                  disabled={Boolean(editingId)}
                  min="1"
                  onChange={(event) => setForm((current) => ({ ...current, quantity: Number(event.target.value) }))}
                  required
                  type="number"
                  value={form.quantity}
                />
              </label>

              <label>
                Lokasi
                <select
                  onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                  required
                  value={form.location}
                >
                  <option value="">Pilih lokasi</option>
                  {roomOptions.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              Status barang
              <select
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                required
                value={form.status}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

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
              <h2>Komposisi per kategori</h2>
            </div>

            <div className="donut-shell">
              <div
                className="donut-chart"
                style={{ "--donut": inventoryStats.donut } as CSSProperties}
              >
                <span>Total Item</span>
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
            ) : (
              <button
                className="secondary"
                disabled
                title="Role USER tidak memiliki permission item:create"
                type="button"
              >
                Tambah Terkunci
              </button>
            )}
            {canDeleteItem && selectedItemIds.length ? (
              <button className="danger-outline" onClick={() => void handleBulkDelete()} type="button">
                Hapus Terpilih ({selectedItemIds.length})
              </button>
            ) : null}
          </div>

          <div className="filter-toggle-row">
            <button
              aria-expanded={isFilterOpen}
              className="icon-filter-button secondary"
              onClick={() => setIsFilterOpen((current) => !current)}
              title="Filter data"
              type="button"
            >
              <span className="filter-icon" aria-hidden="true" />
              Filter
            </button>
          </div>

          {isFilterOpen ? (
            <div className="filter-panel">
              <label>
                Cari nama
                <input
                  onChange={(event) => setItemSearch(event.target.value)}
                  placeholder="Cari nama barang"
                  value={itemSearch}
                />
              </label>
              <label>
                Kategori
                <select onChange={(event) => setCategoryFilter(event.target.value)} value={categoryFilter}>
                  <option value="">Semua kategori</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Kondisi
                <select onChange={(event) => setConditionFilter(event.target.value)} value={conditionFilter}>
                  <option value="">Semua kondisi</option>
                  {conditionOptions.map((condition) => (
                    <option key={condition} value={condition}>
                      {condition}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
                  <option value="">Semua status</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tampilan
                <select onChange={(event) => setItemsPerPage(Number(event.target.value))} value={itemsPerPage}>
                  <option value={5}>5 / halaman</option>
                  <option value={10}>10 / halaman</option>
                  <option value={20}>20 / halaman</option>
                </select>
              </label>
              <div className="filter-actions">
                <button
                  className="secondary"
                  onClick={() => {
                    setItemSearch("");
                    setCategoryFilter("");
                    setConditionFilter("");
                    setStatusFilter("");
                  }}
                  type="button"
                >
                  Reset Filter
                </button>
              </div>
            </div>
          ) : null}

          <p className="filter-summary">
            Menampilkan {visibleItems.length} dari {filteredItems.length} item, halaman {currentPage} dari {totalPages}
          </p>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {canDeleteItem ? (
                    <th className="select-column">
                      <input
                        aria-label="Pilih semua item di halaman ini"
                        checked={isAllVisibleSelected}
                        onChange={toggleVisibleSelection}
                        type="checkbox"
                      />
                    </th>
                  ) : null}
                  <th>Kode</th>
                  <th>Nama</th>
                  <th>Kategori</th>
                  <th>Lokasi</th>
                  <th>Kondisi</th>
                  <th>Status</th>
                  <th>Keterangan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.length ? (
                  visibleItems.map((item, index) => (
                    <tr className={itemRowClass(item)} key={String(itemId(item) ?? index)}>
                      {canDeleteItem ? (
                        <td className="select-column">
                          {itemId(item) ? (
                            <input
                              aria-label={`Pilih ${readField(item, ["name", "nama", "itemName"], "item")}`}
                              checked={selectedItemIds.includes(String(itemId(item)))}
                              onChange={() => toggleItemSelection(String(itemId(item)))}
                              type="checkbox"
                            />
                          ) : null}
                        </td>
                      ) : null}
                      <td>{readField(item, ["code"])}</td>
                      <td>{readField(item, ["name", "nama", "itemName"])}</td>
                      <td>{readField(item, ["category", "kategori"])}</td>
                      <td>{readField(item, ["location", "lokasi"])}</td>
                      <td>{readField(item, ["condition", "kondisi"])}</td>
                      <td>{readField(item, ["status"])}</td>
                      <td>{readField(item, ["description", "deskripsi"], "-")}</td>
                      <td>
                        <div className="table-actions">
                          {canUpdateItem ? (
                            <button
                              aria-label={`Edit ${readField(item, ["name", "nama", "itemName"], "item")}`}
                              className="icon-action secondary"
                              onClick={() => handleEdit(item)}
                              title="Edit"
                              type="button"
                            >
                              <span className="icon-pencil" aria-hidden="true" />
                            </button>
                          ) : (
                            <button
                              aria-label="Edit terkunci"
                              className="icon-action secondary locked-action"
                              disabled
                              title="Role USER tidak memiliki permission item:update"
                              type="button"
                            >
                              <span className="icon-pencil" aria-hidden="true" />
                            </button>
                          )}
                          {canDeleteItem ? (
                            <button
                              aria-label={`Hapus ${readField(item, ["name", "nama", "itemName"], "item")}`}
                              className="icon-action danger"
                              onClick={() => handleDelete(item)}
                              title="Hapus"
                              type="button"
                            >
                              <span className="icon-trash" aria-hidden="true" />
                            </button>
                          ) : (
                            <button
                              aria-label="Hapus terkunci"
                              className="icon-action danger-outline locked-action"
                              disabled
                              title="Role USER tidak memiliki permission item:delete"
                              type="button"
                            >
                              <span className="icon-trash" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                        {!canManageItems ? (
                          <small className="restriction-label">Read-only</small>
                        ) : null}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="empty" colSpan={8 + (canDeleteItem ? 1 : 0)}>
                      Tidak ada data inventaris yang cocok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="pagination-bar">
            <button
              className="secondary"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              aria-label="Halaman sebelumnya"
              type="button"
            >
              &lt;
            </button>
            <span>Halaman {currentPage} / {totalPages}</span>
            <button
              className="secondary"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              aria-label="Halaman berikutnya"
              type="button"
            >
              &gt;
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}
