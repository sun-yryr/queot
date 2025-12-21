import { useEffect, useMemo, useRef, useState } from "hono/jsx/dom";
import type { FC } from "hono/jsx";
import type { ExplainParseResult } from "@sun-yryr/queot-planparser";
import type { PlanNode, PlanTree } from "@sun-yryr/queot-planparser";

type Props = {
  result?: ExplainParseResult;
  error?: string;
};

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function fmtNum(v: number, digits = 3): string {
  if (!Number.isFinite(v)) return "";
  const s = v.toFixed(digits);
  return s.replace(/\.?0+$/, "");
}

function pickStr(
  node: Record<string, unknown>,
  key: string,
): string | undefined {
  const v = node[key];
  return isString(v) && v.trim().length > 0 ? v : undefined;
}

function pickNum(
  node: Record<string, unknown>,
  key: string,
): number | undefined {
  const v = node[key];
  return isNumber(v) ? v : undefined;
}

function nodeTitle(node: PlanNode): string {
  return node.nodeType ?? "Unknown";
}

type KV = { k: string; v: string };

type NodeCategory =
  | "scan"
  | "join"
  | "limit"
  | "sort"
  | "unique"
  | "aggregate"
  | "cte"
  | "other";

function nodeCategory(node: PlanNode): NodeCategory {
  const t = (node.nodeType ?? "").toLowerCase();
  if (t.includes("limit")) return "limit";
  if (t.includes("unique")) return "unique";
  if (t.includes("sort")) return "sort";
  if (t.includes("aggregate") || t.includes("group")) return "aggregate";
  if (t.includes("join")) return "join";
  if (t.includes("scan") || t.includes("seek")) return "scan";
  if (t.includes("cte") || t.includes("subquery") || t.includes("initplan"))
    return "cte";
  return "other";
}

const templateForCategory: Record<
  NodeCategory,
  { leftKeys: string[]; rightKeys: string[] }
> = {
  scan: {
    leftKeys: ["rel", "idx", "as", "dir"],
    rightKeys: ["rows", "cost", "actual", "loops"],
  },
  join: {
    leftKeys: ["join", "rel", "as"],
    rightKeys: ["rows", "cost", "actual", "loops"],
  },
  limit: { leftKeys: [], rightKeys: ["rows", "cost", "actual", "loops"] },
  sort: { leftKeys: [], rightKeys: ["rows", "cost", "actual", "loops"] },
  unique: { leftKeys: [], rightKeys: ["rows", "cost", "actual", "loops"] },
  aggregate: { leftKeys: [], rightKeys: ["rows", "cost", "actual", "loops"] },
  cte: {
    leftKeys: ["cte", "subplan", "rel", "as"],
    rightKeys: ["rows", "cost", "actual", "loops"],
  },
  other: {
    leftKeys: ["rel", "idx", "as", "join", "dir"],
    rightKeys: ["rows", "cost", "actual", "loops"],
  },
};

function nodeIdentityPairs(node: PlanNode): KV[] {
  const raw = node.raw as unknown as Record<string, unknown>;
  const relation = pickStr(raw, "Relation Name");
  const index = pickStr(raw, "Index Name");
  const alias = pickStr(raw, "Alias");
  const joinType = pickStr(raw, "Join Type");
  const scanDir = pickStr(raw, "Scan Direction");
  const cteName = pickStr(raw, "CTE Name");
  const subplanName = pickStr(raw, "Subplan Name");

  const out: KV[] = [];
  if (cteName) out.push({ k: "cte", v: cteName });
  if (subplanName) out.push({ k: "subplan", v: subplanName });
  if (relation) out.push({ k: "rel", v: relation });
  if (index) out.push({ k: "idx", v: index });
  if (alias && alias !== relation) out.push({ k: "as", v: alias });
  if (joinType) out.push({ k: "join", v: joinType });
  if (scanDir) out.push({ k: "dir", v: scanDir });
  return out;
}

