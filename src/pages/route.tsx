import { Hono } from "hono";
import { Hello } from "./hello.jsx";
import { Index } from "./index.jsx";
import { Effect, type Context } from "effect";
import { executeQuery, Queryable } from "../services/query.js";
import { createDiffSheet } from "../services/diff.js";

export function createPageRoute(deps: {
  queryable: Context.Tag.Service<typeof Queryable>;
}) {
  const pageRoute = new Hono();
  pageRoute.get("/", (c) => c.html(<Index />));
  pageRoute.post("/", async (c) => {
    const body = await c.req.parseBody();
    const queryA = typeof body?.queryA === "string" ? body.queryA : "";
    const queryB = typeof body?.queryB === "string" ? body.queryB : "";
    const planMode = body?.planMode === "analyze" ? "analyze" : "explain";

    const runOne = (query: string) => {
      const trimmed = query.trim();
      if (trimmed.length === 0)
        return Effect.succeed({
          result: undefined,
          error: undefined,
          planResult: undefined,
          planError: undefined,
        });

      const planPrefix = planMode === "analyze" ? "EXPLAIN ANALYZE" : "EXPLAIN";
      const runPlan = executeQuery(`${planPrefix} ${trimmed}`).pipe(
        Effect.map((result) => ({
          result,
          error: undefined as string | undefined,
        })),
        Effect.catchAll((e) =>
          Effect.succeed({
            result: undefined,
            error: e instanceof Error ? e.message : String(e),
          }),
        ),
      );

      return executeQuery(trimmed).pipe(
        Effect.flatMap((queryResult) =>
          runPlan.pipe(
            Effect.map((plan) => ({
              result: queryResult,
              error: undefined as string | undefined,
              planResult: plan.result,
              planError: plan.error,
            })),
          ),
        ),
        Effect.catchAll((e) =>
          runPlan.pipe(
            Effect.map((plan) => ({
              result: undefined,
              error: e instanceof Error ? e.message : String(e),
              planResult: plan.result,
              planError: plan.error,
            })),
          ),
        ),
      );
    };

    // 1つのトランザクションで2つのクエリを実行する。
    const program = Effect.gen(function* () {
      const connection = yield* Queryable;

      return yield* Effect.acquireUseRelease(
        connection.execute("BEGIN"),
        () => {
          return Effect.gen(function* () {
            const a = yield* runOne(queryA);
            const b = yield* runOne(queryB);
            return { a, b };
          });
        },
        () =>
          connection
            .execute("ROLLBACK")
            .pipe(Effect.catchAll(() => Effect.void)),
      );
    }).pipe(Effect.provideService(Queryable, deps.queryable));

    const { a, b } = await Effect.runPromise(program);
    const diff =
      a.result && b.result ? createDiffSheet(a.result, b.result) : undefined;
    const planDiff =
      a.planResult && b.planResult
        ? createDiffSheet(a.planResult, b.planResult)
        : undefined;

    return c.html(
      <Index
        queryA={queryA}
        queryB={queryB}
        resultA={a.result}
        resultB={b.result}
        errorA={a.error}
        errorB={b.error}
        planMode={planMode}
        planResultA={a.planResult}
        planResultB={b.planResult}
        planErrorA={a.planError}
        planErrorB={b.planError}
        planDiff={planDiff}
        diff={diff}
      />,
    );
  });
  pageRoute.get("/hello", (c) => c.html(<Hello />));
  return pageRoute;
}
