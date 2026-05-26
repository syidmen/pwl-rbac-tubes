export type ApiRecord = Record<string, unknown>;

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  username: string;
  email: string;
  password: string;
};

export type UpdateProfilePayload = {
  username?: string;
  email?: string;
  password?: string;
};

export type ItemFormData = {
  code: string;
  name: string;
  category: string;
  description: string;
  quantity: number;
  location: string;
  condition: string;
  status: string;
};

export type InventoryItem = ApiRecord & {
  id?: string | number;
  code?: string;
  name?: string;
  nama?: string;
  itemName?: string;
  category?: string;
  kategori?: string;
  description?: string;
  deskripsi?: string;
  quantity?: number;
  stok?: number;
  location?: string;
  lokasi?: string;
  condition?: string;
  kondisi?: string;
  status?: string;
};

export type ActiveUser = ApiRecord & {
  id?: string | number;
  name?: string;
  nama?: string;
  email?: string;
  role?: string | ApiRecord;
  roles?: Array<string | ApiRecord>;
  permissions?: Array<string | ApiRecord>;
};
