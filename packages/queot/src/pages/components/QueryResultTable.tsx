import type { FC } from "hono/jsx";
import type { QueryResult } from "../../services/query.js";

function cellText(v: unknown): string {
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

type Props = {
  result?: QueryResult;
  error?: string;
  emptyMessage: string;
};

export const QueryResultTable: FC<Props> = ({
  result,
  error,
  emptyMessage,
}) => {
  return (
    <>
      {error ? <div class="error">{error}</div> : null}
      {result ? (
        <div class="result">
          <table>
            <thead>
              <tr>
                {result.fields.map((f) => (
                  <th>{f.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r) => {
                const row = r as Record<string, unknown>;
                return (
                  <tr>
                    {result.fields.map((f) => (
                      <td>{cellText(row[f.name])}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div class="meta">{result.rows.length} row(s)</div>
        </div>
      ) : (
        <div class="meta">{emptyMessage}</div>
      )}
    </>
  );
};
