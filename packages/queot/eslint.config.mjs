import { defineConfig } from "eslint/config";
import workspaceConfig from "../../eslint.config.mjs";

export default defineConfig([
  ...workspaceConfig,
  { ignores: ["vite.config.js"] },
]);
