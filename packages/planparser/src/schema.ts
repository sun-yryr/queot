import { Effect, Schema } from "effect";

export type RawPlanNode = {
  "Node Type": string;
  Plans?: unknown[];
  [key: string]: unknown;
};

/**
 * ノード単位の「最低限」スキーマ。
 * - UnknownNode に落とすときでもこれだけは通す
 * - rawの全フィールドは保持したいので、decode結果は使わず「通ったかどうか」だけに使う
 */
export const MinimalPlanNodeSchema = Schema.Struct({
  "Node Type": Schema.String,
  Plans: Schema.optional(Schema.Array(Schema.Unknown)),
});

// PlanNode の判別（型安全な推論）を成立させるため、検証失敗ノードは
// PlanNode["Node Type"] を固定値 "UnknownNode" にする（元のNode Typeは originalNodeType に保持する）。
export const UnknownNodeSchema = Schema.Struct({
  "Node Type": Schema.Literal("UnknownNode"),
  originalNodeType: Schema.String,
  Plans: Schema.optional(Schema.Array(Schema.Unknown)),
});

const CommonNodeFields = {
  "Parallel Aware": Schema.optional(Schema.Boolean),
  "Async Capable": Schema.optional(Schema.Boolean),
  "Parent Relationship": Schema.optional(Schema.String),
  Disabled: Schema.optional(Schema.Boolean),

  "Startup Cost": Schema.optional(Schema.Number),
  "Total Cost": Schema.optional(Schema.Number),
  "Plan Rows": Schema.optional(Schema.Number),
  "Plan Width": Schema.optional(Schema.Number),

  "Actual Startup Time": Schema.optional(Schema.Number),
  "Actual Total Time": Schema.optional(Schema.Number),
  "Actual Rows": Schema.optional(Schema.Number),
  "Actual Loops": Schema.optional(Schema.Number),

  "Shared Hit Blocks": Schema.optional(Schema.Number),
  "Shared Read Blocks": Schema.optional(Schema.Number),
  "Shared Dirtied Blocks": Schema.optional(Schema.Number),
  "Shared Written Blocks": Schema.optional(Schema.Number),
} as const;

// NOTE:
// KnownNodeは「必要最低限＋型が合っていること」をチェックする。
// Plansの中身はここでは検証しない（子ノードは別途ノード単位で検証する）ため、Plans は Unknown[] とする。

const LimitNodeSchema = Schema.Struct({
  ...CommonNodeFields,
  "Node Type": Schema.Literal("Limit"),
  Plans: Schema.optional(Schema.Array(Schema.Unknown)),
});

const UniqueNodeSchema = Schema.Struct({
  ...CommonNodeFields,
  "Node Type": Schema.Literal("Unique"),
  Plans: Schema.optional(Schema.Array(Schema.Unknown)),
});

const IncrementalSortNodeSchema = Schema.Struct({
  ...CommonNodeFields,
  "Node Type": Schema.Literal("Incremental Sort"),
  "Sort Key": Schema.optional(Schema.Array(Schema.String)),
  "Presorted Key": Schema.optional(Schema.Array(Schema.String)),
  Plans: Schema.optional(Schema.Array(Schema.Unknown)),
});

const NestedLoopNodeSchema = Schema.Struct({
  ...CommonNodeFields,
  "Node Type": Schema.Literal("Nested Loop"),
  "Join Type": Schema.optional(Schema.String),
  "Inner Unique": Schema.optional(Schema.Boolean),
  "Join Filter": Schema.optional(Schema.String),
  "Rows Removed by Join Filter": Schema.optional(Schema.Number),
  Plans: Schema.optional(Schema.Array(Schema.Unknown)),
});

const IndexScanNodeSchema = Schema.Struct({
  ...CommonNodeFields,
  "Node Type": Schema.Literal("Index Scan"),
  "Scan Direction": Schema.optional(Schema.String),
  "Index Name": Schema.optional(Schema.String),
  "Relation Name": Schema.optional(Schema.String),
  Alias: Schema.optional(Schema.String),
  Filter: Schema.optional(Schema.String),
  "Index Cond": Schema.optional(Schema.String),
  "Index Searches": Schema.optional(Schema.Number),
  Plans: Schema.optional(Schema.Array(Schema.Unknown)),
});

