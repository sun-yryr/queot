import { Client } from "pg";

/**
 * 環境変数からPostgres接続情報を組み立てて `pg` の Client を作る。
 */
export function createPgClientFromEnv(): Client {
  return new Client({
    host: process.env.PGHOST ?? "localhost",
    port: Number(process.env.PGPORT ?? "5432"),
    user: process.env.PGUSER ?? "postgres",
    password: process.env.PGPASSWORD ?? "example",
  });
}
