import { Effect, Context, Schema } from "effect";

const FieldSchema = Schema.Struct({
  name: Schema.String,
  type: Schema.String,
});

const RowSchema = Schema.Record({
  key: Schema.String,
  value: Schema.Unknown,
});

export const QueryResultSchema = Schema.Struct({
  rows: Schema.Array(RowSchema),
  fields: Schema.Array(FieldSchema),
});

export type QueryResult = Schema.Schema.Type<typeof QueryResultSchema>;

export class Queryable extends Context.Tag("Queryable")<
  Queryable,
  {
    execute: (query: string) => Effect.Effect<QueryResult, Error>;
  }
>() {}

export const executeQuery = (query: string) =>
  Effect.gen(function* () {
    const connection = yield* Queryable;

    return yield* connection.execute(query);
  });
