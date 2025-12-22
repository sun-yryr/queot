import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createReadStream } from "node:fs";
import readline from "node:readline";
import { randomUUID } from "node:crypto";
import { diffHasChanges } from "../services/diff.js";
import type {
  HistoryEntry,
  HistorySummary,
  PlanMode,
  RunResponse,
} from "../routes/types.js";

export function getHistoryPath(): string {
  const env = process.env.QUEOT_HISTORY_PATH;
  if (env && env.trim().length > 0) return env;

  const configHome =
    process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config");
  return path.join(configHome, "queot", "history.jsonl");
}

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

export async function appendHistory(entry: HistoryEntry): Promise<void> {
  const p = getHistoryPath();
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.appendFile(p, `${JSON.stringify(entry)}\n`, "utf8");
}

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

export async function readHistorySummaries(opts?: {
  limit?: number;
  id?: string;
  timestamp?: string;
}): Promise<HistorySummary[]> {
  const p = getHistoryPath();
  const limit = clampInt(opts?.limit ?? 50, 1, 200);
  const id = opts?.id?.trim() || undefined;
  const timestamp = opts?.timestamp?.trim() || undefined;

  await fs.stat(p).catch(() => undefined);

  // 最新N件だけ欲しいケースが多いので、リングバッファで保持する
  const buf: HistorySummary[] = [];

  try {
    for await (const line of readLines(p)) {
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
}

export async function readHistoryById(
  id: string,
): Promise<HistoryEntry | undefined> {
  const p = getHistoryPath();
  const needle = id.trim();
  if (!needle) return undefined;

  await fs.stat(p).catch(() => undefined);

  let found: HistoryEntry | undefined = undefined;
  try {
    for await (const line of readLines(p)) {
      const entry = parseEntry(line);
      if (!entry) continue;
      if (entry.id === needle) found = entry;
    }
  } catch {
    return undefined;
  }
  return found;
}
