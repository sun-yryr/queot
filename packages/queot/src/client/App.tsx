import { useState } from "hono/jsx/dom";
import { DiffView } from "./components/DiffView.jsx";
import { QueryResultTable } from "./components/QueryResultTable.jsx";
import { PlanResult } from "./components/PlanResult.jsx";
import type { RunResponse } from "../routes/api.js";
import type { QueryResult } from "../services/query.js";
import type { DiffSheet } from "../services/diff.js";
import type { ExplainParseResult } from "@sun-yryr/queot-planparser";

type PlanMode = "explain" | "analyze";
type ResultTab = "diff" | "a" | "b";
type PlanTab = "a" | "b";

const DEFAULT_QUERY = `select
  1 as one,
  now() as now`;

export function App() {
  const [queryA, setQueryA] = useState(DEFAULT_QUERY);
  const [queryB, setQueryB] = useState("");
  const [planMode, setPlanMode] = useState<PlanMode>("explain");

  const [loading, setLoading] = useState(false);
  const [resultTab, setResultTab] = useState<ResultTab>("diff");
  const [planTab, setPlanTab] = useState<PlanTab>("a");

  const [resultA, setResultA] = useState<QueryResult | undefined>(undefined);
  const [resultB, setResultB] = useState<QueryResult | undefined>(undefined);
  const [errorA, setErrorA] = useState<string | undefined>(undefined);
  const [errorB, setErrorB] = useState<string | undefined>(undefined);
  const [diff, setDiff] = useState<DiffSheet | undefined>(undefined);

  const [planResultA, setPlanResultA] = useState<
    ExplainParseResult | undefined
  >(undefined);
  const [planResultB, setPlanResultB] = useState<
    ExplainParseResult | undefined
  >(undefined);
  const [planErrorA, setPlanErrorA] = useState<string | undefined>(undefined);
  const [planErrorB, setPlanErrorB] = useState<string | undefined>(undefined);

  const hasAnyResult = Boolean(
    resultA || resultB || planResultA || planResultB,
  );
  const hasAnyError = Boolean(errorA || errorB || planErrorA || planErrorB);

  async function run(): Promise<void> {
    setLoading(true);
    try {
      const resp = await fetch("/api/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          queryA,
          queryB,
          planMode,
        }),
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(`HTTP ${resp.status}${text ? `: ${text}` : ""}`);
      }

      const data = (await resp.json()) as RunResponse;
      setResultA(data.resultA);
      setResultB(data.resultB);
      setErrorA(data.errorA);
      setErrorB(data.errorB);
      setDiff(data.diff);

      setPlanResultA(data.planResultA);
      setPlanResultB(data.planResultB);
      setPlanErrorA(data.planErrorA);
      setPlanErrorB(data.planErrorB);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrorA(msg);
      setErrorB(undefined);
      setPlanErrorA(undefined);
      setPlanErrorB(undefined);
      setResultA(undefined);
      setResultB(undefined);
      setDiff(undefined);
      setPlanResultA(undefined);
      setPlanResultB(undefined);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div class="container">
      <header class="header">
        <div>
          <h1 class="title">queot — Query Console</h1>
          <p class="subtitle">
            フォームでSQLを送信し、JSON API（/api/run）経由で結果を表示します。
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
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void run();
                }}
              >
                <div class="sqlGrid">
                  <div class="sqlCol">
                    <div class="sqlLabelRow">
                      <span class="sqlLabel">Query A</span>
                    </div>
                    <textarea
                      id="sqlA"
                      class="textarea"
                      spellcheck={false}
                      rows={10}
                      value={queryA}
                      onInput={(e) =>
                        setQueryA(
                          (e.currentTarget as HTMLTextAreaElement).value,
                        )
                      }
                    />
                  </div>

                  <div class="sqlCol">
                    <div class="sqlLabelRow">
                      <span class="sqlLabel">Query B</span>
                    </div>
                    <textarea
                      id="sqlB"
                      class="textarea"
                      spellcheck={false}
                      rows={10}
                      value={queryB}
                      onInput={(e) =>
                        setQueryB(
                          (e.currentTarget as HTMLTextAreaElement).value,
                        )
                      }
                    />
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
                        checked={planMode === "explain"}
                        onChange={() => setPlanMode("explain")}
                      />
                      EXPLAIN
                    </label>
                    <label class="planModeOption">
                      <input
                        type="radio"
                        name="planMode"
                        value="analyze"
                        checked={planMode === "analyze"}
                        onChange={() => setPlanMode("analyze")}
                      />
                      EXPLAIN ANALYZE
                    </label>
                  </div>
                </div>

                <div class="actions">
                  <button type="submit" class="button" disabled={loading}>
                    {loading ? "Running..." : "Run"}
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
                  checked={resultTab === "diff"}
                  onChange={() => setResultTab("diff")}
                />
                <input
                  class="tabInput"
                  type="radio"
                  name="resultTab"
                  id="tabA"
                  checked={resultTab === "a"}
                  onChange={() => setResultTab("a")}
                />
                <input
                  class="tabInput"
                  type="radio"
                  name="resultTab"
                  id="tabB"
                  checked={resultTab === "b"}
                  onChange={() => setResultTab("b")}
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
                      {planMode === "analyze"
                        ? "EXPLAIN ANALYZE を付与して実行計画を取得しています。"
                        : "EXPLAIN を付与して実行計画を取得しています。"}
                    </div>
                  </div>
                  <div class="planModeBadge">
                    {planMode === "analyze" ? "EXPLAIN ANALYZE" : "EXPLAIN"}
                  </div>
                </div>

                <div class="tabsRoot">
                  <input
                    class="tabInput"
                    type="radio"
                    name="planTab"
                    id="planTabA"
                    checked={planTab === "a"}
                    onChange={() => setPlanTab("a")}
                  />
                  <input
                    class="tabInput"
                    type="radio"
                    name="planTab"
                    id="planTabB"
                    checked={planTab === "b"}
                    onChange={() => setPlanTab("b")}
                  />

                  <div class="tabs">
                    <label class="tab" for="planTabA">
                      Plan A
                    </label>
                    <label class="tab" for="planTabB">
                      Plan B
                    </label>
                  </div>

                  <div class="panels">
                    <section id="planPanelA" class="panelBody">
                      <PlanResult
                        result={planResultA}
                        error={
                          planErrorA ?? "Query Aの実行計画は未実行/空です。"
                        }
                      />
                    </section>
                    <section id="planPanelB" class="panelBody">
                      <PlanResult
                        result={planResultB}
                        error={
                          planErrorB ?? "Query Bの実行計画は未実行/空です。"
                        }
                      />
                    </section>
                  </div>
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
    </div>
  );
}
