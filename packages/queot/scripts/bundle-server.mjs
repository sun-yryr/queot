import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgDir = path.resolve(__dirname, "..");

const pkgJson = JSON.parse(
  await readFile(path.join(pkgDir, "package.json"), "utf8"),
);

// 依存パッケージは基本 external にして、planparser だけ bundle する
const deps = Object.keys(pkgJson.dependencies ?? {});
const external = deps.filter((d) => d !== "@sun-yryr/queot-planparser");

await build({
  entryPoints: [
    path.join(pkgDir, "src/server.ts"),
    path.join(pkgDir, "src/commands/serve.ts"),
  ],
  outdir: "dist",
  outbase: "src",
  allowOverwrite: true,
  bundle: true,
  format: "esm",
  platform: "node",
  target: ["node24"],
  sourcemap: false,
  sourcesContent: false,
  external,
  logLevel: "info",
  minify: true,
  splitting: true,
});
