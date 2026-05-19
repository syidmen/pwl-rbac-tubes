import "dotenv/config";
import { handleRequest } from "./interfaces/http/router";

const port = Number(process.env.PORT ?? 3000);

const server = Bun.serve({
  port,
  fetch: handleRequest,
});

console.log(`RBAC API berjalan di http://localhost:${server.port}`);
