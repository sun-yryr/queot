import type { FC } from "hono/jsx";
import type { DiffSheet } from "../../services/diff.js";

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

function splitArrowCell(
  text: string,
): { before: string; after: string } | null {
  const idx = text.indexOf("->");
  if (idx <= 0) return null;
  return { before: text.slice(0, idx), after: text.slice(idx + 2) };
}

function isDaffHeaderRow(row: unknown[] | undefined): boolean {
  return cellText(row?.[0]) === "@@";
}

function isDaffMetaRow(row: unknown[] | undefined): boolean {
  return cellText(row?.[0]) === "!";
}

function isDaffOmittedRow(row: unknown[] | undefined): boolean {
  return cellText(row?.[0]) === "...";
}

function classifyMetaCell(text: string): string {
  // daff のメタ行（例: "!" 行）は列の増減や名称変更を表すことがある
  if (text === "+++") return "!bg-emerald-500/20";
  if (text === "---") return "!bg-red-500/20";
  if (text === "->" || text.includes("->")) return "bg-amber-400/20";
  if (text.startsWith("(") && text.endsWith(")")) return "bg-amber-400/20";
  return "";
}

type Props = {
  diff?: DiffSheet;
  hasBothResults: boolean;
  emptyMessage?: string;
};

export const DiffView: FC<Props> = ({ diff, hasBothResults, emptyMessage }) => {
  if (!hasBothResults) {
    return (
      <div class="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        {emptyMessage ?? "Diffには Query A と Query B 両方の結果が必要です。"}
      </div>
    );
  }

  const diffRows = diff ?? [];

  // row差分だけでなく、カラム差分（"!" 行）も「差分あり」と扱う
  const diffHasChanges = diffRows.some((row) => {
    const marker = cellText(row?.[0]);
    return (
      marker === "!" || marker === "+++" || marker === "---" || marker === "->"
    );
  });

  if (!diffHasChanges) {
    return (
      <div class="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        完全に一致（差分なし）
      </div>
    );
  }

  const headerRowIndex = diffRows.findIndex((r) => isDaffHeaderRow(r));
  const hasDiffHeader = headerRowIndex >= 0;
  const theadRows = hasDiffHeader ? diffRows.slice(0, headerRowIndex + 1) : [];
  const tbodyRows = hasDiffHeader
    ? diffRows.slice(headerRowIndex + 1)
    : diffRows;

  // "!" 行（メタ行）から、列ごとの変更種別を推定する。
  // NOTE: 削除（---）が最優先。行の背景色（追加/削除/変更）よりも優先して表示する。
  const colClassByIndex: string[] = [];
  for (const row of theadRows) {
    if (!isDaffMetaRow(row)) continue;
    for (let i = 1; i < row.length; i++) {
      const klass = classifyMetaCell(cellText(row[i]));
      if (!klass) continue;
      // 列名変更などの "changed" はヘッダで示せれば十分なので、tbody 側には反映しない
      if (klass === "diffColChanged") continue;
      if (klass === "diffColRemoved") {
        colClassByIndex[i] = "diffColRemoved";
        continue;
      }
      // すでに削除扱いなら上書きしない
      if (colClassByIndex[i] === "diffColRemoved") continue;
      // 未設定なら設定（added）
      if (!colClassByIndex[i]) colClassByIndex[i] = klass;
    }
  }

  return (
    <div class="mt-3 max-h-[540px] overflow-auto rounded-xl border border-zinc-200/60 bg-white/60 dark:border-zinc-800/60 dark:bg-zinc-950/20">
      <details class="mb-3 overflow-hidden rounded-xl border border-zinc-200/60 bg-zinc-50/70 dark:border-zinc-800/60 dark:bg-zinc-900/20">
        <summary class="flex cursor-pointer list-none items-baseline justify-between gap-3 select-none px-3 py-2 [&::-webkit-details-marker]:hidden">
          <span class="text-sm font-bold text-zinc-800 dark:text-zinc-100">
            Diffの見方
          </span>
          <span class="text-xs text-zinc-500 dark:text-zinc-400">
            （クリックで開閉）
          </span>
        </summary>
        <div class="border-t border-zinc-200/50 px-3 pb-3 dark:border-zinc-800/50">
          <div class="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
            <div class="flex items-start gap-2">
              <span class="mt-0.5 h-3.5 w-3.5 rounded border border-zinc-300/60 bg-emerald-500/20 dark:border-zinc-700/60" />
              <span class="text-sm text-zinc-700 dark:text-zinc-200">
                <b>追加</b>（行: <code>+++</code>）
              </span>
            </div>
            <div class="flex items-start gap-2">
              <span class="mt-0.5 h-3.5 w-3.5 rounded border border-zinc-300/60 bg-red-500/20 dark:border-zinc-700/60" />
              <span class="text-sm text-zinc-700 dark:text-zinc-200">
                <b>削除</b>（行: <code>---</code>）
              </span>
            </div>
            <div class="flex items-start gap-2">
              <span class="mt-0.5 h-3.5 w-3.5 rounded border border-zinc-300/60 bg-amber-400/20 dark:border-zinc-700/60" />
              <span class="text-sm text-zinc-700 dark:text-zinc-200">
                <b>変更</b>（行: <code>-&gt;</code> / セル内:{" "}
                <code>a-&gt;b</code>）
              </span>
            </div>
            <div class="flex items-start gap-2">
              <span class="mt-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded border border-zinc-300/60 bg-zinc-200/60 text-[11px] font-black text-zinc-700 dark:border-zinc-700/60 dark:bg-zinc-800/60 dark:text-zinc-200">
                !
              </span>
              <span class="text-sm text-zinc-700 dark:text-zinc-200">
                <b>カラム変更</b>（ヘッダ上部の <code>!</code> 行）
                <span class="ml-1 text-zinc-500 dark:text-zinc-400">
                  追加/削除/名称変更はヘッダ色で表現
                </span>
              </span>
            </div>
            <div class="flex items-start gap-2">
              <span class="mt-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded border border-zinc-300/60 bg-zinc-200/60 text-[11px] font-black text-zinc-700 dark:border-zinc-700/60 dark:bg-zinc-800/60 dark:text-zinc-200">
                …
              </span>
              <span class="text-sm text-zinc-700 dark:text-zinc-200">
                <b>省略</b>（間の行が省略されていることがあります）
              </span>
            </div>
            <div class="flex items-start gap-2">
              <span class="text-sm text-zinc-700 dark:text-zinc-200">
                <b>優先順位</b>:
                カラム削除（赤）は行追加（緑）より優先して表示します。
              </span>
            </div>
          </div>
        </div>
      </details>
      <table class="w-full border-collapse text-sm">
        <thead>
          {theadRows.map((row, rowIndex) => {
            // stickyヘッダが複数行あると重なりやすいので、行インデックス分だけ top をずらす
            const topPx = rowIndex * 32;

            return (
              <tr>
                {row.map((cell, i) => {
                  const text = cellText(cell);
                  const isMeta = isDaffMetaRow(row);
                  const isHeader = isDaffHeaderRow(row);
                  const metaBg = isMeta
                    ? "bg-zinc-200/40 dark:bg-zinc-800/40"
                    : "";
                  const headerBg = isHeader
                    ? "bg-zinc-100/70 dark:bg-zinc-900/60"
                    : "bg-zinc-100/40 dark:bg-zinc-900/40";
                  const base = [
                    "sticky",
                    "text-left",
                    "backdrop-blur",
                    "border-b",
                    "border-zinc-200/70",
                    "dark:border-zinc-800/60",
                    "px-2.5",
                    "py-2",
                    "font-bold",
                    isMeta ? metaBg : headerBg,
                    isMeta ? "text-zinc-700 dark:text-zinc-200" : "",
                    isHeader ? "font-extrabold" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  const cellBg = isMeta && i > 0 ? classifyMetaCell(text) : "";
                  return (
                    <th
                      class={[
                        base,
                        i === 0
                          ? "w-[52px] text-center font-bold text-zinc-600 dark:text-zinc-300"
                          : "",
                        cellBg,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={`top:${topPx}px`}
                    >
                      {text}
                    </th>
                  );
                })}
              </tr>
            );
          })}
        </thead>
        <tbody>
          {tbodyRows.map((row) => {
            const marker = cellText(row?.[0]);
            const rowClass =
              marker === "+++"
                ? "[&>td]:bg-emerald-500/10"
                : marker === "---"
                  ? "[&>td]:bg-red-500/10"
                  : marker === "->"
                    ? "[&>td]:bg-amber-400/10"
                    : isDaffOmittedRow(row)
                      ? "text-center italic [&>td]:text-zinc-500 dark:[&>td]:text-zinc-400"
                      : "";

            return (
              <tr class={rowClass}>
                {row.map((cell, i) => {
                  const text = cellText(cell);
                  const arrow =
                    marker === "->" && i > 0 ? splitArrowCell(text) : null;
                  const colClass = i > 0 ? colClassByIndex[i] : "";
                  return (
                    <td
                      class={[
                        "border-b border-zinc-200/70 px-2.5 py-2 align-top dark:border-zinc-800/60",
                        i === 0
                          ? "w-[52px] text-center font-bold text-zinc-600 dark:text-zinc-300"
                          : "font-mono text-[12.5px]",
                        colClass,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {arrow ? (
                        <span class="inline-flex flex-wrap items-baseline gap-1.5">
                          <span class="text-zinc-500 line-through dark:text-zinc-400">
                            {arrow.before}
                          </span>
                          <span class="text-zinc-500/80 dark:text-zinc-400/80">
                            →
                          </span>
                          <span class="font-bold">{arrow.after}</span>
                        </span>
                      ) : (
                        text
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
