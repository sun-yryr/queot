import type {
  ExplainJson,
  ExplainParseResult,
  ExplainStatement,
  ParseOptions,
  PlanNode,
  PlanTree,
} from "./types.js";
import { Effect, Schema } from "effect";
import { validatePlanNode } from "./schema.js";
import type { RawPlanNode } from "./schema.js";
import { ExplainJsonSchema } from "./types.js";

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isRawPlanNode(v: unknown): v is RawPlanNode {
  return isObject(v) && typeof v["Node Type"] === "string";
}

function normalizeExplainJson(input: unknown): ExplainStatement[] {
  // Schemaで形式を検証（decode結果は捨て、rawをそのまま保持する）
  Effect.runSync(Schema.decodeUnknown(ExplainJsonSchema)(input));

  return Array.isArray(input)
    ? (input as ExplainStatement[])
    : [input as ExplainStatement];
}

function buildPlanTreeFromRoot(
  rootRaw: RawPlanNode,
  options: Required<Pick<ParseOptions, "idStrategy">>,
): PlanNode {
  let seq = 0;

  const makeId = (path: number[]): string => {
    if (options.idStrategy === "preorder") return `n${seq++}`;
    // path は必ず [0] から始まる想定
    return path.join(".");
  };

  const visit = (
    raw: RawPlanNode,
    path: number[],
    parentId?: string,
  ): PlanNode => {
    const id = makeId(path);
    const validated = validatePlanNode(raw);
    const node: PlanNode = {
      ...validated.value,
      kind: validated.kind,
      raw: validated.raw,
      knownSchemaError:
        validated.kind === "UnknownNode"
          ? validated.knownSchemaError
          : undefined,
      id,
      depth: Math.max(0, path.length - 1),
      path,
      parentId,
      children: [],
    };

    const childrenRaw = Array.isArray(raw.Plans) ? raw.Plans : [];
    node.children = childrenRaw.map((c, i) => {
      const childRaw: RawPlanNode = isRawPlanNode(c)
        ? c
        : ({
            "Node Type": "InvalidPlanItem",
            Value: c,
          } as RawPlanNode);
      return visit(childRaw, [...path, i], id);
    });

    return node;
  };

  return visit(rootRaw, [0], undefined);
}

/**
 * EXPLAIN (ANALYZE, FORMAT JSON) の結果をパースし、Plan を木構造にして返します。
 *
 * - input に文字列を渡した場合は JSON.parse します
 * - ルートは通常 Statement[] ですが、Statement単体も許容します
 */
export function parseExplainAnalyzeJson(
  input: string,
  options?: ParseOptions,
): ExplainParseResult;
export function parseExplainAnalyzeJson(
  input: unknown,
  options?: ParseOptions,
): ExplainParseResult;
export function parseExplainAnalyzeJson(
  input: unknown,
  options: ParseOptions = {},
): ExplainParseResult {
  const json =
    typeof input === "string" ? (JSON.parse(input) as unknown) : input;
  const statements = normalizeExplainJson(json as ExplainJson);

  const idStrategy = options.idStrategy ?? "path";
  const trees: PlanTree[] = statements.map((statement) => {
    const root = buildPlanTreeFromRoot(statement.Plan, { idStrategy });
    return {
      root,
      statement,
      meta: {
        planningTimeMs:
          typeof statement["Planning Time"] === "number"
            ? statement["Planning Time"]
            : undefined,
        executionTimeMs:
          typeof statement["Execution Time"] === "number"
            ? statement["Execution Time"]
            : undefined,
      },
    };
  });

  return { statements: trees };
}

/**
 * ツリーを先行順(preorder)で走査します。
 * 例: ノード種別一覧の収集、フィルタ、メトリクス集計などに便利です。
 */
export function traversePlan(
  root: PlanNode,
  visit: (node: PlanNode) => void,
): void {
  visit(root);
  for (const c of root.children) traversePlan(c, visit);
}
