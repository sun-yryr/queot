import type { DiffSheet } from "../services/diff.js";
import type { QueryResult } from "../services/query.js";
import type { ExplainParseResult } from "@sun-yryr/queot-planparser";

export type PlanMode = "explain" | "analyze";

export type RunResponse = {
  queryA: string;
  queryB: string;
  planMode: PlanMode;

  resultA?: QueryResult;
  resultB?: QueryResult;
  errorA?: string;
  errorB?: string;

  diff?: DiffSheet;
  hasDiffChanges?: boolean;

  planQueryResultA?: QueryResult;
  planQueryResultB?: QueryResult;
  planResultA?: ExplainParseResult;
  planResultB?: ExplainParseResult;
  planErrorA?: string;
  planErrorB?: string;

  planDiff?: DiffSheet;
};

export type HistoryEntry = {
  id: string;
  timestamp: string; // ISO8601
  request: {
    queryA: string;
    queryB: string;
    planMode: PlanMode;
  };
  response: RunResponse;
};

export type HistorySummary = {
  id: string;
  timestamp: string; // ISO8601
  queryA: string;
  queryB: string;
  planMode: PlanMode;
  hasError: boolean;
  hasDiffChanges?: boolean;
};

export type HistoriesResponse = {
  items: HistorySummary[];
};

export type HistoryDetailResponse = {
  item?: HistoryEntry;
};
