export type JwtPayload = {
  sub: string;
  username?: string;
  permissions?: string[];
  [key: string]: unknown;
};

export async function verifyToken(token: string): Promise<JwtPayload> {
  throw new Error("verifyToken belum diimplementasikan. Ganti src/infrastructure/jwt.ts dengan logika JWT yang sesuai.");
}
