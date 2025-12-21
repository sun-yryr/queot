/**
 * PostgreSQL EXPLAIN (ANALYZE, FORMAT JSON) の出力を扱うための型・Schema。
 *
 * 方針:
 * - JSONの形（Statement / Statement[]）は Schema で検証する
 * - Planノードは validatePlanNode によって Known/Unknown に分岐し、PlanNode の discriminator は node["Node Type"] にする
 * - 仕様差分や未知フィールドに備え、rawは常に保持する
 */

import { Schema } from "effect";
import type { RawPlanNode } from "./schema.js";
import { MinimalPlanNodeSchema } from "./schema.js";
import type { ValidatedNode } from "./schema.js";

/** EXPLAIN JSON の 1 ステートメント要素（FORMAT JSON配列の1要素） */
export type ExplainStatement = {
  Plan: RawPlanNode;
  "Planning Time"?: number;
  "Execution Time"?: number;
  Planning?: unknown;
  Triggers?: unknown;
  JIT?: unknown;
} & Record<string, unknown>;

export const ExplainStatementSchema = Schema.Struct({
  Plan: MinimalPlanNodeSchema,
  "Planning Time": Schema.optional(Schema.Number),
  "Execution Time": Schema.optional(Schema.Number),
  Planning: Schema.optional(Schema.Unknown),
  Triggers: Schema.optional(Schema.Unknown),
  JIT: Schema.optional(Schema.Unknown),
});

/** FORMAT JSON のトップレベルは通常「ステートメント配列」です（単体のケースも許容） */
export const ExplainJsonSchema = Schema.Union(
  Schema.Array(ExplainStatementSchema),
  ExplainStatementSchema,
);

export type ExplainJson = Schema.Schema.Type<typeof ExplainJsonSchema>;

/** ツリー化後のノード（ValidatedNode を土台にしつつ、ツリー情報を付与） */
export type PlanNode = ValidatedNode["value"] & {
  kind: ValidatedNode["kind"];
  raw: RawPlanNode;
  knownSchemaError?: unknown;
  id: string;
  depth: number;
  path: number[];
  parentId?: string;
  children: PlanNode[];
};

export type PlanTree = {
  root: PlanNode;
  statement: ExplainStatement;
  meta: {
    planningTimeMs?: number;
    executionTimeMs?: number;
  };
};

export type ParseOptions = {
  idStrategy?: "path" | "preorder";
};

export type ExplainParseResult = {
  statements: PlanTree[];
};