function nodeConditions(
  node: PlanNode,
): Array<{ label: string; value: string }> {
  const raw = node.raw as unknown as Record<string, unknown>;
  const keys: Array<[string, string]> = [
    ["Index Cond", "Index Cond"],
    ["Filter", "Filter"],
    ["Join Filter", "Join Filter"],
    ["Hash Cond", "Hash Cond"],
    ["Merge Cond", "Merge Cond"],
    ["Recheck Cond", "Recheck Cond"],
    ["Sort Key", "Sort Key"],
    ["Group Key", "Group Key"],
  ];

  const out: Array<{ label: string; value: string }> = [];
  for (const [label, key] of keys) {
    const v = raw[key];
    if (isString(v) && v.trim().length) out.push({ label, value: v });
    if (Array.isArray(v) && v.every(isString) && v.length)
      out.push({ label, value: v.join(", ") });
  }
  return out;
}

function nodePlainTextLine(node: PlanNode): string {
  const raw = node.raw as unknown as Record<string, unknown>;
  const title = nodeTitle(node);

  const startupCost = pickNum(raw, "Startup Cost");
  const totalCost = pickNum(raw, "Total Cost");
  const planRows = pickNum(raw, "Plan Rows");

  const actualStart = pickNum(raw, "Actual Startup Time");
  const actualTotal = pickNum(raw, "Actual Total Time");
  const actualRows = pickNum(raw, "Actual Rows");
  const loops = pickNum(raw, "Actual Loops");

  const relation = pickStr(raw, "Relation Name");
  const index = pickStr(raw, "Index Name");
  const alias = pickStr(raw, "Alias");
  const joinType = pickStr(raw, "Join Type");
  const scanDir = pickStr(raw, "Scan Direction");

  const parts: string[] = [];
  if (
    startupCost !== undefined ||
    totalCost !== undefined ||
    planRows !== undefined
  ) {
    parts.push(
      `cost=${startupCost !== undefined ? fmtNum(startupCost, 2) : "?"}..${
        totalCost !== undefined ? fmtNum(totalCost, 2) : "?"
      }`,
    );
    parts.push(`rows=${planRows !== undefined ? fmtNum(planRows, 0) : "?"}`);
  }

  if (
    actualStart !== undefined ||
    actualTotal !== undefined ||
    actualRows !== undefined ||
    loops !== undefined
  ) {
    parts.push(
      `actual time=${
        actualStart !== undefined ? fmtNum(actualStart) : "?"
      }..${actualTotal !== undefined ? fmtNum(actualTotal) : "?"}`,
    );
    parts.push(
      `actual rows=${actualRows !== undefined ? fmtNum(actualRows, 0) : "?"}`,
    );
    parts.push(`loops=${loops !== undefined ? fmtNum(loops, 0) : "?"}`);
  }

  if (joinType) parts.push(`join=${joinType}`);
  if (relation) parts.push(`rel=${relation}`);
  if (index) parts.push(`idx=${index}`);
  if (alias && alias !== relation) parts.push(`as=${alias}`);
  if (scanDir) parts.push(`dir=${scanDir}`);

  return parts.length ? `${title}  (${parts.join(" ")})` : title;
}

function renderPlanPlainText(root: PlanNode): string {
  const lines: string[] = [];
  const walk = (node: PlanNode) => {
    const prefix =
      node.depth === 0 ? "" : `${"  ".repeat(Math.max(0, node.depth - 1))}-> `;
    lines.push(`${prefix}${nodePlainTextLine(node)}`);

    // 追加情報（Filter等）は Postgres の EXPLAIN テキスト出力風に次行へ
    const conds = nodeConditions(node);
    for (const c of conds) {
      lines.push(`${"  ".repeat(node.depth)}   ${c.label}: ${c.value}`);
    }

    for (const child of node.children) walk(child);
  };
  walk(root);
  return lines.join("\n");
}

function scrollExecutionPlanToTop(): void {
  const el = document.getElementById("execution-plan");
  if (!el) return;
  requestAnimationFrame(() => {
    el.scrollIntoView({ block: "start", behavior: "smooth" });
  });
}

type GraphNode = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  left: KV[];
  right: KV[];
  rawTitle: string;
  kind: "scan" | "join" | "sort" | "aggregate" | "cte" | "other";
};

