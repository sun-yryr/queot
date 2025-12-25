import { Schema } from "effect";

export const PlanModeSchema = Schema.Literal("explain", "analyze");

export const RunRequestSchema = Schema.Struct({
  queryA: Schema.optional(Schema.String),
  queryB: Schema.optional(Schema.String),
  planMode: Schema.optional(PlanModeSchema),
});

export const HistoriesQuerySchema = Schema.Struct({
  limit: Schema.optional(
    Schema.NumberFromString.pipe(
      Schema.int(),
      Schema.nonNegative(),
      Schema.clamp(1, 200),
    ),
  ),
  id: Schema.optional(Schema.Trim.pipe(Schema.nonEmptyString())),
  timestamp: Schema.optional(Schema.Trim.pipe(Schema.nonEmptyString())),
});
