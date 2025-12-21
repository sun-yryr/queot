import { Hono } from "hono";
import { createApiRoute } from "./routes/api.js";
import { Queryable } from "./services/query.js";
import { type Context } from "effect";
import { serveStatic } from "@hono/node-server/serve-static";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function createApp(deps: {
  queryable: Context.Tag.Service<typeof Queryable>;
}) {
  const app = new Hono();

  app.route("/api", createApiRoute(deps));

  if (process.env.NODE_ENV === "production") {
    const clientDistDir = fileURLToPath(
      new URL("../dist/client", import.meta.url),
    );
    // serveStatic の root は「起動時の cwd からの相対パス」前提なので、cwd依存を吸収する
    const clientRoot = path.relative(process.cwd(), clientDistDir) || ".";

    // まず実ファイル（/assets/* や /favicon.ico など）を配信
    app.use("/*", serveStatic({ root: clientRoot, precompressed: true }));
    // SPA fallback（存在しないパスは index.html）
    app.get("*", serveStatic({ root: clientRoot, path: "index.html" }));
  }

  return app;
}
