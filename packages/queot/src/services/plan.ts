import {
  parseExplainAnalyzeJson,
  type ExplainParseResult,
} from "@sun-yryr/queot-planparser";
import type { QueryResult } from "./query.js";

function normKey(k: string): string {
  return k
    .toLowerCase()
    .replace(/[_\s]+/g, " ")
    .trim();
}

function pickRowValue(
  row: Record<string, unknown>,
  fieldName: string,
): unknown {
  if (fieldName in row) return row[fieldName];

  const want = normKey(fieldName);
  for (const k of Object.keys(row)) {
    if (normKey(k) === want) return row[k];
  }
  return undefined;
}

/**
 * Postgres の EXPLAIN (FORMAT JSON ...) のクエリ結果(QueryResult) から、
 * planparser 用の入力(JSON)を取り出して ExplainParseResult に変換する。
 */
export function parseExplainFromQueryResult(
  result: QueryResult,
): ExplainParseResult {
  if (!result.fields?.length || !result.rows?.length) {
    return parseExplainAnalyzeJson([]);
  }

  const field =
    result.fields.find((f) => normKey(f.name) === "query plan") ??
    result.fields.find((f) =>
      ["json", "jsonb"].includes(f.type?.toLowerCase?.() ?? ""),
    ) ??
    result.fields[0];

  const row0 = result.rows[0] as Record<string, unknown>;
  const value = pickRowValue(row0, field.name);
  if (value === undefined) {
    throw new Error(`EXPLAIN JSON column not found (field: ${field.name})`);
  }

  return parseExplainAnalyzeJson(value);
}
