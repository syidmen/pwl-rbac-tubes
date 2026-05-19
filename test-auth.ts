import { AuthService } from "./src/application/services/auth-service";

async function testAuth() {
  console.log("=== Menguji AuthService ===\n");

  try {
    // Tes 1: Login dengan benar
    console.log("1. Tes Login Sukses (admin@example.com / password123)");
    const loginResult = await AuthService.login("admin@example.com", "password123");
    console.log("Berhasil! Token didapatkan:");
    console.log(loginResult.token.substring(0, 50) + "...\n");

    // Tes 2: Login salah password
    console.log("2. Tes Login Salah Password (admin@example.com / salah123)");
    try {
      await AuthService.login("admin@example.com", "salah123");
    } catch (error: any) {
      console.log("Error yang Diharapkan: " + error.message + "\n");
    }

    // Tes 3: Verifikasi Token
    console.log("3. Tes Baca Isi Token (Verify JWT)");
    const decodedPayload = AuthService.verifyToken(loginResult.token);
    console.log("Isi payload di dalam token:");
    console.log(decodedPayload);
    console.log("\n=== Semua Tes Selesai! ===");

  } catch (error) {
    console.error("Terjadi error fatal:", error);
  }
}

testAuth();
