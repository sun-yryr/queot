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

export default class Serve extends Command {
  static override args = {};
  static override description = "describe the command here";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    port: Flags.integer({
      char: "p",
      description: "port to listen on",
      default: 3000,
    }),
    dbHost: Flags.string({
      char: "h",
      aliases: ["host"],
      description: "host to connect to Database",
      default: "localhost",
    }),
    dbPort: Flags.integer({
      char: "P",
      aliases: ["port"],
      description: "port to connect to Database",
      default: 5432,
    }),
    dbUser: Flags.string({
      char: "u",
      aliases: ["user"],
      description: "user to connect to Database",
      default: "postgres",
    }),
    dbDatabase: Flags.string({
      char: "d",
      aliases: ["database"],
      description: "database to connect to Database",
      default: "postgres",
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(Serve);

    // env は起動時に1回だけ読む（各モジュールで process.env を参照しない）
    const cfg = await loadRuntimeConfigFromEnv(process.env);

    let dbPassword = process.env.DBPASSWORD;
    if (!dbPassword) {
      dbPassword = await password({
        message: "password > ",
        mask: true,
      });
    }

    const client = new Client({
      host: flags.dbHost,
      port: flags.dbPort,
      user: flags.dbUser,
      password: dbPassword,
      database: flags.dbDatabase,
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
      port: flags.port,
    });

    process.on("SIGINT", () => {
      server.close();
      void client.end();
    });
    process.on("SIGTERM", () => {
      server.close();
      void client.end();
    });

    this.log(`Server is running on port ${flags.port}\nPress Ctrl+C to exit`);

    if (!settings.debug) {
      await open(`http://localhost:${flags.port}`);
    }
  }
}
