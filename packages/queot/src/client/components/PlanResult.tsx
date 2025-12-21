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

function nodeSubTitle(node: PlanNode): string | undefined {
  const raw = node.raw as unknown as Record<string, unknown>;
  const relation = pickStr(raw, "Relation Name");
  const index = pickStr(raw, "Index Name");
  const alias = pickStr(raw, "Alias");
  const joinType = pickStr(raw, "Join Type");
  const scanDir = pickStr(raw, "Scan Direction");

  const parts = [
    relation ? `rel: ${relation}` : undefined,
    index ? `idx: ${index}` : undefined,
    alias && alias !== relation ? `as: ${alias}` : undefined,
    joinType ? `join: ${joinType}` : undefined,
    scanDir ? `dir: ${scanDir}` : undefined,
  ].filter(Boolean) as string[];

  return parts.length ? parts.join(" · ") : undefined;
}

function truncate(s: string, max = 40): string {
  if (s.length <= max) return s;
  return `${s.slice(0, Math.max(0, max - 1))}…`;
}

function nodeMetrics(node: PlanNode): string[] {
  const raw = node.raw as unknown as Record<string, unknown>;
  const startupCost = pickNum(raw, "Startup Cost");
  const totalCost = pickNum(raw, "Total Cost");
  const planRows = pickNum(raw, "Plan Rows");

  const actualStart = pickNum(raw, "Actual Startup Time");
  const actualTotal = pickNum(raw, "Actual Total Time");
  const actualRows = pickNum(raw, "Actual Rows");
  const loops = pickNum(raw, "Actual Loops");

  const out: string[] = [];
  if (
    startupCost !== undefined ||
    totalCost !== undefined ||
    planRows !== undefined
  ) {
    out.push(
      `plan: cost ${startupCost !== undefined ? fmtNum(startupCost, 2) : "?"}..${
        totalCost !== undefined ? fmtNum(totalCost, 2) : "?"
      } rows ${planRows !== undefined ? fmtNum(planRows, 0) : "?"}`,
    );
  }
  if (
    actualStart !== undefined ||
    actualTotal !== undefined ||
    actualRows !== undefined ||
    loops !== undefined
  ) {
    out.push(
      `actual: time ${actualStart !== undefined ? fmtNum(actualStart) : "?"}..${
        actualTotal !== undefined ? fmtNum(actualTotal) : "?"
      } rows ${actualRows !== undefined ? fmtNum(actualRows, 0) : "?"} loops ${
        loops !== undefined ? fmtNum(loops, 0) : "?"
      }`,
    );
  }
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

type GraphNode = {
  id: string;
  x: number;
  y: number;
  title: string;
  subtitle?: string;
  rawTitle: string;
};

type GraphEdge = {
  fromId: string;
  toId: string;
};

function layoutPlanTree(root: PlanNode) {
  // シンプルなツリー・レイアウト:
  // - 葉の数を「幅」として扱い、子の幅の合計で親の幅を決める
  // - x は子の範囲の中央、y は depth に応じて等間隔
  const NODE_W = 180;
  const NODE_H = 44;
  const GAP_X = 26;
  const GAP_Y = 30;
  const PAD_X = 16;
  const PAD_Y = 16;

  const widthCache = new Map<string, number>();
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const subtreeUnits = (n: PlanNode): number => {
    const cached = widthCache.get(n.id);
    if (cached !== undefined) return cached;
    const u =
      n.children.length === 0
        ? 1
        : n.children.reduce((acc, c) => acc + subtreeUnits(c), 0);
    widthCache.set(n.id, u);
    return u;
  };

  const unitToX = (unit: number) => PAD_X + unit * (NODE_W + GAP_X);
  const depthToY = (depth: number) => PAD_Y + depth * (NODE_H + GAP_Y);

  const visit = (n: PlanNode, leftUnit: number) => {
    const units = subtreeUnits(n);
    const myCenterUnit = leftUnit + units / 2 - 0.5;
    const x = unitToX(myCenterUnit);
    const y = depthToY(n.depth);

    const title = nodeTitle(n);
    const subtitle = nodeSubTitle(n);
    const rawTitle = [title, subtitle].filter(Boolean).join(" — ");

    nodes.push({
      id: n.id,
      x,
      y,
      title: truncate(title, 28),
      subtitle: subtitle ? truncate(subtitle, 46) : undefined,
      rawTitle,
    });

    let cursor = leftUnit;
    for (const c of n.children) {
      edges.push({ fromId: n.id, toId: c.id });
      const cu = subtreeUnits(c);
      visit(c, cursor);
      cursor += cu;
    }
  };

  visit(root, 0);

  const maxDepth = nodes.reduce(
    (m, n) => Math.max(m, Math.round((n.y - PAD_Y) / (NODE_H + GAP_Y))),
    0,
  );
  const totalUnits = subtreeUnits(root);

  const width = PAD_X * 2 + totalUnits * (NODE_W + GAP_X) - GAP_X;
  const height = PAD_Y * 2 + (maxDepth + 1) * (NODE_H + GAP_Y) - GAP_Y;

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  return {
    nodes,
    edges,
    nodeById,
    width,
    height,
    constants: { NODE_W, NODE_H },
  };
}

const PlanGraph: FC<{ root: PlanNode }> = ({ root }) => {
  const g = layoutPlanTree(root);

  return (
    <div class="planGraphWrap">
      <svg
        class="planGraph"
        width="100%"
        height={Math.max(240, g.height)}
        viewBox={`0 0 ${g.width} ${g.height}`}
        role="img"
        aria-label="Execution plan graph"
      >
        <defs>
          <linearGradient id="planNodeFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="rgba(127,127,127,0.10)" />
            <stop offset="100%" stop-color="rgba(127,127,127,0.06)" />
          </linearGradient>
        </defs>

        {/* edges */}
        {g.edges.map((e) => {
          const from = g.nodeById.get(e.fromId);
          const to = g.nodeById.get(e.toId);
          if (!from || !to) return null;
          const x1 = from.x + g.constants.NODE_W / 2;
          const y1 = from.y + g.constants.NODE_H;
          const x2 = to.x + g.constants.NODE_W / 2;
          const y2 = to.y;
          const midY = (y1 + y2) / 2;
          const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
          return <path d={d} class="planGraphEdge" />;
        })}

        {/* nodes */}
        {g.nodes.map((n) => {
          const x = n.x;
          const y = n.y;
          return (
            <g>
              <title>{n.rawTitle}</title>
              <rect
                x={x}
                y={y}
                width={g.constants.NODE_W}
                height={g.constants.NODE_H}
                rx="10"
                class="planGraphNode"
              />
              <text x={x + 12} y={y + 18} class="planGraphTitle">
                {n.title}
              </text>
              {n.subtitle ? (
                <text x={x + 12} y={y + 34} class="planGraphSub">
                  {n.subtitle}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <div class="planGraphHint">
        ヒント:
        横に長い場合はスクロールできます。ノードにマウスオーバーで詳細表示。
      </div>
    </div>
  );
};

const PlanNodeView: FC<{ node: PlanNode }> = ({ node }) => {
  const title = nodeTitle(node);
  const subtitle = nodeSubTitle(node);
  const metrics = nodeMetrics(node);
  const conditions = nodeConditions(node);

  // 深い階層は畳んでおく（SSRでも扱いやすい）
  const openByDefault = node.depth <= 1;

  return (
    <details class="planNode" open={openByDefault}>
      <summary
        class="planNodeSummary"
        style={`padding-left:${node.depth * 16}px`}
      >
        <span class="planNodeMain">
          <span class="planNodeTitle">{title}</span>
          {subtitle ? <span class="planNodeSub">{subtitle}</span> : null}
        </span>
      </summary>

      <div class="planNodeBody" style={`padding-left:${node.depth * 16}px`}>
        {metrics.length ? (
          <div class="planNodeMetrics">
            {metrics.map((m) => (
              <div class="planNodeMetric">{m}</div>
            ))}
          </div>
        ) : null}

        {conditions.length ? (
          <div class="planNodeConds">
            {conditions.map((c) => (
              <div class="planNodeCond">
                <span class="planNodeCondLabel">{c.label}</span>
                <code class="planNodeCondValue">{c.value}</code>
              </div>
            ))}
          </div>
        ) : null}

        {node.children.length ? (
          <div class="planNodeChildren">
            {node.children.map((c) => (
              <PlanNodeView node={c} />
            ))}
          </div>
        ) : null}

        <details class="planNodeRaw">
          <summary class="planNodeRawSummary">raw</summary>
          <pre class="planNodeRawPre">{JSON.stringify(node.raw, null, 2)}</pre>
        </details>
      </div>
    </details>
  );
};

const StatementView: FC<{ tree: PlanTree; index: number }> = ({
  tree,
  index,
}) => {
  const planning = tree.meta.planningTimeMs;
  const execution = tree.meta.executionTimeMs;
  const tabGraphId = `planViewGraph_${index}`;
  const tabOutlineId = `planViewOutline_${index}`;
  const tabName = `planViewTab_${index}`;
  return (
    <details class="planStatement" open={index === 0}>
      <summary class="planStatementSummary">
        <span>Statement {index + 1}</span>
        <span class="planStatementMeta">
          {planning !== undefined ? (
            <span>planning {fmtNum(planning)}ms</span>
          ) : null}
          {execution !== undefined ? (
            <span>execution {fmtNum(execution)}ms</span>
          ) : null}
        </span>
      </summary>
      <div class="planTree">
        <div class="planViewTabsRoot">
          <input
            class="planViewTabInput"
            type="radio"
            name={tabName}
            id={tabGraphId}
            checked
          />
          <input
            class="planViewTabInput"
            type="radio"
            name={tabName}
            id={tabOutlineId}
          />

          <div class="planViewTabs">
            <label class="planViewTab" for={tabGraphId}>
              Graph
            </label>
            <label class="planViewTab" for={tabOutlineId}>
              Outline
            </label>
          </div>

          <div class="planViewPanels">
            <section class="planViewPanel" id={`planViewPanelGraph_${index}`}>
              <PlanGraph root={tree.root} />
            </section>
            <section class="planViewPanel" id={`planViewPanelOutline_${index}`}>
              <PlanNodeView node={tree.root} />
            </section>
          </div>
        </div>
      </div>
    </details>
  );
};

export const PlanResult: FC<Props> = ({ result, error }) => {
  if (!result) {
    return <div class="meta">{error ?? "Plan is not available"}</div>;
  }

  return (
    <>
      <div class="planRoot">
        {result.statements?.length ? (
          result.statements.map((t, i) => <StatementView tree={t} index={i} />)
        ) : (
          <div class="meta">{error ?? "No plan statements"}</div>
        )}
      </div>
    </>
  );
};
