import { Hono } from "hono";
import { Hello } from "./hello.jsx";
import { Index } from "./index.jsx";
import { Effect, type Context } from "effect";
import { executeQuery, Queryable } from "../services/query.js";
import { createDiffSheet } from "../services/diff.js";

/**
 * 1つのクエリを実行する。
 * @param query - 実行するクエリ
 * @returns 実行結果のEffect
 */
function runOne(query: string) {
  const trimmed = query.trim();
  if (trimmed.length === 0)
    return Effect.succeed({
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

export function createPageRoute(deps: {
  queryable: Context.Tag.Service<typeof Queryable>;
}) {
  const pageRoute = new Hono();
  pageRoute.get("/", (c) => c.html(<Index />));
  pageRoute.post("/", async (c) => {
    const body = await c.req.parseBody();
    const queryA = typeof body?.queryA === "string" ? body.queryA : "";
    const queryB = typeof body?.queryB === "string" ? body.queryB : "";
    let planPrefix = "EXPLAIN (FORMAT JSON";
    if (body?.planMode === "analyze") {
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

    return c.html(
      <Index
        queryA={queryA}
        queryB={queryB}
        resultA={a.result}
        resultB={b.result}
        errorA={a.error}
        errorB={b.error}
        planMode={body?.planMode === "analyze" ? "analyze" : "explain"}
        planResultA={aPlan.result}
        planResultB={bPlan.result}
        planErrorA={aPlan.error}
        planErrorB={bPlan.error}
        planDiff={undefined}
        diff={diff}
      />,
    );
  });
  pageRoute.get("/hello", (c) => c.html(<Hello />));
  return pageRoute;
}
