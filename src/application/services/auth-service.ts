import jwt from "jsonwebtoken";
import { authConfig } from "../../config/auth";
import { db } from "../../infrastructure/database/prisma-client";

export class AuthService {
  /**
   * Meng-hash password menggunakan bawaan Bun (Bcrypt/Argon2)
   */
  static async hashPassword(password: string): Promise<string> {
    return await Bun.password.hash(password);
  }

  /**
   * Mengecek kecocokan password plaintext dengan password hash dari DB
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await Bun.password.verify(password, hash);
  }

  /**
   * Proses login: Cari user di DB, verifikasi password, dan kembalikan token
   */
  static async login(email: string, passwordPlain: string) {
    // 1. Cari user di database beserta relasi Role dan Permission
    const user = await db.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new Error("Email atau password salah");
    }

    // 2. Verifikasi password
    const isPasswordValid = await this.verifyPassword(passwordPlain, user.password);
    if (!isPasswordValid) {
      throw new Error("Email atau password salah");
    }

    // 3. Ekstrak Role dan Permission dari hasil query yang bersarang (nested)
    const userRoles: string[] = [];
    const userPermissions: string[] = [];

    for (const userRole of user.roles) {
      const roleName = userRole.role.name;
      userRoles.push(roleName);

      for (const rolePerm of userRole.role.permissions) {
        const permName = rolePerm.permission.name;
        // Hindari duplikasi permission jika punya multi-role
        if (!userPermissions.includes(permName)) {
          userPermissions.push(permName);
        }
      }
    }

    // 4. Buat payload (isi data JWT)
    const payload = {
      userId: user.id,
      email: user.email,
      roles: userRoles,
      permissions: userPermissions,
    };

    // 5. Generate Token (JWT)
    const token = jwt.sign(payload, authConfig.jwtSecret, {
      expiresIn: authConfig.jwtExpiresInSeconds,
    });

    return {
      message: "Login berhasil",
      token,
      user: {
        id: user.id,
        email: user.email,
        roles: userRoles,
      },
    };
  }

  /**
   * Verifikasi dan baca isi dari token JWT
   */
  static verifyToken(token: string) {
    try {
      const decoded = jwt.verify(token, authConfig.jwtSecret);
      return decoded;
    } catch (error) {
      throw new Error("Token tidak valid atau sudah kedaluwarsa");
    }
  }
}
