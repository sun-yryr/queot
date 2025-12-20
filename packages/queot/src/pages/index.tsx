import type { FC } from "hono/jsx";
import type { QueryResult } from "../services/query.js";
import type { DiffSheet } from "../services/diff.js";
import { DiffView } from "./components/DiffView.jsx";
import { QueryResultTable } from "./components/QueryResultTable.jsx";

type PlanMode = "explain" | "analyze";

type Props = {
  queryA?: string;
  queryB?: string;
  resultA?: QueryResult;
  resultB?: QueryResult;
  errorA?: string;
  errorB?: string;
  diff?: DiffSheet;
  planMode?: PlanMode;
  planResultA?: QueryResult;
  planResultB?: QueryResult;
  planErrorA?: string;
  planErrorB?: string;
  planDiff?: DiffSheet;
};

export const Index: FC<Props> = ({
  queryA,
  queryB,
  resultA,
  resultB,
  errorA,
  errorB,
  diff,
  planMode,
  planResultA,
  planResultB,
  planErrorA,
  planErrorB,
  planDiff,
}) => {
  const defaultQuery = `select
  1 as one,
  now() as now`;
  const currentQueryA =
    (queryA ?? "").trim().length > 0 ? queryA! : defaultQuery;
  const currentQueryB = (queryB ?? "").trim().length > 0 ? queryB! : "";
  const currentPlanMode: PlanMode = planMode ?? "explain";

  const hasAnyResult = Boolean(
    resultA || resultB || planResultA || planResultB,
  );
  const hasAnyError = Boolean(errorA || errorB || planErrorA || planErrorB);

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
          <details class="disclosure sqlEditor" open={true}>
            <summary class="disclosureSummary">
              <span class="disclosureTitle">SQL</span>
              <span class="disclosureHint">（クリックで開閉）</span>
            </summary>
            <div class="disclosureBody">
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

                <div class="sqlOptions">
                  <div class="sqlLabelRow">
                    <span class="sqlLabel">実行計画</span>
                    <span class="hint">
                      EXPLAIN / EXPLAIN ANALYZE を自動付与
                    </span>
                  </div>
                  <div class="planModeRow">
                    <label class="planModeOption">
                      <input
                        type="radio"
                        name="planMode"
                        value="explain"
                        checked={currentPlanMode === "explain"}
                      />
                      EXPLAIN
                    </label>
                    <label class="planModeOption">
                      <input
                        type="radio"
                        name="planMode"
                        value="analyze"
                        checked={currentPlanMode === "analyze"}
                      />
                      EXPLAIN ANALYZE
                    </label>
                  </div>
                </div>

                <div class="actions">
                  <button type="submit" class="button">
                    Run
                  </button>
                </div>
              </form>
            </div>
          </details>
        </section>

        <section class="panel">
          <div class="row">
            <h2 class="h2">Result</h2>
          </div>

          {hasAnyResult || hasAnyError ? (
            <>
              <div class="tabsRoot">
                <input
                  class="tabInput"
                  type="radio"
                  name="resultTab"
                  id="tabDiff"
                  checked
                />
                <input
                  class="tabInput"
                  type="radio"
                  name="resultTab"
                  id="tabA"
                />
                <input
                  class="tabInput"
                  type="radio"
                  name="resultTab"
                  id="tabB"
                />

                <div class="tabs">
                  <label class="tab" for="tabDiff">
                    Diff
                  </label>
                  <label class="tab" for="tabA">
                    Query A
                  </label>
                  <label class="tab" for="tabB">
                    Query B
                  </label>
                </div>

                <div class="panels">
                  <section id="panelDiff" class="panelBody">
                    <DiffView
                      diff={diff}
                      hasBothResults={Boolean(resultA && resultB)}
                    />
                  </section>

                  <section id="panelA" class="panelBody">
                    <QueryResultTable
                      result={resultA}
                      error={errorA}
                      emptyMessage="Query Aは未実行/空です。"
                    />
                  </section>

                  <section id="panelB" class="panelBody">
                    <QueryResultTable
                      result={resultB}
                      error={errorB}
                      emptyMessage="Query Bは未実行/空です。"
                    />
                  </section>
                </div>
              </div>

              <section class="planSection">
                <div class="row planHeader">
                  <div>
                    <h3 class="h3">Execution Plan</h3>
                    <div class="hint">
                      {currentPlanMode === "analyze"
                        ? "EXPLAIN ANALYZE を付与して実行計画を取得しています。"
                        : "EXPLAIN を付与して実行計画を取得しています。"}
                    </div>
                  </div>
                  <div class="planModeBadge">
                    {currentPlanMode === "analyze"
                      ? "EXPLAIN ANALYZE"
                      : "EXPLAIN"}
                  </div>
                </div>

                <div class="planGrid">
                  <div class="planCol">
                    <div class="planColHeader">Query A</div>
                    <QueryResultTable
                      result={planResultA}
                      error={planErrorA}
                      emptyMessage="Query Aの実行計画は未実行/空です。"
                    />
                  </div>
                  <div class="planCol">
                    <div class="planColHeader">Query B</div>
                    <QueryResultTable
                      result={planResultB}
                      error={planErrorB}
                      emptyMessage="Query Bの実行計画は未実行/空です。"
                    />
                  </div>
                </div>

                <div class="planDiff">
                  <div class="planColHeader">Plan Diff</div>
                  <DiffView
                    diff={planDiff}
                    hasBothResults={Boolean(planResultA && planResultB)}
                    emptyMessage="Diffには Query A と Query B 両方の実行計画が必要です。"
                  />
                </div>
              </section>
            </>
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
        .h3 { margin: 0; font-size: 13px; font-weight: 700; opacity: 0.9; }

        /* 汎用: details/summary を “開閉できるセクション” として表現する */
        .disclosure { display: block; }
        .disclosureSummary { cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
        .disclosureSummary::-webkit-details-marker { display: none; }
        .disclosureTitle { font-size: 13px; font-weight: 700; opacity: 0.95; }
        .disclosureHint { font-size: 12px; opacity: 0.7; }
        .disclosureBody { margin-top: 8px; }
        .sqlGrid { display: grid; grid-template-columns: 1fr; gap: 12px; margin-top: 8px; }
        @media (min-width: 980px) { .sqlGrid { grid-template-columns: 1fr 1fr; } }
        .sqlCol { display: flex; flex-direction: column; }
        .sqlLabelRow { display: flex; justify-content: space-between; align-items: baseline; }
        .sqlLabel { font-size: 12px; opacity: 0.8; font-weight: 600; }
        .sqlOptions { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }
        .planModeRow { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
        .planModeOption { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; opacity: 0.85; }
        .planModeOption input { accent-color: rgba(99,102,241,0.7); }
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
        .tab {
          position: relative;
          cursor: pointer;
          padding: 7px 12px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 700;
          user-select: none;
          opacity: 0.9;
          border: 1px solid transparent;
        }
        .tab:hover { background: rgba(127,127,127,0.10); }
        .tab:focus-visible { outline: 2px solid rgba(99,102,241,0.65); outline-offset: 2px; }

        /* NOTE: Hono JSX の <style> は内容がエスケープされるため、属性セレクタのクォートは使わない */
        #tabDiff:checked ~ .tabs label[for=tabDiff],
        #tabA:checked ~ .tabs label[for=tabA],
        #tabB:checked ~ .tabs label[for=tabB] {
          background: rgba(99,102,241,0.22);
          border-color: rgba(99,102,241,0.45);
          opacity: 1;
        }
        .panels { margin-top: 10px; }
        .panelBody { display: none; }
        #tabDiff:checked ~ .panels #panelDiff { display: block; }
        #tabA:checked ~ .panels #panelA { display: block; }
        #tabB:checked ~ .panels #panelB { display: block; }

        .planSection { margin-top: 18px; border-top: 1px solid rgba(127,127,127,0.25); padding-top: 14px; }
        .planHeader { align-items: center; }
        .planModeBadge { border-radius: 999px; border: 1px solid rgba(99,102,241,0.45); background: rgba(99,102,241,0.18); padding: 6px 12px; font-size: 12px; font-weight: 800; }
        .planGrid { display: grid; grid-template-columns: 1fr; gap: 12px; margin-top: 10px; }
        @media (min-width: 980px) { .planGrid { grid-template-columns: 1fr 1fr; } }
        .planCol { display: flex; flex-direction: column; gap: 6px; }
        .planColHeader { font-size: 12px; font-weight: 700; opacity: 0.85; }
        .planDiff { margin-top: 12px; }

        .diffTable th, .diffTable td { white-space: pre-wrap; }
        .diffTable thead th { position: sticky; z-index: 2; }
        .diffHeadMetaRow th { background: rgba(127,127,127,0.10); font-weight: 600; opacity: 0.9; }
        .diffHeadHeaderRow th { background: rgba(30,30,30,0.10); font-weight: 800; }
        /* 列変更色は、行変更色より優先させる（特に row追加×col削除 のケースを崩さない） */
        .diffColAdded { background: rgba(34, 197, 94, 0.18) !important; }
        .diffColRemoved { background: rgba(239, 68, 68, 0.18) !important; }
        .diffColChanged { background: rgba(234, 179, 8, 0.14) !important; }
        .diffMarker { width: 52px; text-align: center; font-weight: 700; opacity: 0.85; }
        .diffRowAdded td { background: rgba(34, 197, 94, 0.12); }
        .diffRowRemoved td { background: rgba(239, 68, 68, 0.12); }
        .diffRowChanged td { background: rgba(234, 179, 8, 0.10); }
        .diffRowOmitted td { text-align: center; opacity: 0.65; font-style: italic; }
        .diffCell { display: inline-flex; gap: 6px; align-items: baseline; flex-wrap: wrap; }
        .diffCellOld { opacity: 0.75; text-decoration: line-through; }
        .diffCellArrow { opacity: 0.65; }
        .diffCellNew { font-weight: 700; }

        .diffLegend { margin-bottom: 10px; border-radius: 10px; border: 1px solid rgba(127,127,127,0.25); background: rgba(127,127,127,0.06); overflow: hidden; }
        .diffLegend .disclosureSummary { padding: 10px 12px; }
        .diffLegend .disclosureTitle { font-size: 12px; font-weight: 800; opacity: 0.9; }
        .diffLegend .disclosureHint { font-size: 11px; opacity: 0.65; }
        .diffLegendBody { padding: 0 12px 10px; border-top: 1px solid rgba(127,127,127,0.18); }
        .diffLegendGrid { margin-top: 10px; display: grid; gap: 6px; grid-template-columns: 1fr; }
        @media (min-width: 980px) { .diffLegendGrid { grid-template-columns: 1fr 1fr; } }
        .diffLegendItem { display: flex; gap: 8px; align-items: flex-start; }
        .diffLegendSwatch { width: 14px; height: 14px; border-radius: 4px; border: 1px solid rgba(127,127,127,0.25); margin-top: 2px; flex: 0 0 auto; }
        .diffLegendSwatchMeta { display: inline-flex; align-items: center; justify-content: center; font-weight: 900; font-size: 11px; background: rgba(127,127,127,0.10); color: rgba(0,0,0,0.65); }
        .diffLegendText { font-size: 12px; opacity: 0.85; }
        .diffLegendText code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 11px; }
        .diffLegendNote { margin-left: 6px; opacity: 0.8; }
      `}</style>
    </div>
  );
};
