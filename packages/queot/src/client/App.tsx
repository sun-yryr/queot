import { useEffect, useRef, useState } from "hono/jsx/dom";
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

function diffHasChanges(diff: DiffSheet | undefined): boolean {
  const rows = diff ?? [];
  // DiffView と同じ判定: row差分だけでなく、カラム差分（"!" 行）も「差分あり」と扱う
  return rows.some((row) => {
    const marker = cellText(row?.[0]);
    return (
      marker === "!" || marker === "+++" || marker === "---" || marker === "->"
    );
  });
}

export function App() {
  const [queryA, setQueryA] = useState(DEFAULT_QUERY);
  const [queryB, setQueryB] = useState("");
  const [planMode, setPlanMode] = useState<PlanMode>("explain");

  const [loading, setLoading] = useState(false);
  const [resultTab, setResultTab] = useState<ResultTab>("diff");
  const [planTab, setPlanTab] = useState<PlanTab>("a");
  const [resultOpen, setResultOpen] = useState<boolean>(true);

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

  const hasAnyQueryResultOrError = Boolean(resultA || resultB || errorA || errorB);
  const hasAnyPlanOrError = Boolean(
    planResultA || planResultB || planErrorA || planErrorB,
  );
  const hasAnyResult = Boolean(hasAnyQueryResultOrError || hasAnyPlanOrError);

  // タブ切り替えで上下位置がズレないよう、各タブ内容の最大高さをコンテナに与える
  const resultDiffRef = useRef<HTMLDivElement>(null);
  const resultARef = useRef<HTMLDivElement>(null);
  const resultBRef = useRef<HTMLDivElement>(null);
  const [resultMinHeight, setResultMinHeight] = useState<number>(0);

  const planARef = useRef<HTMLDivElement>(null);
  const planBRef = useRef<HTMLDivElement>(null);
  const [planMinHeight, setPlanMinHeight] = useState<number>(0);

  const tabPanelClass = (active: boolean) =>
    active
      ? "relative"
      : "pointer-events-none absolute left-0 top-0 w-full opacity-0";

  useEffect(() => {
    const els = [
      resultDiffRef.current,
      resultARef.current,
      resultBRef.current,
    ].filter(Boolean) as HTMLDivElement[];
    if (!els.length) return;

    const calc = () => {
      const h = Math.max(...els.map((el) => el.getBoundingClientRect().height));
      if (Number.isFinite(h)) setResultMinHeight(Math.ceil(h));
    };
    calc();

    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => calc());
    for (const el of els) ro.observe(el);
    return () => ro.disconnect();
  }, [diff, resultA, resultB, errorA, errorB, resultOpen]);

  useEffect(() => {
    const els = [planARef.current, planBRef.current].filter(
      Boolean,
    ) as HTMLDivElement[];
    if (!els.length) return;

    const calc = () => {
      const h = Math.max(...els.map((el) => el.getBoundingClientRect().height));
      if (Number.isFinite(h)) setPlanMinHeight(Math.ceil(h));
    };
    calc();

    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => calc());
    for (const el of els) ro.observe(el);
    return () => ro.disconnect();
  }, [planResultA, planResultB, planErrorA, planErrorB, planMode]);

  const tabClass = (active: boolean) =>
    [
      "cursor-pointer select-none rounded-lg border border-transparent px-3 py-1.5 text-xs font-bold",
      "text-zinc-700 hover:bg-zinc-200/40 dark:text-zinc-200 dark:hover:bg-zinc-800/40",
      active ? "border-indigo-500/30 bg-indigo-500/15" : "",
    ]
      .filter(Boolean)
      .join(" ");

  function scrollExecutionPlanToTop(): void {
    const el = document.getElementById("execution-plan");
    if (!el) return;
    // state更新で高さが変わるケースもあるので、次フレームでスクロール
    requestAnimationFrame(() => {
      el.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }

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

      // 初期表示: 差分がない（= 完全一致）なら Result を閉じる。
      // ただし片側しか結果がない場合は Result を開いて見えるようにする。
      const hasBoth = Boolean(data.resultA && data.resultB);
      const openByDefault = hasBoth
        ? data.diff
          ? diffHasChanges(data.diff)
          : true
        : true;
      setResultOpen(openByDefault);
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
      setResultOpen(true);
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
              出力
            </h2>
          </div>

          {hasAnyResult ? (
            <>
              {hasAnyQueryResultOrError ? (
                <details
                  class="mt-3 overflow-hidden rounded-xl border border-zinc-200/70 bg-white/40 dark:border-zinc-800/60 dark:bg-zinc-950/10"
                  open={resultOpen}
                  onToggle={(e: Event) =>
                    setResultOpen((e.currentTarget as HTMLDetailsElement).open)
                  }
                >
                  <summary class="flex cursor-pointer list-none items-baseline justify-between gap-3 select-none px-3 py-2 [&::-webkit-details-marker]:hidden">
                    <div class="flex flex-wrap items-baseline gap-2">
                      <span class="text-sm font-bold text-zinc-800 dark:text-zinc-100">
                        結果（Result）
                      </span>
                      {resultA && resultB ? (
                        diff ? (
                          diffHasChanges(diff) ? (
                            <span class="rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[11px] font-extrabold text-amber-700 dark:text-amber-200">
                              差分あり
                            </span>
                          ) : (
                            <span class="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-200">
                              差分なし
                            </span>
                          )
                        ) : (
                          <span class="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-200">
                            Diff未取得
                          </span>
                        )
                      ) : (
                        <span class="rounded-full border border-zinc-400/30 bg-zinc-400/10 px-2 py-0.5 text-[11px] font-extrabold text-zinc-600 dark:text-zinc-300">
                          片側のみ
                        </span>
                      )}
                    </div>
                    <span class="text-xs text-zinc-500 dark:text-zinc-400">
                      （クリックで開閉）
                    </span>
                  </summary>

                  <div class="border-t border-zinc-200/60 px-3 pb-3 dark:border-zinc-800/60">
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

                      <div
                        class="relative mt-3"
                        style={
                          resultMinHeight > 0
                            ? `min-height:${resultMinHeight}px`
                            : undefined
                        }
                      >
                        <section
                          ref={resultDiffRef}
                          class={tabPanelClass(resultTab === "diff")}
                        >
                          <DiffView
                            diff={diff}
                            hasBothResults={Boolean(resultA && resultB)}
                          />
                        </section>
                        <section
                          ref={resultARef}
                          class={tabPanelClass(resultTab === "a")}
                        >
                          <QueryResultTable
                            result={resultA}
                            error={errorA}
                            emptyMessage="Query Aは未実行/空です。"
                          />
                        </section>
                        <section
                          ref={resultBRef}
                          class={tabPanelClass(resultTab === "b")}
                        >
                          <QueryResultTable
                            result={resultB}
                            error={errorB}
                            emptyMessage="Query Bは未実行/空です。"
                          />
                        </section>
                      </div>
                    </div>
                  </div>
                </details>
              ) : null}

              <section
                id="execution-plan"
                class={[
                  hasAnyQueryResultOrError ? "mt-5" : "mt-3",
                  "rounded-xl border border-zinc-200/70 bg-white/40 p-3 dark:border-zinc-800/60 dark:bg-zinc-950/10",
                ].join(" ")}
              >
                <div class="flex items-baseline justify-between gap-3">
                  <div>
                    <h3 class="m-0 text-sm font-bold text-zinc-700 dark:text-zinc-200">
                      実行計画（Execution Plan）
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
                      onClick={() => {
                        setPlanTab("a");
                        scrollExecutionPlanToTop();
                      }}
                    >
                      Plan A
                    </button>
                    <button
                      type="button"
                      class={tabClass(planTab === "b")}
                      onClick={() => {
                        setPlanTab("b");
                        scrollExecutionPlanToTop();
                      }}
                    >
                      Plan B
                    </button>
                  </div>

                  <div
                    class="relative mt-3"
                    style={
                      planMinHeight > 0
                        ? `min-height:${planMinHeight}px`
                        : undefined
                    }
                  >
                    <section
                      ref={planARef}
                      class={tabPanelClass(planTab === "a")}
                    >
                      <PlanResult
                        result={planResultA}
                        error={
                          planErrorA ?? "Query Aの実行計画は未実行/空です。"
                        }
                      />
                    </section>
                    <section
                      ref={planBRef}
                      class={tabPanelClass(planTab === "b")}
                    >
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
            <div class="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              まだ結果はありません。上のフォームから実行してください。
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
