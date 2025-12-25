import fs from "node:fs/promises";
import path from "node:path";
import { createReadStream } from "node:fs";
import readline from "node:readline";
import { randomUUID } from "node:crypto";
import { Context, Effect, Layer } from "effect";
import { diffHasChanges } from "../services/diff.js";
import { RuntimeConfig, type RuntimeConfigService } from "./config.js";
import type {
  HistoryEntry,
  HistorySummary,
  PlanMode,
  RunResponse,
} from "../routes/types.js";

export class HistoryStore extends Context.Tag("HistoryStore")<
  HistoryStore,
  {
    getHistoryPath: Effect.Effect<string>;
    appendHistory: (entry: HistoryEntry) => Effect.Effect<void>;
    readHistorySummaries: (opts?: {
      limit?: number;
      id?: string;
      timestamp?: string;
    }) => Effect.Effect<HistorySummary[]>;
    readHistoryById: (id: string) => Effect.Effect<HistoryEntry | undefined>;
  }
>() {}

function clampInt(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, Math.trunc(v)));
}

function toSummary(entry: HistoryEntry): HistorySummary {
  const qA = entry.request.queryA ?? entry.response.queryA ?? "";
  const qB = entry.request.queryB ?? entry.response.queryB ?? "";
  const hasBothResults = Boolean(
    entry.response.resultA && entry.response.resultB,
  );

  // 期待仕様:
  // - A/B片側しかなく diff が取れない場合は true（= 要確認）
  // - diff がある場合は true
  // - diff がない場合は false
  const hasDiffChanges =
    typeof entry.response.hasDiffChanges === "boolean"
      ? entry.response.hasDiffChanges
      : hasBothResults
        ? diffHasChanges(entry.response.diff ?? entry.response.planDiff)
        : qA.trim().length > 0 || qB.trim().length > 0
          ? true
          : undefined;
  return {
    id: entry.id,
    timestamp: entry.timestamp,
    queryA: qA,
    queryB: qB,
    planMode: entry.request.planMode,
    hasError: Boolean(entry.response.errorA || entry.response.errorB),
    hasDiffChanges,
  };
}

export function newHistoryEntry(args: {
  queryA: string;
  queryB: string;
  planMode: PlanMode;
  response: RunResponse;
}): HistoryEntry {
  return {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    request: {
      queryA: args.queryA,
      queryB: args.queryB,
      planMode: args.planMode,
    },
    response: args.response,
  };
}

async function trimHistoryIfNeeded(
  p: string,
  retention: { maxEntries: number; maxBytes: number },
): Promise<void> {
  const { maxBytes, maxEntries } = retention;
  const st = await fs.stat(p).catch(() => undefined);
  if (!st) return;
  if (st.size <= maxBytes) return;

  // 最新maxEntries行だけ残す
  const buf: string[] = [];
  for await (const line of readLines(p)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    buf.push(trimmed);
    if (buf.length > maxEntries) buf.shift();
  }

  const tmp = `${p}.tmp-${randomUUID()}`;
  await fs.writeFile(tmp, `${buf.join("\n")}\n`, "utf8");
  await fs.rename(tmp, p);
}

export function makeHistoryStore(cfg: RuntimeConfigService) {
  const retention = {
    // 大きくなりすぎた時だけ compact して「最新N件」を残す（通常時は append のみで高速）
    maxEntries: cfg.history.historyMaxEntries,
    maxBytes: cfg.history.historyMaxBytes,
  };
  const historyPath = cfg.history.historyPath;

  return {
    getHistoryPath: Effect.succeed(historyPath),
    appendHistory: (entry: HistoryEntry) =>
      Effect.tryPromise({
        try: async () => {
          await fs.mkdir(path.dirname(historyPath), { recursive: true });
          await fs.appendFile(
            historyPath,
            `${JSON.stringify(entry)}\n`,
            "utf8",
          );
          // best-effort: 履歴肥大化時に古いものから削除（失敗しても本処理は壊さない）
          try {
            await trimHistoryIfNeeded(historyPath, retention);
          } catch {
            // ignore
          }
        },
        catch: (e) => (e instanceof Error ? e : new Error(String(e))),
      }).pipe(Effect.orDie),
    readHistorySummaries: (opts?: {
      limit?: number;
      id?: string;
      timestamp?: string;
    }) =>
      Effect.tryPromise({
        try: async () => {
          const limit = clampInt(opts?.limit ?? 50, 1, 200);
          const id = opts?.id?.trim() || undefined;
          const timestamp = opts?.timestamp?.trim() || undefined;

          await fs.stat(historyPath).catch(() => undefined);

          // 最新N件だけ欲しいケースが多いので、リングバッファで保持する
          const buf: HistorySummary[] = [];

          try {
            for await (const line of readLines(historyPath)) {
              const entry = parseEntry(line);
              if (!entry) continue;
              if (id && entry.id !== id) continue;
              if (timestamp && entry.timestamp !== timestamp) continue;
              buf.push(toSummary(entry));
              if (!id && !timestamp && buf.length > limit) buf.shift();
            }
          } catch {
            // file not found / read error → empty
            return [];
          }

          // 新しい順で返す
          return buf.reverse().slice(0, limit);
        },
        catch: (e) => (e instanceof Error ? e : new Error(String(e))),
      }).pipe(Effect.orDie),
    readHistoryById: (id: string) =>
      Effect.tryPromise({
        try: async () => {
          const needle = id.trim();
          if (!needle) return undefined;

          await fs.stat(historyPath).catch(() => undefined);

          let found: HistoryEntry | undefined = undefined;
          try {
            for await (const line of readLines(historyPath)) {
              const entry = parseEntry(line);
              if (!entry) continue;
              if (entry.id === needle) found = entry;
            }
          } catch {
            return undefined;
          }
          return found;
        },
        catch: (e) => (e instanceof Error ? e : new Error(String(e))),
      }).pipe(Effect.orDie),
  };
}

export const HistoryStoreLive = Layer.effect(
  HistoryStore,
  Effect.gen(function* () {
    const cfg = yield* RuntimeConfig;
    return makeHistoryStore(cfg);
  }),
);

async function* readLines(p: string): AsyncGenerator<string> {
  const stream = createReadStream(p, { encoding: "utf8" });
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  });
  try {
    for await (const line of rl) {
      yield line;
    }
  } finally {
    rl.close();
    stream.destroy();
  }
}

function parseEntry(line: string): HistoryEntry | undefined {
  const trimmed = line.trim();
  if (!trimmed) return undefined;
  try {
    const v = JSON.parse(trimmed) as unknown as Partial<HistoryEntry>;
    if (!v || typeof v !== "object") return undefined;
    if (typeof v.id !== "string") return undefined;
    if (typeof v.timestamp !== "string") return undefined;
    const req = (v.request ?? {}) as Record<string, unknown>;
    const planMode: PlanMode =
      req.planMode === "analyze" ? "analyze" : "explain";
    return {
      id: v.id,
      timestamp: v.timestamp,
      request: {
        queryA: typeof req.queryA === "string" ? req.queryA : "",
        queryB: typeof req.queryB === "string" ? req.queryB : "",
        planMode,
      },
      response: (v.response ?? {}) as RunResponse,
    };
  } catch {
    return undefined;
  }
}
