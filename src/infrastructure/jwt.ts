import jwt from "jsonwebtoken";
import { authConfig } from "../config/auth";

export type JwtPayload = {
  sub: string;
  userId?: string;
  email?: string;
  username?: string;
  roles?: string[];
  permissions?: string[];
  [key: string]: unknown;
};

export async function verifyToken(token: string): Promise<JwtPayload> {
  const decoded = jwt.verify(token, authConfig.jwtSecret);
  if (!decoded || typeof decoded !== "object" || typeof decoded.sub !== "string") {
    throw new Error("Token tidak valid");
  }

  return decoded as JwtPayload;
}
