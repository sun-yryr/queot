import { Hono } from "hono";
import { createPageRoute } from "./pages/route.jsx";
import { Queryable } from "./services/query.js";
import { type Context } from "effect";

export function createApp(deps: {
  queryable: Context.Tag.Service<typeof Queryable>;
}) {
  const app = new Hono();

  app.route("/", createPageRoute(deps));

  return app;
}
