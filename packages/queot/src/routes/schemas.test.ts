import { test, expect } from "vitest";
import { Schema } from "effect";
import { HistoriesQuerySchema, RunRequestSchema } from "./schemas.js";

test("RunRequestSchema: optional fields decode", () => {
  const decoded = Schema.decodeUnknownSync(RunRequestSchema)({});
  expect(decoded).toEqual({});
});

test("HistoriesQuerySchema: parses and clamps limit", () => {
  const decoded = Schema.decodeUnknownSync(HistoriesQuerySchema)({
    limit: "999",
    id: " abc ",
    timestamp: " t ",
  });
  expect(decoded.limit).toEqual(200);
  expect(decoded.id).toEqual("abc");
  expect(decoded.timestamp).toEqual("t");
});
