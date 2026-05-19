import type { ActiveUser, InventoryItem, ItemFormData, LoginPayload } from "./types";

const TOKEN_KEY = "pwl_rbac_token";
export type DemoRole = "superadmin" | "admin" | "user";

export const DEMO_TOKEN = "demo-frontend-token";
const DEMO_TOKEN_PREFIX = `${DEMO_TOKEN}:`;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

type RequestOptions = RequestInit & {
  auth?: boolean;
};

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function isDemoToken(token = getToken()) {
  return token === DEMO_TOKEN || Boolean(token?.startsWith(DEMO_TOKEN_PREFIX));
}

export function getDemoRole(token = getToken()): DemoRole {
  if (token === DEMO_TOKEN) return "admin";

  const role = token?.replace(DEMO_TOKEN_PREFIX, "");

  if (role === "superadmin" || role === "admin" || role === "user") {
    return role;
  }

  return "admin";
}

export function saveDemoToken(role: DemoRole) {
  saveToken(`${DEMO_TOKEN_PREFIX}${role}`);
}

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if ("data" in record) return record.data as T;
    if ("result" in record) return record.result as T;
  }

  return payload as T;
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;

  const record = payload as Record<string, unknown>;
  const candidates = [record.message, record.error, record.errors];
  const message = candidates.find(Boolean);

  if (typeof message === "string") return message;
  if (Array.isArray(message)) return message.join(", ");
  if (message && typeof message === "object") return JSON.stringify(message);

  return fallback;
}

async function apiFetch<T>(path: string, options: RequestOptions = {}) {
  const headers = new Headers(options.headers);
  const token = getToken();

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (options.auth !== false && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new ApiError(getErrorMessage(payload, "Terjadi kesalahan pada server."), response.status, payload);
  }

  return unwrapData<T>(payload);
}

function extractToken(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;
  const data = record.data && typeof record.data === "object" ? (record.data as Record<string, unknown>) : {};
  const token = record.token ?? record.accessToken ?? record.jwt ?? data.token ?? data.accessToken ?? data.jwt;

  return typeof token === "string" ? token : null;
}

export async function login(payload: LoginPayload) {
  const response = await apiFetch<unknown>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
    auth: false,
  });
  const token = extractToken(response);

  if (!token) {
    throw new ApiError("Login berhasil diproses, tetapi token tidak ditemukan di respons backend.", 200, response);
  }

  saveToken(token);
  return token;
}

export function getMe() {
  return apiFetch<ActiveUser>("/auth/me");
}

export function getItems() {
  return apiFetch<InventoryItem[]>("/items");
}

export function createItem(payload: ItemFormData) {
  return apiFetch<InventoryItem>("/items", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateItem(id: string | number, payload: ItemFormData) {
  return apiFetch<InventoryItem>(`/items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteItem(id: string | number) {
  return apiFetch<void>(`/items/${id}`, {
    method: "DELETE",
  });
}

export function getUsers() {
  return apiFetch<unknown[]>("/users");
}

export function getRoles() {
  return apiFetch<unknown[]>("/roles");
}

export function getPermissions() {
  return apiFetch<unknown[]>("/permissions");
}
