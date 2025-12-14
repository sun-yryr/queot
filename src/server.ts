import { Hono } from "hono";
import { createPageRoute } from "./pages/route.jsx";

export function createApp() {
  const app = new Hono();

  app.route("/page", createPageRoute());
  app.get("/api/hello", (c) => c.text("Hello World"));

  return app;
}
