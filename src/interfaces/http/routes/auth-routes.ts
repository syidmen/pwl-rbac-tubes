import { AuthService } from "../../../application/services/auth-service";
import { json, error } from "../response";
import type { RouteDefinition } from "../router";

export const routes: RouteDefinition[] = [
  {
    method: "POST",
    pattern: /^\/auth\/register$/,
    handler: async (req: Request) => {
      try {
        const body = await req.json();
        const { username, email, password } = body;

        if (!username || !email || !password) {
          return error("Username, email, dan password wajib diisi", 400);
        }

        const result = await AuthService.register({ username, email, password });
        return json(result, 201);
      } catch (err: any) {
        return error(err.message, 400);
      }
    },
  },
  {
    method: "POST",
    pattern: /^\/auth\/login$/,
    handler: async (req: Request) => {
      try {
        const body = await req.json();
        const { email, password } = body;

        if (!email || !password) {
          return error("Email dan password wajib diisi", 400);
        }

        const result = await AuthService.login(email, password);
        return json(result, 200);
      } catch (err: any) {
        return error(err.message, 401);
      }
    },
  },
  {
    method: "GET",
    pattern: /^\/auth\/me$/,
    handler: async (req: Request) => {
      try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return error("Akses ditolak: Token tidak ditemukan", 401);
        }

        const token = authHeader.slice("Bearer ".length).trim();
        if (!token) {
          return error("Akses ditolak: Token tidak ditemukan", 401);
        }

        const decodedUser = AuthService.verifyToken(token);

        return json({
          message: "Berhasil mengambil profil",
          user: decodedUser,
        }, 200);
      } catch (err: any) {
        return error(err.message, 401);
      }
    },
  },
  {
    method: "PATCH",
    pattern: /^\/auth\/me$/,
    handler: async (req: Request) => {
      try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return error("Akses ditolak: Token tidak ditemukan", 401);
        }

        const token = authHeader.slice("Bearer ".length).trim();
        if (!token) {
          return error("Akses ditolak: Token tidak ditemukan", 401);
        }

        const decodedUser = AuthService.verifyToken(token) as { sub?: string };
        if (!decodedUser.sub) {
          return error("Token tidak valid", 401);
        }

        const body = await req.json();
        const result = await AuthService.updateProfile(decodedUser.sub, {
          username: typeof body.username === "string" && body.username.trim() ? body.username.trim() : undefined,
          email: typeof body.email === "string" && body.email.trim() ? body.email.trim() : undefined,
          password: typeof body.password === "string" && body.password.trim() ? body.password : undefined,
        });

        return json(result, 200);
      } catch (err: any) {
        return error(err.message, 400);
      }
    },
  },
];
