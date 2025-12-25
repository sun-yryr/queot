import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { Context, Effect, Layer, Schema } from "effect";
import { Env } from "./env.js";

export type QueotConfig = {
  historyPath?: string;
  historyMaxEntries?: number;
  historyMaxBytes?: number;
};

export type ResolvedHistoryConfig = Required<
  Pick<QueotConfig, "historyPath" | "historyMaxEntries" | "historyMaxBytes">
>;

export type PgConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

export type RuntimeConfigService = {
  history: ResolvedHistoryConfig;
  pg: PgConfig;
  nodeEnv?: string;
};

export class RuntimeConfig extends Context.Tag("RuntimeConfig")<
  RuntimeConfig,
  RuntimeConfigService
>() {}

const NonNegativeInt = Schema.Number.pipe(Schema.int(), Schema.nonNegative());

const QueotConfigFileSchema = Schema.Struct({
  historyPath: Schema.optional(Schema.Trim.pipe(Schema.nonEmptyString())),
  historyMaxEntries: Schema.optional(NonNegativeInt),
  historyMaxBytes: Schema.optional(NonNegativeInt),
});

function clampInt(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, Math.trunc(v)));
}

function getConfigHome(env: Context.Tag.Service<typeof Env>): string {
  const xdg = env.get("XDG_CONFIG_HOME")?.trim();
  if (xdg && xdg.length > 0) return xdg;
  return path.join(os.homedir(), ".config");
}

export function getQueotConfigPath(
  env: Context.Tag.Service<typeof Env>,
): string {
  return path.join(getConfigHome(env), "queot", "config.json");
}

function loadQueotConfig(
  env: Context.Tag.Service<typeof Env>,
): Effect.Effect<QueotConfig, never> {
  const p = getQueotConfigPath(env);
  return Effect.tryPromise({
    try: async () => {
      const raw = await fs.readFile(p, "utf8");
      const json = JSON.parse(raw) as unknown;
      const decoded = Schema.decodeUnknownEither(QueotConfigFileSchema)(json);
      if (decoded._tag === "Left") return {};
      return decoded.right;
    },
    catch: (e) => (e instanceof Error ? e : new Error(String(e))),
  }).pipe(Effect.catchAll(() => Effect.succeed({})));
}

function parseEnvNonNegativeInt(
  env: Context.Tag.Service<typeof Env>,
  name: string,
): number | undefined {
  const raw = env.get(name);
  if (!raw) return undefined;
  try {
    return Schema.decodeUnknownSync(
      Schema.NumberFromString.pipe(Schema.int(), Schema.nonNegative()),
    )(raw);
  } catch {
    return undefined;
  }
}

function parseEnvNonEmptyString(
  env: Context.Tag.Service<typeof Env>,
  name: string,
): string | undefined {
  const raw = env.get(name);
  if (!raw) return undefined;
  try {
    return Schema.decodeUnknownSync(Schema.Trim.pipe(Schema.nonEmptyString()))(
      raw,
    );
  } catch {
    return undefined;
  }
}

function resolveHistoryConfig(
  env: Context.Tag.Service<typeof Env>,
  cfg: QueotConfig,
): ResolvedHistoryConfig {
  const historyPath =
    parseEnvNonEmptyString(env, "QUEOT_HISTORY_PATH") ??
    cfg.historyPath ??
    path.join(getConfigHome(env), "queot", "history.jsonl");

  const historyMaxEntriesRaw =
    parseEnvNonNegativeInt(env, "QUEOT_HISTORY_MAX_ENTRIES") ??
    cfg.historyMaxEntries ??
    500;
  const historyMaxBytesRaw =
    parseEnvNonNegativeInt(env, "QUEOT_HISTORY_MAX_BYTES") ??
    cfg.historyMaxBytes ??
    5 * 1024 * 1024;

  return {
    historyPath,
    historyMaxEntries: clampInt(historyMaxEntriesRaw, 1, 50_000),
    historyMaxBytes: clampInt(historyMaxBytesRaw, 1, 1024 * 1024 * 1024),
  };
}

function resolvePgConfig(env: Context.Tag.Service<typeof Env>): PgConfig {
  const host = env.get("PGHOST") ?? "localhost";
  const port = (() => {
    const raw = env.get("PGPORT");
    if (!raw) return 5432;
    try {
      return Schema.decodeUnknownSync(
        Schema.NumberFromString.pipe(Schema.int()),
      )(raw);
    } catch {
      return 5432;
    }
  })();
  const user = env.get("PGUSER") ?? "postgres";
  const password = env.get("PGPASSWORD") ?? "example";
  const database = env.get("PGDATABASE") ?? "postgres";
  return { host, port, user, password, database };
}

export const RuntimeConfigLive = Layer.effect(
  RuntimeConfig,
  Effect.gen(function* () {
    const env = yield* Env;
    const cfg = yield* loadQueotConfig(env);
    return {
      history: resolveHistoryConfig(env, cfg),
      pg: resolvePgConfig(env),
      nodeEnv: env.get("NODE_ENV"),
    };
  }),
);

/**
 * 起動時に1回だけ `process.env` を読む用途。
 * - Effect/Layer を使わずに `RuntimeConfig` のサービス値だけ欲しいケース（CLI起動など）向け
 */
export async function loadRuntimeConfigFromEnv(
  env: NodeJS.ProcessEnv,
): Promise<RuntimeConfigService> {
  const envSvc: Context.Tag.Service<typeof Env> = {
    get: (name) => env[name],
  };
  const cfg = await Effect.runPromise(loadQueotConfig(envSvc));
  return {
    history: resolveHistoryConfig(envSvc, cfg),
    pg: resolvePgConfig(envSvc),
    nodeEnv: envSvc.get("NODE_ENV"),
  };
}
