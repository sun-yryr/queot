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
      {error ? (
        <div class="mt-3 whitespace-pre-wrap rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm">
          {error}
        </div>
      ) : null}
      {result ? (
        <div class="mt-3 max-h-[540px] overflow-auto rounded-xl border border-zinc-200/60 bg-white/60 dark:border-zinc-800/60 dark:bg-zinc-950/20">
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr>
                {result.fields.map((f) => (
                  <th class="sticky top-0 bg-zinc-100/70 px-2.5 py-2 text-left font-bold backdrop-blur dark:bg-zinc-900/60">
                    {f.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r) => {
                const row = r as Record<string, unknown>;
                return (
                  <tr>
                    {result.fields.map((f) => (
                      <td class="border-b border-zinc-200/70 px-2.5 py-2 align-top font-mono text-[12.5px] dark:border-zinc-800/60">
                        {cellText(row[f.name])}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div class="mt-2 px-3 pb-3 text-xs text-zinc-500 dark:text-zinc-400">
            {result.rows.length} row(s)
          </div>
        </div>
      ) : (
        <div class="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          {emptyMessage}
        </div>
      )}
    </>
  );
};
