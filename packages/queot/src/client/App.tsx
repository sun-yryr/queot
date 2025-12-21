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

  const tabClass = (active: boolean) =>
    [
      "cursor-pointer select-none rounded-lg border border-transparent px-3 py-1.5 text-xs font-bold",
      "text-zinc-700 hover:bg-zinc-200/40 dark:text-zinc-200 dark:hover:bg-zinc-800/40",
      active ? "border-indigo-500/30 bg-indigo-500/15" : "",
    ]
      .filter(Boolean)
      .join(" ");

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
    <div class="mx-auto max-w-5xl px-6 py-6">
      <header class="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 class="m-0 text-lg font-bold">queot — Query Console</h1>
          <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            フォームでSQLを送信し、JSON API（/api/run）経由で結果を表示します。
          </p>
        </div>
      </header>

      <main class="grid gap-4">
        <section class="rounded-xl border border-zinc-200/70 bg-zinc-50/60 p-4 dark:border-zinc-800/60 dark:bg-zinc-900/20">
          <details open={true}>
            <summary class="flex cursor-pointer list-none items-baseline justify-between gap-3 select-none [&::-webkit-details-marker]:hidden">
              <span class="text-sm font-bold text-zinc-800 dark:text-zinc-100">
                SQL
              </span>
              <span class="text-xs text-zinc-500 dark:text-zinc-400">
                （クリックで開閉）
              </span>
            </summary>
            <div class="mt-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void run();
                }}
              >
                <div class="mt-2 grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div class="flex flex-col">
                    <div class="flex items-baseline justify-between">
                      <span class="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                        Query A
                      </span>
                    </div>
                    <textarea
                      id="sqlA"
                      class="mt-2 w-full rounded-xl border border-zinc-300/70 bg-white/70 px-3 py-2 font-mono text-sm leading-snug shadow-sm outline-none focus:ring-2 focus:ring-indigo-400/50 dark:border-zinc-700/70 dark:bg-zinc-950/40"
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

                  <div class="flex flex-col">
                    <div class="flex items-baseline justify-between">
                      <span class="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                        Query B
                      </span>
                    </div>
                    <textarea
                      id="sqlB"
                      class="mt-2 w-full rounded-xl border border-zinc-300/70 bg-white/70 px-3 py-2 font-mono text-sm leading-snug shadow-sm outline-none focus:ring-2 focus:ring-indigo-400/50 dark:border-zinc-700/70 dark:bg-zinc-950/40"
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

                <div class="mt-3 flex flex-col gap-1.5">
                  <div class="flex items-baseline justify-between">
                    <span class="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                      実行計画
                    </span>
                    <span class="text-xs text-zinc-500 dark:text-zinc-400">
                      EXPLAIN / EXPLAIN ANALYZE を自動付与
                    </span>
                  </div>
                  <div class="flex flex-wrap items-center gap-3">
                    <label class="inline-flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                      <input
                        type="radio"
                        name="planMode"
                        value="explain"
                        checked={planMode === "explain"}
                        onChange={() => setPlanMode("explain")}
                      />
                      EXPLAIN
                    </label>
                    <label class="inline-flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
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

                <div class="mt-2 flex items-center gap-3">
                  <button
                    type="submit"
                    class="inline-flex items-center justify-center rounded-xl border border-zinc-300/70 bg-white px-3 py-2 text-sm font-semibold shadow-sm hover:bg-zinc-50 active:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700/70 dark:bg-zinc-900/40 dark:hover:bg-zinc-800/50"
                    disabled={loading}
                  >
                    {loading ? "Running..." : "Run"}
                  </button>
                </div>
              </form>
            </div>
          </details>
        </section>

        <section class="rounded-xl border border-zinc-200/70 bg-zinc-50/60 p-4 dark:border-zinc-800/60 dark:bg-zinc-900/20">
          <div class="flex items-baseline justify-between gap-3">
            <h2 class="m-0 text-sm font-bold text-zinc-700 dark:text-zinc-200">
              Result
            </h2>
          </div>

          {hasAnyResult || hasAnyError ? (
            <>
              <div class="mt-3">
                <div class="inline-flex gap-1 rounded-xl border border-zinc-300/70 bg-zinc-100/50 p-1 dark:border-zinc-700/70 dark:bg-zinc-900/40">
                  <button
                    type="button"
                    class={tabClass(resultTab === "diff")}
                    onClick={() => setResultTab("diff")}
                  >
                    Diff
                  </button>
                  <button
                    type="button"
                    class={tabClass(resultTab === "a")}
                    onClick={() => setResultTab("a")}
                  >
                    Query A
                  </button>
                  <button
                    type="button"
                    class={tabClass(resultTab === "b")}
                    onClick={() => setResultTab("b")}
                  >
                    Query B
                  </button>
                </div>

                <div class="mt-3">
                  {resultTab === "diff" ? (
                    <section>
                      <DiffView
                        diff={diff}
                        hasBothResults={Boolean(resultA && resultB)}
                      />
                    </section>
                  ) : resultTab === "a" ? (
                    <section>
                      <QueryResultTable
                        result={resultA}
                        error={errorA}
                        emptyMessage="Query Aは未実行/空です。"
                      />
                    </section>
                  ) : (
                    <section>
                      <QueryResultTable
                        result={resultB}
                        error={errorB}
                        emptyMessage="Query Bは未実行/空です。"
                      />
                    </section>
                  )}
                </div>
              </div>

              <section class="mt-5 border-t border-zinc-200/70 pt-4 dark:border-zinc-800/60">
                <div class="flex items-baseline justify-between gap-3">
                  <div>
                    <h3 class="m-0 text-sm font-bold text-zinc-700 dark:text-zinc-200">
                      Execution Plan
                    </h3>
                    <div class="text-xs text-zinc-500 dark:text-zinc-400">
                      {planMode === "analyze"
                        ? "EXPLAIN ANALYZE を付与して実行計画を取得しています。"
                        : "EXPLAIN を付与して実行計画を取得しています。"}
                    </div>
                  </div>
                  <div class="rounded-full border border-indigo-500/30 bg-indigo-500/15 px-3 py-1 text-xs font-extrabold">
                    {planMode === "analyze" ? "EXPLAIN ANALYZE" : "EXPLAIN"}
                  </div>
                </div>

                <div class="mt-3">
                  <div class="inline-flex gap-1 rounded-xl border border-zinc-300/70 bg-zinc-100/50 p-1 dark:border-zinc-700/70 dark:bg-zinc-900/40">
                    <button
                      type="button"
                      class={tabClass(planTab === "a")}
                      onClick={() => setPlanTab("a")}
                    >
                      Plan A
                    </button>
                    <button
                      type="button"
                      class={tabClass(planTab === "b")}
                      onClick={() => setPlanTab("b")}
                    >
                      Plan B
                    </button>
                  </div>

                  <div class="mt-3">
                    {planTab === "a" ? (
                      <section>
                        <PlanResult
                          result={planResultA}
                          error={
                            planErrorA ?? "Query Aの実行計画は未実行/空です。"
                          }
                        />
                      </section>
                    ) : (
                      <section>
                        <PlanResult
                          result={planResultB}
                          error={
                            planErrorB ?? "Query Bの実行計画は未実行/空です。"
                          }
                        />
                      </section>
                    )}
                  </div>
                </div>
              </section>
            </>
          ) : (
            <div class="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              まだ結果はありません。上のフォームから実行してください。
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
