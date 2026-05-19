export type ApiRecord = Record<string, unknown>;

export type LoginPayload = {
  email: string;
  password: string;
};

export type ItemFormData = {
  name: string;
  description: string;
  quantity: number;
  location: string;
};

export type InventoryItem = ApiRecord & {
  id?: string | number;
  name?: string;
  nama?: string;
  itemName?: string;
  description?: string;
  deskripsi?: string;
  quantity?: number;
  stok?: number;
  location?: string;
  lokasi?: string;
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
