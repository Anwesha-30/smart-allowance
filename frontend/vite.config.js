import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Allows imports like: import X from "@/components/X"
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  // viem uses browser crypto — ensure it's not polyfilled away
  define: {
    global: "globalThis",
  },
});
