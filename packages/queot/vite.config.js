import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

/** @type {import('vite').UserConfig} */
export default defineConfig(({ mode }) => ({
  root: "./src/client",
  esbuild: {
    jsxImportSource: "hono/jsx/dom",
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
  build: {
    // root=src/client なので、パッケージ直下の dist/client に出すには ../../dist/client
    outDir: "../../dist/client",
    emptyOutDir: true,
    assetsDir: "assets",
    sourcemap:
      process.env.GENERATE_SOURCEMAP === "true" ? true : mode !== "production",
  },
  plugins: [tailwindcss()],
  test: {
    root: "./src",
    exclude: ["**/*.{js,jsx}"],
    include: ["**/*.{test,spec}.{ts,tsx}"],
  },
}));