const IndexOnlyScanNodeSchema = Schema.Struct({
  ...CommonNodeFields,
  "Node Type": Schema.Literal("Index Only Scan"),
  "Scan Direction": Schema.optional(Schema.String),
  "Index Name": Schema.optional(Schema.String),
  "Relation Name": Schema.optional(Schema.String),
  Alias: Schema.optional(Schema.String),
  "Index Cond": Schema.optional(Schema.String),
  "Heap Fetches": Schema.optional(Schema.Number),
  "Index Searches": Schema.optional(Schema.Number),
  Plans: Schema.optional(Schema.Array(Schema.Unknown)),
});

const SeqScanNodeSchema = Schema.Struct({
  ...CommonNodeFields,
  "Node Type": Schema.Literal("Seq Scan"),
  "Relation Name": Schema.optional(Schema.String),
  Alias: Schema.optional(Schema.String),
  Filter: Schema.optional(Schema.String),
  Plans: Schema.optional(Schema.Array(Schema.Unknown)),
});

const MaterializeNodeSchema = Schema.Struct({
  ...CommonNodeFields,
  "Node Type": Schema.Literal("Materialize"),
  Storage: Schema.optional(Schema.String),
  "Maximum Storage": Schema.optional(Schema.Number),
  Plans: Schema.optional(Schema.Array(Schema.Unknown)),
});

const MemoizeNodeSchema = Schema.Struct({
  ...CommonNodeFields,
  "Node Type": Schema.Literal("Memoize"),
  "Cache Key": Schema.optional(Schema.String),
  "Cache Mode": Schema.optional(Schema.String),
  Plans: Schema.optional(Schema.Array(Schema.Unknown)),
});

export type LimitNode = Schema.Schema.Type<typeof LimitNodeSchema>;
export type UniqueNode = Schema.Schema.Type<typeof UniqueNodeSchema>;
export type IncrementalSortNode = Schema.Schema.Type<
  typeof IncrementalSortNodeSchema
>;
export type NestedLoopNode = Schema.Schema.Type<typeof NestedLoopNodeSchema>;
export type IndexScanNode = Schema.Schema.Type<typeof IndexScanNodeSchema>;
export type IndexOnlyScanNode = Schema.Schema.Type<
  typeof IndexOnlyScanNodeSchema
>;
export type SeqScanNode = Schema.Schema.Type<typeof SeqScanNodeSchema>;
export type MaterializeNode = Schema.Schema.Type<typeof MaterializeNodeSchema>;
export type MemoizeNode = Schema.Schema.Type<typeof MemoizeNodeSchema>;

export const KnownNodeSchemas = {
  Limit: LimitNodeSchema,
  Unique: UniqueNodeSchema,
  "Incremental Sort": IncrementalSortNodeSchema,
  "Nested Loop": NestedLoopNodeSchema,
  "Index Scan": IndexScanNodeSchema,
  "Index Only Scan": IndexOnlyScanNodeSchema,
  "Seq Scan": SeqScanNodeSchema,
  Materialize: MaterializeNodeSchema,
  Memoize: MemoizeNodeSchema,
} as const;

export type KnownNodeType = keyof typeof KnownNodeSchemas;
export type KnownNodeValue<T extends KnownNodeType = KnownNodeType> =
  Schema.Schema.Type<(typeof KnownNodeSchemas)[T]>;

export type KnownNode = {
  [K in KnownNodeType]: {
    kind: "KnownNode";
    // NOTE: ここがdiscriminator。PlanNode["Node Type"] === "Seq Scan" で型が絞れる
    value: KnownNodeValue<K>;
    raw: RawPlanNode;
  };
}[KnownNodeType];

export type UnknownNodeValue = Schema.Schema.Type<typeof UnknownNodeSchema>;
export type UnknownNode = {
  kind: "UnknownNode";
  value: UnknownNodeValue;
  raw: RawPlanNode;
  knownSchemaError?: unknown;
};

export type ValidatedNode = KnownNode | UnknownNode;

function decodeOk<A>(
  schema: Schema.Schema<A>,
  input: unknown,
): { ok: true; value: A } | { ok: false; error: unknown } {
  try {
    const value = Effect.runSync(Schema.decodeUnknown(schema)(input));
    return { ok: true, value };
  } catch (error) {
    return { ok: false, error };
  }
}

function ensureMinimalOrThrow(raw: unknown): asserts raw is RawPlanNode {
  const r = decodeOk(MinimalPlanNodeSchema, raw);
  if (!r.ok) {
    throw new TypeError(
      'Invalid Plan node: expected an object with string "Node Type" (and optional Plans array)',
    );
  }
}

/**
 * "Node Type" によってスキーマを切り替えて検証し、失敗した場合は UnknownNode にフォールバックします。
 *
 * - knownなNode Typeでも、スキーマ不一致なら UnknownNode（raw保持＋error保持）
 * - unknownなNode Typeは UnknownNode（raw保持）
 */
