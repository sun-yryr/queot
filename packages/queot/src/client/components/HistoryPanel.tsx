import type { FC } from "hono/jsx";
import type { HistorySummary } from "../../routes/types.js";

function fmtLocal(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  // 秒は省略してコンパクトに
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function firstLine(s: string, max = 120): string {
  const line = (s ?? "").split(/\r?\n/, 1)[0] ?? "";
  const trimmed = line.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, Math.max(0, max - 1))}…`;
}

export const HistoryPanel: FC<{
  open: boolean;
  loading: boolean;
  error?: string;
  items: HistorySummary[];
  onClose: () => void;
  onReload: () => void;
  onSelect: (id: string) => void;
}> = ({ open, loading, error, items, onClose, onReload, onSelect }) => {
  if (!open) return null;

  return (
    <div class="fixed inset-0 z-50">
      {/* backdrop */}
      <div
        class="absolute inset-0 bg-zinc-950/20 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* drawer */}
      <aside class="absolute right-0 top-0 h-full w-[380px] max-w-[92vw] border-l border-zinc-200/60 bg-white/90 shadow-xl backdrop-blur dark:border-zinc-800/60 dark:bg-zinc-950/70">
        <div class="flex items-center justify-between gap-2 border-b border-zinc-200/60 px-4 py-3 dark:border-zinc-800/60">
          <div>
            <div class="text-sm font-extrabold text-zinc-800 dark:text-zinc-100">
              履歴
            </div>
            <div class="text-[11px] text-zinc-500 dark:text-zinc-400">
              直近の実行結果を復元できます
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="rounded-lg border border-zinc-300/70 bg-white px-2 py-1 text-[11px] font-bold text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100 dark:border-zinc-700/70 dark:bg-zinc-900/40 dark:text-zinc-200 dark:hover:bg-zinc-800/50"
              onClick={onReload}
              disabled={loading}
            >
              {loading ? "更新中…" : "更新"}
            </button>
            <button
              type="button"
              class="rounded-lg border border-zinc-300/70 bg-white px-2 py-1 text-[11px] font-bold text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100 dark:border-zinc-700/70 dark:bg-zinc-900/40 dark:text-zinc-200 dark:hover:bg-zinc-800/50"
              onClick={onClose}
            >
              閉じる
            </button>
          </div>
        </div>

        <div class="h-[calc(100%-56px)] overflow-auto px-4 py-3">
          {error ? (
            <div class="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-800 dark:text-rose-200">
              {error}
            </div>
          ) : null}

          {!loading && items.length === 0 ? (
            <div class="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              まだ履歴がありません。
            </div>
          ) : null}

          <div class="mt-3 grid gap-2">
            {items.map((h) => (
              <button
                type="button"
                class={[
                  "w-full text-left rounded-xl border px-3 py-2 shadow-sm",
                  "border-zinc-200/70 bg-white/60 hover:bg-zinc-50 active:bg-zinc-100",
                  "dark:border-zinc-800/60 dark:bg-zinc-950/20 dark:hover:bg-zinc-900/30 dark:active:bg-zinc-900/50",
                ].join(" ")}
                onClick={() => onSelect(h.id)}
              >
                <div class="flex items-baseline justify-between gap-2">
                  <div class="text-xs font-extrabold text-zinc-800 dark:text-zinc-100">
                    {fmtLocal(h.timestamp)}
                  </div>
                  <div class="flex items-center gap-1">
                    {h.hasError ? (
                      <span class="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-extrabold text-rose-700 dark:text-rose-200">
                        error
                      </span>
                    ) : null}
                    {h.hasDiffChanges === false ? (
                      <span class="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-200">
                        same
                      </span>
                    ) : (
                      <span class="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-extrabold text-amber-700 dark:text-amber-200">
                        diff
                      </span>
                    )}
                    <span class="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700 dark:text-indigo-200">
                      {h.planMode === "analyze" ? "ANALYZE" : "EXPLAIN"}
                    </span>
                  </div>
                </div>
                <div class="mt-1 text-[11px] text-zinc-600 dark:text-zinc-300">
                  <div class="font-mono">A: {firstLine(h.queryA)}</div>
                  <div class="font-mono">B: {firstLine(h.queryB)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
};
