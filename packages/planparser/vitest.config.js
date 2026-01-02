import { defineConfig } from "vitest/config";

/** @type {import('vitest/config').TestUserConfig} */
export default defineConfig(() => ({
  test: {
    root: "./src",
    exclude: ["**/*.{js,jsx}"],
    include: ["**/*.{test,spec}.{ts,tsx}"],
  },
}));