type GraphEdge = {
  fromId: string;
  toId: string;
};

function nodeKind(node: PlanNode): GraphNode["kind"] {
  const t = (node.nodeType ?? "").toLowerCase();
  if (t.includes("join")) return "join";
  if (t.includes("scan") || t.includes("seek")) return "scan";
  if (t.includes("sort")) return "sort";
  if (t.includes("aggregate") || t.includes("group")) return "aggregate";
  if (t.includes("cte") || t.includes("subquery") || t.includes("initplan"))
    return "cte";
  return "other";
}

function nodeMetricPairs(node: PlanNode): KV[] {
  const raw = node.raw as unknown as Record<string, unknown>;
  const startupCost = pickNum(raw, "Startup Cost");
  const totalCost = pickNum(raw, "Total Cost");
  const planRows = pickNum(raw, "Plan Rows");

  const actualStart = pickNum(raw, "Actual Startup Time");
  const actualTotal = pickNum(raw, "Actual Total Time");
  const actualRows = pickNum(raw, "Actual Rows");
  const loops = pickNum(raw, "Actual Loops");

  if (startupCost !== undefined || totalCost !== undefined) {
    // ok
  }
  if (actualStart !== undefined || actualTotal !== undefined) {
    // ok
  }
  const out: KV[] = [];
  if (startupCost !== undefined || totalCost !== undefined) {
    out.push({
      k: "cost",
      v: `${startupCost !== undefined ? fmtNum(startupCost, 2) : "?"}..${
        totalCost !== undefined ? fmtNum(totalCost, 2) : "?"
      }`,
    });
  }
  if (planRows !== undefined || actualRows !== undefined) {
    const plan = planRows !== undefined ? fmtNum(planRows, 0) : "?";
    const actual =
      actualRows !== undefined ? ` (actual ${fmtNum(actualRows, 0)})` : "";
    out.push({ k: "rows", v: `${plan}${actual}` });
  }
  if (actualStart !== undefined || actualTotal !== undefined) {
    out.push({
      k: "actual",
      v: `${actualStart !== undefined ? fmtNum(actualStart) : "?"}..${
        actualTotal !== undefined ? fmtNum(actualTotal) : "?"
      }ms`,
    });
  }
  if (loops !== undefined) out.push({ k: "loops", v: fmtNum(loops, 0) });
  return out;
}

type NodeViewModel = {
  title: string;
  left: KV[];
  right: KV[];
  rawTitle: string;
  kind: GraphNode["kind"];
  category: NodeCategory;
};

function toMap(pairs: KV[]): Map<string, KV> {
  const m = new Map<string, KV>();
  for (const p of pairs) m.set(p.k, p);
  return m;
}

function pickByKeys(pairs: KV[], keys: string[]): KV[] {
  const m = toMap(pairs);
  const out: KV[] = [];
  for (const k of keys) {
    const v = m.get(k);
    if (v) out.push(v);
  }
  return out;
}

function buildNodeViewModel(node: PlanNode): NodeViewModel {
  const title = nodeTitle(node);
  const cat = nodeCategory(node);
  const tpl = templateForCategory[cat];

  const allLeft = nodeIdentityPairs(node);
  const allRight = nodeMetricPairs(node);
  const left = pickByKeys(allLeft, tpl.leftKeys);
  const right = pickByKeys(allRight, tpl.rightKeys);

  const rawTitle = [
    title,
    ...left.map((p) => `${p.k}: ${p.v}`),
    ...right.map((p) => `${p.k}: ${p.v}`),
  ].join(" — ");

  return {
    title,
    left,
    right,
    rawTitle,
    kind: nodeKind(node),
    category: cat,
  };
}

function buildNodeMap(root: PlanNode): Map<string, PlanNode> {
  const m = new Map<string, PlanNode>();
  const walk = (n: PlanNode) => {
    m.set(n.id, n);
    for (const c of n.children) walk(c);
  };
  walk(root);
  return m;
}

