import type { FC } from "hono/jsx";
import type { QueryResult } from "../services/query.js";

type Props = {
  queryA?: string;
  queryB?: string;
  resultA?: QueryResult;
  resultB?: QueryResult;
  errorA?: string;
  errorB?: string;
};

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
        // Objectの暗黙文字列化を避けて、型情報だけ返す
        return Object.prototype.toString.call(v);
      }
    }
    default:
      return "";
  }
}

export const Index: FC<Props> = ({
  queryA,
  queryB,
  resultA,
  resultB,
  errorA,
  errorB,
}) => {
  const defaultQuery = `select
  1 as one,
  now() as now`;
  const currentQueryA =
    (queryA ?? "").trim().length > 0 ? queryA! : defaultQuery;
  const currentQueryB = (queryB ?? "").trim().length > 0 ? queryB! : "";

  const hasAnyResult = Boolean(resultA || resultB);
  const hasAnyError = Boolean(errorA || errorB);
  const isEditorOpen = hasAnyError || !hasAnyResult;

  const showATabByDefault = Boolean(resultA || errorA) || !(resultB || errorB);

  return (
    <div class="container">
      <header class="header">
        <div>
          <h1 class="title">queot — Query Console</h1>
          <p class="subtitle">
            フォームでSQLを送信し、結果をサーバ側でレンダリングして表示します。
          </p>
        </div>
      </header>

      <main class="main">
        <section class="panel">
          <details class="details" open={isEditorOpen}>
            <summary class="summary">
              <span class="summaryTitle">SQL</span>
            </summary>
            <form method="post" action="/">
              <div class="sqlGrid">
                <div class="sqlCol">
                  <div class="sqlLabelRow">
                    <span class="sqlLabel">Query A</span>
                  </div>
                  <textarea
                    id="sqlA"
                    name="queryA"
                    class="textarea"
                    spellcheck={false}
                    rows={10}
                  >
                    {currentQueryA}
                  </textarea>
                </div>

                <div class="sqlCol">
                  <div class="sqlLabelRow">
                    <span class="sqlLabel">Query B</span>
                  </div>
                  <textarea
                    id="sqlB"
                    name="queryB"
                    class="textarea"
                    spellcheck={false}
                    rows={10}
                  >
                    {currentQueryB}
                  </textarea>
                </div>
              </div>

              <div class="actions">
                <button type="submit" class="button">
                  Run
                </button>
              </div>
            </form>
          </details>
        </section>

        <section class="panel">
          <div class="row">
            <h2 class="h2">Result</h2>
          </div>

          {hasAnyResult || hasAnyError ? (
            <div class="tabsRoot">
              <input
                class="tabInput"
                type="radio"
                name="resultTab"
                id="tabA"
                checked={showATabByDefault}
              />
              <input
                class="tabInput"
                type="radio"
                name="resultTab"
                id="tabB"
                checked={!showATabByDefault}
              />

              <div class="tabs">
                <label class="tab" for="tabA">
                  Query A
                </label>
                <label class="tab" for="tabB">
                  Query B
                </label>
              </div>

              <div class="panels">
                <section id="panelA" class="panelBody">
                  {errorA ? <div class="error">{errorA}</div> : null}
                  {resultA ? (
                    <div class="result">
                      <table>
                        <thead>
                          <tr>
                            {resultA.fields.map((f) => (
                              <th>{f.name}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {resultA.rows.map((r) => {
                            const row = r as Record<string, unknown>;
                            return (
                              <tr>
                                {resultA.fields.map((f) => (
                                  <td>{cellText(row[f.name])}</td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <div class="meta">{resultA.rows.length} row(s)</div>
                    </div>
                  ) : (
                    <div class="meta">Query Aは未実行/空です。</div>
                  )}
                </section>

                <section id="panelB" class="panelBody">
                  {errorB ? <div class="error">{errorB}</div> : null}
                  {resultB ? (
                    <div class="result">
                      <table>
                        <thead>
                          <tr>
                            {resultB.fields.map((f) => (
                              <th>{f.name}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {resultB.rows.map((r) => {
                            const row = r as Record<string, unknown>;
                            return (
                              <tr>
                                {resultB.fields.map((f) => (
                                  <td>{cellText(row[f.name])}</td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <div class="meta">{resultB.rows.length} row(s)</div>
                    </div>
                  ) : (
                    <div class="meta">Query Bは未実行/空です。</div>
                  )}
                </section>
              </div>
            </div>
          ) : (
            <div class="meta">
              まだ結果はありません。上のフォームから実行してください。
            </div>
          )}
        </section>
      </main>

      <style>{`
        :root { color-scheme: light dark; }
        body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"; }
        .container { max-width: 1100px; margin: 0 auto; padding: 24px; }
        .header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 18px; }
        .title { margin: 0; font-size: 20px; font-weight: 700; }
        .subtitle { margin: 6px 0 0; opacity: 0.75; font-size: 13px; }
        .main { display: grid; gap: 16px; grid-template-columns: 1fr; }
        .panel { border: 1px solid rgba(127,127,127,0.25); border-radius: 12px; padding: 14px; background: rgba(127,127,127,0.06); }
        .row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
        .label { font-size: 13px; font-weight: 600; opacity: 0.9; }
        .hint { font-size: 12px; opacity: 0.7; }
        .h2 { margin: 0; font-size: 13px; font-weight: 700; opacity: 0.9; }
        .details { display: block; }
        .summary { cursor: pointer; display: flex; justify-content: space-between; align-items: baseline; gap: 12px; list-style: none; }
        .summary::-webkit-details-marker { display: none; }
        .summaryTitle { font-size: 13px; font-weight: 700; opacity: 0.95; }
        .summaryHint { font-size: 12px; opacity: 0.7; }
        .sqlGrid { display: grid; grid-template-columns: 1fr; gap: 12px; margin-top: 8px; }
        @media (min-width: 980px) { .sqlGrid { grid-template-columns: 1fr 1fr; } }
        .sqlCol { display: flex; flex-direction: column; }
        .sqlLabelRow { display: flex; justify-content: space-between; align-items: baseline; }
        .sqlLabel { font-size: 12px; opacity: 0.8; font-weight: 600; }
        .textarea { width: 100%; margin-top: 8px; padding: 10px 12px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 12.5px; line-height: 1.35; border-radius: 10px; border: 1px solid rgba(127,127,127,0.35); background: rgba(0,0,0,0.05); }
        .actions { display: flex; align-items: center; gap: 12px; margin-top: 10px; }
        .button { border-radius: 10px; border: 1px solid rgba(127,127,127,0.35); padding: 8px 12px; cursor: pointer; font-weight: 600; }
        .button:disabled { opacity: 0.6; cursor: not-allowed; }
        .error { margin-top: 10px; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(220, 38, 38, 0.5); background: rgba(220, 38, 38, 0.1); font-size: 12px; white-space: pre-wrap; }
        .result { margin-top: 10px; overflow: auto; max-height: 540px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border-bottom: 1px solid rgba(127,127,127,0.25); padding: 8px 10px; text-align: left; vertical-align: top; }
        th { position: sticky; top: 0; background: rgba(30,30,30,0.08); backdrop-filter: blur(4px); font-weight: 700; }
        td { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
        .meta { margin-top: 6px; font-size: 12px; opacity: 0.7; }
        .tabsRoot { margin-top: 10px; }
        .tabInput { position: absolute; opacity: 0; pointer-events: none; }
        .tabs { display: inline-flex; gap: 6px; padding: 4px; border: 1px solid rgba(127,127,127,0.35); border-radius: 12px; background: rgba(0,0,0,0.04); }
        .tab { cursor: pointer; padding: 6px 10px; border-radius: 10px; font-size: 12px; font-weight: 700; opacity: 0.8; user-select: none; }
        #tabA:checked ~ .tabs label[for="tabA"],
        #tabB:checked ~ .tabs label[for="tabB"] { background: rgba(127,127,127,0.18); opacity: 1; }
        .panels { margin-top: 10px; }
        .panelBody { display: none; }
        #tabA:checked ~ .panels #panelA { display: block; }
        #tabB:checked ~ .panels #panelB { display: block; }
      `}</style>
    </div>
  );
};
