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
  if (text === "+++") return "diffColAdded";
  if (text === "---") return "diffColRemoved";
  if (text === "->" || text.includes("->")) return "diffColChanged";
  if (text.startsWith("(") && text.endsWith(")")) return "diffColChanged";
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
      <div class="meta">
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
    return <div class="meta">完全に一致（差分なし）</div>;
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
    <div class="result">
      <details class="disclosure diffLegend" open={false}>
        <summary class="disclosureSummary">
          <span class="disclosureTitle">Diffの見方</span>
          <span class="disclosureHint">（クリックで開閉）</span>
        </summary>
        <div class="disclosureBody diffLegendBody">
          <div class="diffLegendGrid">
            <div class="diffLegendItem">
              <span
                class="diffLegendSwatch"
                style="background: rgba(34, 197, 94, 0.18)"
              />
              <span class="diffLegendText">
                <b>追加</b>（行: <code>+++</code>）
              </span>
            </div>
            <div class="diffLegendItem">
              <span
                class="diffLegendSwatch"
                style="background: rgba(239, 68, 68, 0.18)"
              />
              <span class="diffLegendText">
                <b>削除</b>（行: <code>---</code>）
              </span>
            </div>
            <div class="diffLegendItem">
              <span
                class="diffLegendSwatch"
                style="background: rgba(234, 179, 8, 0.14)"
              />
              <span class="diffLegendText">
                <b>変更</b>（行: <code>-&gt;</code> / セル内:{" "}
                <code>a-&gt;b</code>）
              </span>
            </div>
            <div class="diffLegendItem">
              <span class="diffLegendSwatch diffLegendSwatchMeta">!</span>
              <span class="diffLegendText">
                <b>カラム変更</b>（ヘッダ上部の <code>!</code> 行）
                <span class="diffLegendNote">
                  追加/削除/名称変更はヘッダ色で表現
                </span>
              </span>
            </div>
            <div class="diffLegendItem">
              <span class="diffLegendSwatch diffLegendSwatchMeta">…</span>
              <span class="diffLegendText">
                <b>省略</b>（間の行が省略されていることがあります）
              </span>
            </div>
            <div class="diffLegendItem">
              <span class="diffLegendText">
                <b>優先順位</b>:
                カラム削除（赤）は行追加（緑）より優先して表示します。
              </span>
            </div>
          </div>
        </div>
      </details>
      <table class="diffTable">
        <thead>
          {theadRows.map((row, rowIndex) => {
            const rowClass = isDaffMetaRow(row)
              ? "diffHeadMetaRow"
              : isDaffHeaderRow(row)
                ? "diffHeadHeaderRow"
                : "diffHeadOtherRow";

            // stickyヘッダが複数行あると重なりやすいので、行インデックス分だけ top をずらす
            const topPx = rowIndex * 32;

            return (
              <tr class={rowClass}>
                {row.map((cell, i) => {
                  const text = cellText(cell);
                  const cellClass =
                    isDaffMetaRow(row) && i > 0 ? classifyMetaCell(text) : "";
                  return (
                    <th
                      class={[i === 0 ? "diffMarker" : "", cellClass]
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
                ? "diffRowAdded"
                : marker === "---"
                  ? "diffRowRemoved"
                  : marker === "->"
                    ? "diffRowChanged"
                    : isDaffOmittedRow(row)
                      ? "diffRowOmitted"
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
                      class={[i === 0 ? "diffMarker" : "", colClass]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {arrow ? (
                        <span class="diffCell">
                          <span class="diffCellOld">{arrow.before}</span>
                          <span class="diffCellArrow">→</span>
                          <span class="diffCellNew">{arrow.after}</span>
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