function pickRowsForViz(node: PlanNode): number | undefined {
  const raw = node.raw as unknown as Record<string, unknown>;
  const actualRows = pickNum(raw, "Actual Rows");
  const planRows = pickNum(raw, "Plan Rows");
  return actualRows ?? planRows;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function edgeStrokeWidth(rows: number | undefined, maxRows: number): number {
  const MIN_W = 1.5;
  const MAX_W = 7.5;
  if (!rows || rows <= 0 || !Number.isFinite(rows) || maxRows <= 0)
    return MIN_W;
  // ログスケール: rows の桁差が大きくても視認性を保つ
  const t = Math.log10(rows + 1) / Math.log10(maxRows + 1);
  return clamp(MIN_W + t * (MAX_W - MIN_W), MIN_W, MAX_W);
}

function estimateNodeWidthPx(title: string, left: KV[], right: KV[]): number {
  // DOM計測なしの概算（フォントサイズ10〜12px前提）
  // NOTE: 右カラムは monospace で数字が長くなりがちなので少し強めに見積もる
  const charPx = 7.8;
  const pad = 12 * 2 + 6 + 18; // px-3 + left bar + 余裕（やや多め）
  const colGap = 12; // gap-x-3
  const leftMax =
    left.length > 0 ? Math.max(...left.map((p) => `${p.k} ${p.v}`.length)) : 0;
  const rightMax =
    right.length > 0
      ? Math.max(...right.map((p) => `${p.k} ${p.v}`.length))
      : 0;
  const titleW = title.length * (charPx + 0.6);
  // 2カラムは右側が長くなりやすいので右を少し重めに扱う
  const colsW = leftMax * charPx + colGap + rightMax * (charPx * 1.15);
  return clamp(Math.ceil(pad + Math.max(titleW, colsW)), 320, 1200);
}

function layoutPlanTree(root: PlanNode) {
  // 可変幅ツリー・レイアウト（ピクセルベース）:
  // - subtreeWidthPx = max(selfWidthPx, sum(childSubtreeWidthPx)+gaps)
  // - 親は自分のsubtreeの中央に置く
  const NODE_H = 132;
  const GAP_X = 32;
  const GAP_Y = 30;
  const PAD_X = 16;
  const PAD_Y = 16;

  const widthCache = new Map<string, number>(); // subtree width px
  const nodeWCache = new Map<string, number>(); // node width px
  const vmCache = new Map<string, NodeViewModel>();
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const depthToY = (depth: number) => PAD_Y + depth * (NODE_H + GAP_Y);

  const nodeWidthPx = (n: PlanNode): number => {
    const cached = nodeWCache.get(n.id);
    if (cached !== undefined) return cached;
    const vm = vmCache.get(n.id) ?? buildNodeViewModel(n);
    vmCache.set(n.id, vm);
    const w = estimateNodeWidthPx(vm.title, vm.left, vm.right);
    nodeWCache.set(n.id, w);
    return w;
  };

  const subtreeWidthPx = (n: PlanNode): number => {
    const cached = widthCache.get(n.id);
    if (cached !== undefined) return cached;
    const selfW = nodeWidthPx(n);
    const childWs = n.children.map((c) => subtreeWidthPx(c));
    const childrenTotal =
      childWs.length === 0
        ? 0
        : childWs.reduce((a, b) => a + b, 0) + GAP_X * (childWs.length - 1);
    const w = Math.max(selfW, childrenTotal);
    widthCache.set(n.id, w);
    return w;
  };

  const visit = (n: PlanNode, leftPx: number) => {
    const subW = subtreeWidthPx(n);
    const selfW = nodeWidthPx(n);
    const x = leftPx + (subW - selfW) / 2;
    const y = depthToY(n.depth);

    const vm = vmCache.get(n.id) ?? buildNodeViewModel(n);
    vmCache.set(n.id, vm);

    nodes.push({
      id: n.id,
      x,
      y,
      w: selfW,
      h: NODE_H,
      title: vm.title,
      left: vm.left,
      right: vm.right,
      rawTitle: vm.rawTitle,
      kind: vm.kind,
    });

    let cursor = leftPx;
    for (const c of n.children) {
      edges.push({ fromId: n.id, toId: c.id });
      const cw = subtreeWidthPx(c);
      visit(c, cursor);
      cursor += cw + GAP_X;
    }
  };

  visit(root, PAD_X);

  const maxDepth = nodes.reduce(
    (m, n) => Math.max(m, Math.round((n.y - PAD_Y) / (NODE_H + GAP_Y))),
    0,
  );

  const width = PAD_X + subtreeWidthPx(root) + PAD_X;
  const height = PAD_Y * 2 + (maxDepth + 1) * (NODE_H + GAP_Y) - GAP_Y;

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  return {
    nodes,
    edges,
    nodeById,
    width,
    height,
    constants: { NODE_H, GAP_X, GAP_Y, PAD_X, PAD_Y },
  };
}

const PlanGraph: FC<{ root: PlanNode }> = ({ root }) => {
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const byId = useMemo(() => buildNodeMap(root), [root]);
  const selected = selectedId ? byId.get(selectedId) : undefined;

  const g = useMemo(() => layoutPlanTree(root), [root]);
  const maxRows = useMemo(() => {
    let m = 0;
    for (const n of byId.values()) {
      const r = pickRowsForViz(n);
      if (r !== undefined && Number.isFinite(r)) m = Math.max(m, r);
    }
    return m;
  }, [byId]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr =
      typeof window !== "undefined" ? (window.devicePixelRatio ?? 1) : 1;
    const w = Math.max(1, Math.ceil(g.width));
    const h = Math.max(1, Math.ceil(g.height));

    canvas.width = Math.ceil(w * dpr);
    canvas.height = Math.ceil(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(113,113,122,0.35)"; // zinc-500/35

    for (const e of g.edges) {
      const from = g.nodeById.get(e.fromId);
      const to = g.nodeById.get(e.toId);
      if (!from || !to) continue;

      const x1 = from.x + from.w / 2;
      const y1 = from.y + from.h;
      const x2 = to.x + to.w / 2;
      const y2 = to.y;
      const midY = (y1 + y2) / 2;

      const toPlan = byId.get(e.toId);
      const rows = toPlan ? pickRowsForViz(toPlan) : undefined;
      const lw = edgeStrokeWidth(rows, maxRows);

      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1, midY);
      ctx.lineTo(x2, midY);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }, [byId, g, maxRows]);

  const kindAccent = (k: GraphNode["kind"]) => {
    switch (k) {
      case "join":
        return "bg-violet-500/70";
      case "scan":
        return "bg-sky-500/70";
      case "sort":
        return "bg-amber-500/70";
      case "aggregate":
        return "bg-emerald-500/70";
      case "cte":
        return "bg-indigo-500/70";
      default:
        return "bg-zinc-500/60";
    }
  };

  return (
    <div class="mx-3 overflow-hidden rounded-xl border border-zinc-200/60 bg-white/50 dark:border-zinc-800/60 dark:bg-zinc-950/20">
      <div class="overflow-auto">
        <div
          class="relative"
          style={`width:${g.width}px;height:${Math.max(240, g.height)}px`}
          role="img"
          aria-label="Execution plan graph"
        >
          {/* grid background */}
          <div
            class="pointer-events-none absolute inset-0 opacity-60 dark:opacity-40"
            style={[
              "background-image: linear-gradient(to right, rgba(120,120,120,0.10) 1px, transparent 1px),",
              "linear-gradient(to bottom, rgba(120,120,120,0.10) 1px, transparent 1px);",
              "background-size: 20px 20px;",
            ].join("")}
          />

          {/* edges (canvas) */}
          <canvas
            ref={canvasRef}
            class="pointer-events-none absolute left-0 top-0"
          />

          {/* nodes */}
          {g.nodes.map((n) => {
            const x = n.x;
            const y = n.y;
            const active = n.id === selectedId;
            return (
              <div
                class={[
                  "absolute cursor-pointer overflow-hidden rounded-xl border bg-white/60 shadow-sm",
                  "dark:bg-zinc-950/20",
                  active
                    ? "border-indigo-500/60 ring-2 ring-indigo-500/20"
                    : "border-zinc-200/70 dark:border-zinc-800/60",
                ].join(" ")}
                style={`left:${x}px;top:${y}px;width:${n.w}px;height:${n.h}px`}
                title={n.rawTitle}
                onClick={() =>
                  setSelectedId((prev) => (prev === n.id ? undefined : n.id))
                }
              >
                <div
                  class={[
                    "absolute left-0 top-0 h-full w-[6px]",
                    kindAccent(n.kind),
                  ].join(" ")}
                />
                <div class="flex h-full flex-col gap-1 px-3 py-2">
                  <div class="whitespace-normal break-words text-[12px] font-extrabold leading-snug text-zinc-800 dark:text-zinc-100">
                    {n.title}
                  </div>
                  <div class="mt-0.5 grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-x-3 gap-y-1 text-[10.5px] leading-snug">
                    <div class="grid content-start gap-1">
                      {n.left.map((p) => (
                        <div class="min-w-0 break-words">
                          <span class="mr-1 font-extrabold text-zinc-500 dark:text-zinc-400">
                            {p.k}
                          </span>
                          <span class="font-mono font-semibold text-zinc-700 dark:text-zinc-200">
                            {p.v}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div class="grid content-start gap-1">
                      {n.right.map((p) => (
                        <div class="min-w-0 overflow-x-auto whitespace-nowrap">
                          <span class="mr-1 font-extrabold text-zinc-500 dark:text-zinc-400">
                            {p.k}
                          </span>
                          <span class="font-mono font-semibold text-zinc-700 dark:text-zinc-200">
                            {p.v}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div class="border-t border-zinc-200/50 px-3 py-2 text-[11px] text-zinc-500 dark:border-zinc-800/50 dark:text-zinc-400">
        edge width: rows / ヒント: 横/縦に大きい場合はスクロールできます。ノードクリックで詳細表示。
      </div>

      {selected ? (
        <div class="border-t border-zinc-200/50 px-3 py-3 dark:border-zinc-800/50">
          <div class="text-xs font-extrabold text-zinc-800 dark:text-zinc-100">
            {nodePlainTextLine(selected)}
          </div>
          <div class="mt-2 grid gap-1.5">
            {nodeConditions(selected).length ? (
              <div class="rounded-xl border border-zinc-200/60 bg-white/60 px-3 py-2 dark:border-zinc-800/60 dark:bg-zinc-950/20">
                <div class="text-[11px] font-extrabold text-zinc-700 dark:text-zinc-200">
                  Conditions
                </div>
                <div class="mt-1 grid gap-1 text-[11px] text-zinc-600 dark:text-zinc-300">
                  {nodeConditions(selected).map((c) => (
                    <div class="font-mono">
                      <span class="font-sans font-bold text-zinc-700 dark:text-zinc-200">
                        {c.label}
                      </span>
                      : {c.value}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <details class="rounded-xl border border-zinc-200/60 bg-white/60 px-3 py-2 dark:border-zinc-800/60 dark:bg-zinc-950/20">
              <summary class="cursor-pointer select-none text-[11px] font-extrabold text-zinc-700 dark:text-zinc-200 [&::-webkit-details-marker]:hidden">
                Raw JSON
              </summary>
              <pre class="m-0 mt-2 max-h-[320px] overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-zinc-800 dark:text-zinc-100">
                {JSON.stringify(selected.raw, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const PlanText: FC<{ root: PlanNode }> = ({ root }) => {
  const text = renderPlanPlainText(root);
  return (
    <div class="mx-3 overflow-hidden rounded-xl border border-zinc-200/60 bg-white/60 dark:border-zinc-800/60 dark:bg-zinc-950/20">
      <div class="flex items-center justify-between gap-2 border-b border-zinc-200/50 px-3 py-2 dark:border-zinc-800/50">
        <span class="text-xs font-extrabold text-zinc-700 dark:text-zinc-200">
          Plain text
        </span>
        <button
          type="button"
          class="rounded-lg border border-zinc-300/70 bg-white px-2 py-1 text-[11px] font-bold text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100 dark:border-zinc-700/70 dark:bg-zinc-900/40 dark:text-zinc-200 dark:hover:bg-zinc-800/50"
          onClick={() => {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            navigator.clipboard?.writeText(text);
          }}
        >
          Copy
        </button>
      </div>
      <pre class="m-0 max-h-[540px] overflow-auto whitespace-pre px-3 py-3 font-mono text-[12.5px] leading-relaxed text-zinc-800 dark:text-zinc-100">
        {text}
      </pre>
    </div>
  );
};

export const PlanResult: FC<Props> = ({ result, error }) => {
  if (!result) {
    return (
      <div class="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        {error ?? "Plan is not available"}
      </div>
    );
  }

  const statements = result.statements ?? [];
  const [statementIndex, setStatementIndex] = useState(0);
  const [view, setView] = useState<"graph" | "text">("graph");

  useEffect(() => {
    if (!statements.length) return;
    if (statementIndex < 0 || statementIndex >= statements.length) {
      setStatementIndex(0);
    }
  }, [statementIndex, statements.length]);

  const tree: PlanTree | undefined =
    statements.length > 0
      ? statements[Math.min(statements.length - 1, Math.max(0, statementIndex))]
      : undefined;

  const planning = tree?.meta.planningTimeMs;
  const execution = tree?.meta.executionTimeMs;

  const tabClass = (active: boolean) =>
    [
      "cursor-pointer select-none rounded-lg border border-transparent px-3 py-1.5 text-xs font-extrabold",
      "text-zinc-700 hover:bg-zinc-200/40 dark:text-zinc-200 dark:hover:bg-zinc-800/40",
      active ? "border-indigo-500/30 bg-indigo-500/15" : "",
    ]
      .filter(Boolean)
      .join(" ");

  return (
    <>
      <div class="mt-3 grid gap-3">
        {statements.length && tree ? (
          <div class="overflow-hidden rounded-xl border border-zinc-200/70 bg-zinc-50/60 dark:border-zinc-800/60 dark:bg-zinc-900/20">
            {/* toolbar */}
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/50 px-3 py-2 dark:border-zinc-800/50">
              <div class="flex flex-wrap items-center gap-2">
                <label class="text-xs font-extrabold text-zinc-700 dark:text-zinc-200">
                  Statement
                </label>
                <select
                  class="rounded-lg border border-zinc-300/70 bg-white px-2 py-1 text-xs font-bold text-zinc-700 dark:border-zinc-700/70 dark:bg-zinc-900/40 dark:text-zinc-200"
                  value={String(statementIndex)}
                  disabled={statements.length <= 1}
                  onChange={(e) => {
                    const v = Number(
                      (e.currentTarget as HTMLSelectElement).value,
                    );
                    setStatementIndex(Number.isFinite(v) ? v : 0);
                    scrollExecutionPlanToTop();
                  }}
                >
                  {statements.map((_, i) => (
                    <option value={String(i)}>Statement {i + 1}</option>
                  ))}
                </select>

                <div class="ml-2 inline-flex gap-3 text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                  {planning !== undefined ? (
                    <span>planning {fmtNum(planning)}ms</span>
                  ) : null}
                  {execution !== undefined ? (
                    <span>execution {fmtNum(execution)}ms</span>
                  ) : null}
                </div>
              </div>

              <div class="inline-flex gap-1 rounded-xl border border-zinc-300/70 bg-zinc-100/50 p-1 dark:border-zinc-700/70 dark:bg-zinc-900/40">
                <button
                  type="button"
                  class={tabClass(view === "graph")}
                  onClick={() => {
                    setView("graph");
                    scrollExecutionPlanToTop();
                  }}
                >
                  Graph
                </button>
                <button
                  type="button"
                  class={tabClass(view === "text")}
                  onClick={() => {
                    setView("text");
                    scrollExecutionPlanToTop();
                  }}
                >
                  Text
                </button>
              </div>
            </div>

            {/* body */}
            <div class="py-2">
              {view === "graph" ? (
                <section>
                  <PlanGraph root={tree.root} />
                </section>
              ) : (
                <section>
                  <PlanText root={tree.root} />
                </section>
              )}
            </div>
          </div>
        ) : (
          <div class="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            {error ?? "No plan statements"}
          </div>
        )}
      </div>
    </>
  );
};
