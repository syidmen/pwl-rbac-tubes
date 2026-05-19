import { HttpError } from "../errors";
import { json } from "../response";
import { requiredString } from "../validation";
import {
  listItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  type UpdateItemInput,
} from "../../../application/services/item-service";

// ─── Helper ───────────────────────────────────────────────────────────────────

async function parseBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    throw new HttpError(400, "Body tidak valid atau bukan JSON");
  }
}

function getId(params: Record<string, string | undefined>): string {
  const id = params.id;
  if (!id) throw new HttpError(400, "ID tidak ditemukan di URL");
  return id;
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleListItems(_req: Request) {
  const items = await listItems();
  return json({ data: items });
}

async function handleGetItem(_req: Request, params: Record<string, string | undefined>) {
  const id = getId(params);
  const item = await getItemById(id);
  if (!item) throw new HttpError(404, "Item tidak ditemukan");
  return json({ data: item });
}

async function handleCreateItem(request: Request) {
  const body = await parseBody(request);

  const input = {
    code:        requiredString(body.code,      "code"),
    name:        requiredString(body.name,      "name"),
    category:    requiredString(body.category,  "category"),
    location:    requiredString(body.location,  "location"),
    condition:   requiredString(body.condition, "condition"),
    quantity:    Number(body.quantity ?? 0),
    description: typeof body.description === "string" ? body.description : undefined,
  };

  const item = await createItem(input);
  return json({ data: item }, 201);
}

async function handleUpdateItem(request: Request, params: Record<string, string | undefined>) {
  const id = getId(params);

  const existing = await getItemById(id);
  if (!existing) throw new HttpError(404, "Item tidak ditemukan");

  const body = await parseBody(request);

  const input: UpdateItemInput = {};

  if (body.code        !== undefined) input.code        = requiredString(body.code        as string, "code");
  if (body.name        !== undefined) input.name        = requiredString(body.name        as string, "name");
  if (body.category    !== undefined) input.category    = requiredString(body.category    as string, "category");
  if (body.location    !== undefined) input.location    = requiredString(body.location    as string, "location");
  if (body.condition   !== undefined) input.condition   = requiredString(body.condition   as string, "condition");
  if (body.quantity    !== undefined) input.quantity    = Number(body.quantity);
  if (body.description !== undefined) input.description = String(body.description);

  const item = await updateItem(id, input);
  return json({ data: item });
}

async function handleDeleteItem(_req: Request, params: Record<string, string | undefined>) {
  const id = getId(params);

  const existing = await getItemById(id);
  if (!existing) throw new HttpError(404, "Item tidak ditemukan");

  await deleteItem(id);
  return json({ message: "Item berhasil dihapus" });
}

// ─── Route Definitions ────────────────────────────────────────────────────────

export const itemRoutes = [
  {
    method:  "GET",
    pattern: new URLPattern({ pathname: "/items" }),
    handler: handleListItems,
  },
  {
    method:  "POST",
    pattern: new URLPattern({ pathname: "/items" }),
    handler: handleCreateItem,
  },
  {
    method:  "GET",
    pattern: new URLPattern({ pathname: "/items/:id" }),
    handler: handleGetItem,
  },
  {
    method:  "PATCH",
    pattern: new URLPattern({ pathname: "/items/:id" }),
    handler: handleUpdateItem,
  },
  {
    method:  "DELETE",
    pattern: new URLPattern({ pathname: "/items/:id" }),
    handler: handleDeleteItem,
  },
];