export function validatePlanNode(raw: unknown): ValidatedNode {
  ensureMinimalOrThrow(raw);

  const nodeType = raw["Node Type"];
  switch (nodeType) {
    case "Limit": {
      const decoded = decodeOk(LimitNodeSchema, raw);
      return decoded.ok
        ? { kind: "KnownNode", value: decoded.value, raw }
        : {
            kind: "UnknownNode",
            value: {
              "Node Type": "UnknownNode",
              originalNodeType: "Limit",
              Plans: raw.Plans,
            },
            raw,
            knownSchemaError: decoded.error,
          };
    }
    case "Unique": {
      const decoded = decodeOk(UniqueNodeSchema, raw);
      return decoded.ok
        ? { kind: "KnownNode", value: decoded.value, raw }
        : {
            kind: "UnknownNode",
            value: {
              "Node Type": "UnknownNode",
              originalNodeType: "Unique",
              Plans: raw.Plans,
            },
            raw,
            knownSchemaError: decoded.error,
          };
    }
    case "Incremental Sort": {
      const decoded = decodeOk(IncrementalSortNodeSchema, raw);
      return decoded.ok
        ? { kind: "KnownNode", value: decoded.value, raw }
        : {
            kind: "UnknownNode",
            value: {
              "Node Type": "UnknownNode",
              originalNodeType: "Incremental Sort",
              Plans: raw.Plans,
            },
            raw,
            knownSchemaError: decoded.error,
          };
    }
    case "Nested Loop": {
      const decoded = decodeOk(NestedLoopNodeSchema, raw);
      return decoded.ok
        ? { kind: "KnownNode", value: decoded.value, raw }
        : {
            kind: "UnknownNode",
            value: {
              "Node Type": "UnknownNode",
              originalNodeType: "Nested Loop",
              Plans: raw.Plans,
            },
            raw,
            knownSchemaError: decoded.error,
          };
    }
    case "Index Scan": {
      const decoded = decodeOk(IndexScanNodeSchema, raw);
      return decoded.ok
        ? { kind: "KnownNode", value: decoded.value, raw }
        : {
            kind: "UnknownNode",
            value: {
              "Node Type": "UnknownNode",
              originalNodeType: "Index Scan",
              Plans: raw.Plans,
            },
            raw,
            knownSchemaError: decoded.error,
          };
    }
    case "Index Only Scan": {
      const decoded = decodeOk(IndexOnlyScanNodeSchema, raw);
      return decoded.ok
        ? { kind: "KnownNode", value: decoded.value, raw }
        : {
            kind: "UnknownNode",
            value: {
              "Node Type": "UnknownNode",
              originalNodeType: "Index Only Scan",
              Plans: raw.Plans,
            },
            raw,
            knownSchemaError: decoded.error,
          };
    }
    case "Seq Scan": {
      const decoded = decodeOk(SeqScanNodeSchema, raw);
      return decoded.ok
        ? { kind: "KnownNode", value: decoded.value, raw }
        : {
            kind: "UnknownNode",
            value: {
              "Node Type": "UnknownNode",
              originalNodeType: "Seq Scan",
              Plans: raw.Plans,
            },
            raw,
            knownSchemaError: decoded.error,
          };
    }
    case "Materialize": {
      const decoded = decodeOk(MaterializeNodeSchema, raw);
      return decoded.ok
        ? { kind: "KnownNode", value: decoded.value, raw }
        : {
            kind: "UnknownNode",
            value: {
              "Node Type": "UnknownNode",
              originalNodeType: "Materialize",
              Plans: raw.Plans,
            },
            raw,
            knownSchemaError: decoded.error,
          };
    }
    case "Memoize": {
      const decoded = decodeOk(MemoizeNodeSchema, raw);
      return decoded.ok
        ? { kind: "KnownNode", value: decoded.value, raw }
        : {
            kind: "UnknownNode",
            value: {
              "Node Type": "UnknownNode",
              originalNodeType: "Memoize",
              Plans: raw.Plans,
            },
            raw,
            knownSchemaError: decoded.error,
          };
    }
    default:
      // unknown type: 最低限だけ担保して raw をそのまま残す（PlanNode側はUnknownNodeとして扱う）
      return {
        kind: "UnknownNode",
        value: {
          "Node Type": "UnknownNode",
          originalNodeType: nodeType,
          Plans: raw.Plans,
        },
        raw,
      };
  }
}
