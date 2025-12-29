import { Command, Flags, settings } from "@oclif/core";
import { createApp } from "../server.js";
import { serve } from "@hono/node-server";
import { Context } from "effect";
import { RuntimeConfig, loadRuntimeConfigFromEnv } from "../infra/config.js";
import { HistoryStore, makeHistoryStore } from "../infra/history.js";
import { Client } from "pg";
import { makePgQueryable } from "../infra/postgres/queryable.js";
import { Queryable } from "../services/query.js";
import open from "open";
import { password } from "@inquirer/prompts";
import type { AddressInfo } from "node:net";

function getPortFromServerAddress(
  addr: string | AddressInfo | null,
): number | null {
  if (!addr) return null;
  if (typeof addr === "string") return null;
  return addr.port;
}

export default class Serve extends Command {
  static override args = {};
  static override summary =
    "PostgreSQL に接続し、queot のWeb UIサーバーを起動します。";
  static override description = `パスワードは起動時にプロンプトから入力します。 DBPASSWORD 環境変数で渡すことも可能です。`;
  static override examples = [
    "$ <%= config.bin %> <%= command.id %>",
    "$ <%= config.bin %> <%= command.id %> --db-name demo",
    "$ DBPASSWORD=**** <%= config.bin %> <%= command.id %> --db-name demo",
    "$ <%= config.bin %> <%= command.id %> --db-name demo --listen-port 3000",
  ];
  static override flags = {
    "db-host": Flags.string({
      description: "host to connect to Database",
      char: "h",
      default: "localhost",
      helpValue: "<hostname/IP address>",
    }),
    "db-port": Flags.integer({
      char: "p",
      description: "port to connect to Database",
      default: 5432,
      helpValue: "<port number>",
    }),
    "db-username": Flags.string({
      char: "u",
      description: "user to connect to Database",
      default: "postgres",
      helpValue: "<username>",
    }),
    "db-name": Flags.string({
      char: "d",
      description: "database to connect to Database",
      default: "postgres",
      helpValue: "<database name>",
    }),
    "listen-port": Flags.integer({
      char: "l",
      description: "port to listen on (default: auto select an available port)",
      helpValue: "<port number>",
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(Serve);

    // env は起動時に1回だけ読む（各モジュールで process.env を参照しない）
    const cfg = await loadRuntimeConfigFromEnv(process.env);

    const listenPort = flags["listen-port"];
    const dbHost = flags["db-host"];
    const dbPort = flags["db-port"];
    const dbUser = flags["db-username"];
    const dbDatabase = flags["db-name"];

    let dbPassword = process.env.DBPASSWORD;
    if (!dbPassword) {
      dbPassword = await password({
        message: "password > ",
        mask: true,
      });
    }

    const client = new Client({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbDatabase,
    });
    await client.connect();

    const queryable = makePgQueryable(client);
    const historyStore = makeHistoryStore(cfg);

    const context = Context.empty().pipe(
      Context.add(RuntimeConfig, cfg),
      Context.add(Queryable, queryable),
      Context.add(HistoryStore, historyStore),
    );

    const app = createApp({
      context,
      isProduction: cfg.nodeEnv === "production",
    });
    const server = serve({
      fetch: app.fetch,
      port: listenPort ?? 0,
    });
    const actualPort =
      getPortFromServerAddress(server.address()) ?? listenPort ?? 0;

    process.on("SIGINT", () => {
      server.close();
      void client.end();
    });
    process.on("SIGTERM", () => {
      server.close();
      void client.end();
    });

    this.log(
      `サーバーはポート ${actualPort} で起動しています\n終了するには Ctrl+C を押してください`,
    );

    if (!settings.debug) {
      await open(`http://localhost:${actualPort}`);
    }
  }
}
