import { Args, Command, Flags, settings } from "@oclif/core";
import { createApp } from "../server.js";
import { serve } from "@hono/node-server";
import { createPgClientFromEnv } from "../infra/postgres/client.js";
import { makePgQueryable } from "../infra/postgres/queryable.js";
import { initRuntimeEnv } from "../infra/config.js";
import open from "open";

export default class Serve extends Command {
  static override args = {
    file: Args.string({ description: "file to read" }),
  };
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
    // env は起動時に1回だけ読む（各モジュールで process.env を参照しない）
    initRuntimeEnv(process.env);

    const { flags } = await this.parse(Serve);

    const client = createPgClientFromEnv();
    await client.connect();

    const queryable = makePgQueryable(client);

    const app = createApp({ queryable });
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
