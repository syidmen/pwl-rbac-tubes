import { AuthService } from "../../../application/services/auth-service";
import { json, error } from "../response";
import type { RouteDefinition } from "../router";

export const routes: RouteDefinition[] = [
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
];
