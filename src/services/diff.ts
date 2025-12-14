import daff from "daff";
import type { QueryResult } from "./query.js";

export type DiffSheet = (string | null)[][];

function cellTextForDiff(v: unknown): string {
  if (v === null) return "null";
  if (v === undefined) return "";
  switch (typeof v) {
    case "string":
      return v;
    case "number":
    case "bigint":
    case "boolean":
      return String(v);
    case "symbol":
      return v.toString();
    case "function":
      return "[function]";
    case "object": {
      try {
        return JSON.stringify(v);
      } catch {
        return Object.prototype.toString.call(v);
      }
    }
    default:
      return "";
  }
}

function resultToSheet(result: QueryResult): string[][] {
  const headers = result.fields.map((f) => f.name);

  const rows = result.rows.map((r) => {
    const row = r as Record<string, unknown>;
    return result.fields.map((f) => cellTextForDiff(row[f.name]));
  });

  return [headers, ...rows];
}

export function createDiffSheet(a: QueryResult, b: QueryResult): DiffSheet {
  const sheetA = resultToSheet(a);
  const sheetB = resultToSheet(b);

  const viewA = new daff.TableView(sheetA);
  const viewB = new daff.TableView(sheetB);
  const alignment = daff.compareTables(viewA, viewB).align();

  const flags = new daff.CompareFlags();
  const highlighter = new daff.TableDiff(alignment, flags);

  const out = new daff.TableView([]);
  highlighter.hilite(out);

  const json = daff.jsonify(out);
  // daff.jsonify(out).h.sheet は (string|number|boolean|null|undefined)[][] になりうるが、
  // 本アプリでは文字列として表示するため、必要に応じて JSX 側で string 化する。
  return (json?.h?.sheet ?? []) as DiffSheet;
}
