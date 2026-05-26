import * as authRouteModule from "./routes/auth-routes";
import * as itemRouteModule from "./routes/item-routes";
import { rbacRoutes } from "./routes/rbac-routes";
import { error, json } from "./response";
import { ForbiddenError, HttpError } from "./errors";
import { authMiddleware } from "./middleware/auth-middleware";

export type RouteParams = Record<string, string>;
export type RouteHandler = (
  request: Request,
  params: RouteParams,
) => Promise<Response> | Response;

export type RouteDefinition = {
  method: string;
  pattern: RegExp;
  handler: RouteHandler;
};

const routes: RouteDefinition[] = [
  ...loadRoutes(authRouteModule, ["authRoutes", "routes"]),
  ...rbacRoutes,
  ...loadRoutes(itemRouteModule, ["itemRoutes", "routes"]),
];

export async function handleRequest(request: Request): Promise<Response> {
  try {
    if (request.method === "OPTIONS") {
      return withCors(new Response(null, {
        status: 204,
        headers: corsHeaders(),
      }));
    }

    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return withCors(json({
        message: "RBAC Inventaris API berjalan",
        endpoints: {
          auth: ["/auth/login", "/auth/me"],
          items: ["/items", "/items/:id"],
          rbac: ["/users", "/roles", "/permissions"],
        },
      }));
    }

    for (const route of routes) {
      if (route.method !== request.method) continue;

      const match = route.pattern.exec(url.pathname);
      if (!match) continue;

      const guardedRequest = isAdminPath(url.pathname) ? await requireAdmin(request) : request;
      const response = await route.handler(guardedRequest, match.groups ?? {});
      return withCors(response);
    }

    throw new HttpError(404, "Endpoint tidak ditemukan");
  } catch (errorValue) {
    return withCors(transformError(errorValue));
  }
}

async function requireAdmin(request: Request) {
  const authRequest = await authMiddleware(request);
  const roles = Array.isArray(authRequest.user.roles) ? authRequest.user.roles : [];
  const normalizedRoles = roles.map((role) => String(role).toLowerCase());

  if (!normalizedRoles.includes("admin")) {
    throw new ForbiddenError("Hanya admin yang boleh mengakses endpoint ini");
  }

  return authRequest;
}

function isAdminPath(pathname: string) {
  return pathname === "/users"
    || pathname.startsWith("/users/")
    || pathname === "/roles"
    || pathname.startsWith("/roles/")
    || pathname === "/permissions"
    || pathname.startsWith("/permissions/");
}

function loadRoutes(module: unknown, propertyNames: string[]): RouteDefinition[] {
  if (typeof module !== "object" || module === null) return [];
  for (const propertyName of propertyNames) {
    const candidate = (module as Record<string, unknown>)[propertyName];
    if (Array.isArray(candidate)) {
      return candidate as RouteDefinition[];
    }
  }

  return [];
}

function transformError(errorValue: unknown): Response {
  if (errorValue instanceof HttpError) {
    return error(errorValue.message, errorValue.status, errorValue.details);
  }

  const message = errorValue instanceof Error ? errorValue.message : "Terjadi kesalahan internal";
  return error(message, 500);
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  };
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders())) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
