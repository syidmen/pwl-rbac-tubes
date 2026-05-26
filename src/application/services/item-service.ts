import { db } from "../../infrastructure/database/prisma-client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateItemInput = {
  code: string;
  name: string;
  category: string;
  location: string;
  quantity: number;
  condition: string;
  status: string;
  description?: string;
};

export type UpdateItemInput = Partial<CreateItemInput>;

// ─── Service Functions ────────────────────────────────────────────────────────

export function listItems() {
  return db.item.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export function getItemById(id: string) {
  return db.item.findUnique({
    where: { id },
  });
}

export function createItem(input: CreateItemInput) {
  return db.item.create({
    data: input,
  });
}

export function updateItem(id: string, input: UpdateItemInput) {
  return db.item.update({
    where: { id },
    data: input,
  });
}

export function deleteItem(id: string) {
  return db.item.delete({
    where: { id },
    select: { id: true },
  });
}
