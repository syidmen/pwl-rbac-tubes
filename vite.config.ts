import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "frontend",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/auth": "http://localhost:3000",
      "/items": "http://localhost:3000",
      "/users": "http://localhost:3000",
      "/roles": "http://localhost:3000",
      "/permissions": "http://localhost:3000",
    },
  },
  build: {
    outDir: "../dist/frontend",
    emptyOutDir: true,
  },
});
