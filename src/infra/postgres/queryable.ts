import { Effect, Schema, type Context } from "effect";
import type {
  Client,
  PoolClient,
  QueryResult as PgQueryResult,
  FieldDef,
} from "pg";
import {
  Queryable,
  QueryResultSchema,
  type QueryResult,
} from "../../services/query.js";

function mapPgFields(fields: readonly FieldDef[]): QueryResult["fields"] {
  return fields.map((f) => ({
    name: f.name,
    // pgの型情報は dataTypeID(number) 等なので、ここでは文字列化して返す
    type: String(f.dataTypeID),
  }));
}

function mapPgResult(result: PgQueryResult): QueryResult {
  return Schema.decodeUnknownSync(QueryResultSchema)({
    rows: result.rows,
    fields: mapPgFields(result.fields),
  });
}

/**
 * `pg` の `Client` / `PoolClient` を、Effectの `Queryable` サービスに変換する。
 * `createApp` へ注入して `provideService(Queryable, ...)` する想定。
 */
export function makePgQueryable(
  pg: Client | PoolClient,
): Context.Tag.Service<typeof Queryable> {
  return {
    execute: (query: string) =>
      Effect.tryPromise({
        try: async () => mapPgResult(await pg.query(query)),
        catch: (e) => (e instanceof Error ? e : new Error(String(e))),
      }),
  };
}
