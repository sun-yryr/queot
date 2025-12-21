import { Hono } from "hono";
import { Effect, type Context } from "effect";
import {
  executeQuery,
  Queryable,
  type QueryResult,
} from "../services/query.js";
import { createDiffSheet, type DiffSheet } from "../services/diff.js";
import { parseExplainFromQueryResult } from "../services/plan.js";
import type { ExplainParseResult } from "@sun-yryr/queot-planparser";

type PlanMode = "explain" | "analyze";

type RunRequestBody = {
  queryA?: unknown;
  queryB?: unknown;
  planMode?: unknown;
};

type RunOneResult = {
  result?: QueryResult;
  error?: string;
};

export type RunResponse = {
  queryA: string;
  queryB: string;
  planMode: PlanMode;

  resultA?: QueryResult;
  resultB?: QueryResult;
  errorA?: string;
  errorB?: string;

  diff?: DiffSheet;

  planQueryResultA?: QueryResult;
  planQueryResultB?: QueryResult;
  planResultA?: ExplainParseResult;
  planResultB?: ExplainParseResult;
  planErrorA?: string;
  planErrorB?: string;

  planDiff?: DiffSheet;
};

/**
 * 1つのクエリを実行する。
 * @param query - 実行するクエリ
 * @returns 実行結果のEffect
 */
function runOne(query: string) {
  const trimmed = query.trim();
  if (trimmed.length === 0)
    return Effect.succeed<RunOneResult>({
      result: undefined,
      error: "EMPTY_QUERY",
    });

  return executeQuery(trimmed).pipe(
    Effect.map((result) => ({
      result,
      error: undefined,
    })),
    Effect.catchAll((e) =>
      Effect.succeed({
        result: undefined,
        error: e instanceof Error ? e.message : String(e),
      }),
    ),
  );
}

function parsePlanSafe(planQueryResult?: QueryResult): {
  plan?: ExplainParseResult;
  error?: string;
} {
  if (!planQueryResult) return { plan: undefined, error: undefined };
  try {
    return {
      plan: parseExplainFromQueryResult(planQueryResult),
      error: undefined,
    };
  } catch (e) {
    return {
      plan: undefined,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function normalizePlanMode(v: unknown): PlanMode {
  return v === "analyze" ? "analyze" : "explain";
}

export function createApiRoute(deps: {
  queryable: Context.Tag.Service<typeof Queryable>;
}) {
  const api = new Hono();

  api.post("/run", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as RunRequestBody;
    const queryA = typeof body?.queryA === "string" ? body.queryA : "";
    const queryB = typeof body?.queryB === "string" ? body.queryB : "";
    const planMode = normalizePlanMode(body?.planMode);

    let planPrefix = "EXPLAIN (FORMAT JSON";
    if (planMode === "analyze") {
      planPrefix += ", ANALYZE true";
    }
    planPrefix += ")";

    // 1つのトランザクションで2つのクエリを実行する。
    const program = Effect.gen(function* () {
      const connection = yield* Queryable;

      return yield* Effect.acquireUseRelease(
        connection.execute("BEGIN"),
        () => {
          return Effect.gen(function* () {
            const a = yield* runOne(queryA);
            const aPlan = yield* runOne(`${planPrefix} ${queryA}`);
            const b = yield* runOne(queryB);
            const bPlan = yield* runOne(`${planPrefix} ${queryB}`);
            return { a, aPlan, b, bPlan };
          });
        },
        () =>
          connection
            .execute("ROLLBACK")
            .pipe(Effect.catchAll(() => Effect.void)),
      );
    }).pipe(Effect.provideService(Queryable, deps.queryable));

    const { a, aPlan, b, bPlan } = await Effect.runPromise(program);

    const diff =
      a.result && b.result ? createDiffSheet(a.result, b.result) : undefined;

    const aPlanParsed = parsePlanSafe(aPlan.result);
    const bPlanParsed = parsePlanSafe(bPlan.result);

    const res: RunResponse = {
      queryA,
      queryB,
      planMode,

      resultA: a.result,
      resultB: b.result,
      errorA: a.error,
      errorB: b.error,

      diff,

      planQueryResultA: aPlan.result,
      planQueryResultB: bPlan.result,
      planResultA: aPlanParsed.plan,
      planResultB: bPlanParsed.plan,
      planErrorA: aPlanParsed.error ?? aPlan.error,
      planErrorB: bPlanParsed.error ?? bPlan.error,

      planDiff: undefined,
    };

    return c.json(res);
  });

  return api;
}
