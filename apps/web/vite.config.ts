import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": "http://localhost:5080", "/health": "http://localhost:5080" } },
  build: {
    target: "es2022",
    sourcemap: false,
    rollupOptions: { output: { manualChunks: { three: ["three", "@react-three/fiber", "@react-three/drei"] } } }
  },
  test: { environment: "jsdom", setupFiles: "./src/test/setup.ts", exclude: ["e2e/**", "node_modules/**"], coverage: { reporter: ["text", "html"] } }
});
