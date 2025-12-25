import tailwindcss from "@tailwindcss/vite";

/** @type {import('vite').UserConfig} */
export default {
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
    sourcemap: true,
  },
  plugins: [tailwindcss()],
  test: {
    root: "./src",
    exclude: ["**/*.{js,jsx}"],
    include: ["**/*.{test,spec}.{ts,tsx}"],
  },
};
