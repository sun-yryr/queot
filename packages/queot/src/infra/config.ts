import os from "node:os";
import path from "node:path";
import fs from "node:fs";

export type QueotConfig = {
  historyPath?: string;
  historyMaxEntries?: number;
  historyMaxBytes?: number;
};

type EnvSnapshot = Record<string, string | undefined>;
let envSnapshot: EnvSnapshot | undefined;

function clampInt(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, Math.trunc(v)));
}

/**
 * env は「起動時に1回だけ読む」前提。
 * ここに渡した値だけを以後参照する（各モジュールで process.env を参照しない）。
 */
export function initRuntimeEnv(env: NodeJS.ProcessEnv): void {
  envSnapshot = { ...env };
  cached = undefined;
}

function getEnv(name: string): string | undefined {
  return envSnapshot?.[name];
}

function getConfigHome(): string {
  const xdg = getEnv("XDG_CONFIG_HOME")?.trim();
  if (xdg && xdg.length > 0) return xdg;
  return path.join(os.homedir(), ".config");
}

export function getQueotConfigPath(): string {
  return path.join(getConfigHome(), "queot", "config.json");
}

function toNonNegativeInt(v: unknown): number | undefined {
  if (typeof v !== "number") return undefined;
  if (!Number.isFinite(v)) return undefined;
  const t = Math.trunc(v);
  if (t < 0) return undefined;
  return t;
}

function toNonEmptyString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s.length > 0 ? s : undefined;
}

let cached: QueotConfig | undefined;

/**
 * `$XDG_CONFIG_HOME/queot/config.json`（無ければ `$HOME/.config/queot/config.json`）を読む。
 * - 無い/壊れている場合は `{}` を返す
 * - 値は最低限の型チェックだけして取り込む
 */
export function getQueotConfig(): QueotConfig {
  if (cached) return cached;

  const p = getQueotConfigPath();
  try {
    const raw = fs.readFileSync(p, "utf8");
    const json = JSON.parse(raw) as unknown;
    if (!json || typeof json !== "object") {
      cached = {};
      return cached;
    }
    const obj = json as Record<string, unknown>;
    cached = {
      historyPath: toNonEmptyString(obj.historyPath),
      historyMaxEntries: toNonNegativeInt(obj.historyMaxEntries),
      historyMaxBytes: toNonNegativeInt(obj.historyMaxBytes),
    };
    return cached;
  } catch {
    cached = {};
    return cached;
  }
}

function parseEnvNonNegativeInt(name: string): number | undefined {
  const raw = getEnv(name);
  if (!raw) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  const t = Math.trunc(n);
  if (t < 0) return undefined;
  return t;
}

function parseEnvNonEmptyString(name: string): string | undefined {
  const raw = getEnv(name);
  if (!raw) return undefined;
  const s = raw.trim();
  return s.length > 0 ? s : undefined;
}

export function getResolvedHistoryConfig(): Required<
  Pick<QueotConfig, "historyPath" | "historyMaxEntries" | "historyMaxBytes">
> {
  const cfg = getQueotConfig();
  const historyPath =
    parseEnvNonEmptyString("QUEOT_HISTORY_PATH") ??
    cfg.historyPath ??
    path.join(getConfigHome(), "queot", "history.jsonl");

  const historyMaxEntriesRaw =
    parseEnvNonNegativeInt("QUEOT_HISTORY_MAX_ENTRIES") ??
    cfg.historyMaxEntries ??
    500;
  const historyMaxBytesRaw =
    parseEnvNonNegativeInt("QUEOT_HISTORY_MAX_BYTES") ??
    cfg.historyMaxBytes ??
    5 * 1024 * 1024;

  return {
    historyPath: historyPath,
    historyMaxEntries: clampInt(historyMaxEntriesRaw, 1, 50_000),
    historyMaxBytes: clampInt(historyMaxBytesRaw, 1, 1024 * 1024 * 1024),
  };
}
