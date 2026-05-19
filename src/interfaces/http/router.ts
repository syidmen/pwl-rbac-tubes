import { rbacRoutes } from "./routes/rbac-routes";
import { json } from "./response";

export async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);

  try {
    for (const route of rbacRoutes) {
      if (route.method !== request.method) continue;

      const match = route.pattern.exec(url.pathname);
      if (!match) continue;

      return await route.handler(request, match.groups ?? {});
    }

    return json({ message: "Endpoint tidak ditemukan" }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan";
    return json({ message }, 500);
  }
}
