async function runTest() {
  console.log("=== Menguji Endpoint HTTP ===\n");

  // 1. Tes Endpoint POST /auth/login
  console.log("-> 1. Hit POST /auth/login");
  const loginRes = await fetch("http://localhost:3000/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@example.com", password: "password123" }),
  });

  const loginData = await loginRes.json();
  console.log("Status:", loginRes.status);
  console.log("Response:", loginData);
  console.log("");

  if (loginData.token) {
    // 2. Tes Endpoint GET /auth/me menggunakan token
    console.log("-> 2. Hit GET /auth/me dengan Token");
    const meRes = await fetch("http://localhost:3000/auth/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${loginData.token}` },
    });

    const meData = await meRes.json();
    console.log("Status:", meRes.status);
    console.log("Response:", meData);
  }

  // 3. Tes Endpoint GET /auth/me tanpa token (harus gagal)
  console.log("\n-> 3. Hit GET /auth/me Tanpa Token");
  const meResFail = await fetch("http://localhost:3000/auth/me");
  const meDataFail = await meResFail.json();
  console.log("Status:", meResFail.status);
  console.log("Response:", meDataFail);

  console.log("\n=== HTTP Test Selesai ===");
}

runTest();
