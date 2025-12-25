import { Hono } from "hono";
import { Context, Effect, Schema } from "effect";
import * as Either from "effect/Either";
import {
  executeQuery,
  Queryable,
  type QueryResult,
} from "../services/query.js";
import {
  createDiffSheet,
  diffHasChanges,
  type DiffSheet,
} from "../services/diff.js";
import { parseExplainFromQueryResult } from "../services/plan.js";
import type { ExplainParseResult } from "@sun-yryr/queot-planparser";
import type {
  HistoryDetailResponse,
  HistoriesResponse,
  PlanMode,
  RunResponse,
} from "./types.js";
import { newHistoryEntry, HistoryStore } from "../infra/history.js";
import { HistoriesQuerySchema, RunRequestSchema } from "./schemas.js";

type RunOneResult = {
  result?: QueryResult;
  error?: string;
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

function computeHasDiffChanges(args: {
  queryA: string;
  queryB: string;
  resultA?: QueryResult;
  resultB?: QueryResult;
  diff?: DiffSheet;
}): boolean | undefined {
  const hasBoth = Boolean(args.resultA && args.resultB);
  if (hasBoth) return diffHasChanges(args.diff);

  // 片側しか結果が無く diff が取れない場合は「差分あり（= 要確認）」扱いにする
  const hasAnyQuery =
    args.queryA.trim().length > 0 || args.queryB.trim().length > 0;
  return hasAnyQuery ? true : undefined;
}

export function createApiRoute(deps: {
  context: Context.Context<Queryable | HistoryStore>;
}) {
  const api = new Hono();

  api.get("/histories", async (c) => {
    const decoded = Schema.decodeUnknownEither(HistoriesQuerySchema)({
      limit: c.req.query("limit"),
      id: c.req.query("id"),
      timestamp: c.req.query("timestamp"),
    });
    if (Either.isLeft(decoded)) {
      return c.json({ error: "BAD_REQUEST" }, 400);
    }

    const items = await Effect.runPromise(
      Effect.gen(function* () {
        const history = yield* HistoryStore;
        return yield* history.readHistorySummaries(decoded.right);
      }).pipe(Effect.provide(deps.context)),
    );

    const res: HistoriesResponse = { items };
    return c.json(res);
  });

  api.get("/histories/:id", async (c) => {
    const id = c.req.param("id");
    const item = await Effect.runPromise(
      Effect.gen(function* () {
        const history = yield* HistoryStore;
        return yield* history.readHistoryById(id);
      }).pipe(Effect.provide(deps.context)),
    );
    if (!item)
      return c.json({ item: undefined } satisfies HistoryDetailResponse, 404);
    return c.json({ item } satisfies HistoryDetailResponse);
  });

  api.post("/run", async (c) => {
    const rawBody = (await c.req.json().catch(() => ({}))) as unknown;
    const decoded = Schema.decodeUnknownEither(RunRequestSchema)(rawBody);
    if (Either.isLeft(decoded)) {
      return c.json({ error: "BAD_REQUEST" }, 400);
    }
    const body = decoded.right;
    const queryA = body.queryA ?? "";
    const queryB = body.queryB ?? "";
    const planMode: PlanMode = body.planMode ?? "explain";

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
    });

    const { a, aPlan, b, bPlan } = await Effect.runPromise(
      program.pipe(Effect.provide(deps.context)),
    );

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
      hasDiffChanges: computeHasDiffChanges({
        queryA,
        queryB,
        resultA: a.result,
        resultB: b.result,
        diff,
      }),

      planQueryResultA: aPlan.result,
      planQueryResultB: bPlan.result,
      planResultA: aPlanParsed.plan,
      planResultB: bPlanParsed.plan,
      planErrorA: aPlanParsed.error ?? aPlan.error,
      planErrorB: bPlanParsed.error ?? bPlan.error,

      planDiff: undefined,
    };

    // 履歴は「失敗してもレスポンスを壊さない」方針で、best-effort で追記する
    try {
      await Effect.runPromise(
        Effect.gen(function* () {
          const history = yield* HistoryStore;
          yield* history.appendHistory(
            newHistoryEntry({
              queryA,
              queryB,
              planMode,
              response: res,
            }),
          );
        }).pipe(Effect.provide(deps.context)),
      );
    } catch {
      // ignore
    }

    return c.json(res);
  });

  return api;
}
