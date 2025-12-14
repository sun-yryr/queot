import { Hono } from "hono";
import { Hello } from "./hello.jsx";

export function createPageRoute() {
  const pageRoute = new Hono();
  pageRoute.get("/hello", (c) => c.html(<Hello />));
  return pageRoute;
}
