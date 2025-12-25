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
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(Serve);

    // env は起動時に1回だけ読む（各モジュールで process.env を参照しない）
    const cfg = await loadRuntimeConfigFromEnv(process.env);

    const client = new Client({
      host: cfg.pg.host,
      port: cfg.pg.port,
      user: cfg.pg.user,
      password: cfg.pg.password,
      database: cfg.pg.database,
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
