import { Context, Effect, Layer } from "effect";
import { Client } from "pg";
import { RuntimeConfig } from "../config.js";
import { makePgQueryable } from "./queryable.js";
import { Queryable } from "../../services/query.js";

export class PgClient extends Context.Tag("PgClient")<PgClient, Client>() {}

export const PgClientLive = Layer.scoped(
  PgClient,
  Effect.acquireRelease(
    Effect.gen(function* () {
      const cfg = yield* RuntimeConfig;
      const client = new Client({
        host: cfg.pg.host,
        port: cfg.pg.port,
        user: cfg.pg.user,
        password: cfg.pg.password,
        database: cfg.pg.database,
      });
      yield* Effect.tryPromise({
        try: async () => {
          await client.connect();
        },
        catch: (e) => (e instanceof Error ? e : new Error(String(e))),
      });
      return client;
    }),
    (client) =>
      Effect.tryPromise({
        try: async () => {
          await client.end().catch(() => undefined);
        },
        catch: (e) => (e instanceof Error ? e : new Error(String(e))),
      }).pipe(Effect.catchAll(() => Effect.void)),
  ),
);

export const QueryableLive = Layer.effect(
  Queryable,
  Effect.gen(function* () {
    const client = yield* PgClient;
    return makePgQueryable(client);
  }),
);
