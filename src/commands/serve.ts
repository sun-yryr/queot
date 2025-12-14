import {Args, Command, Flags} from '@oclif/core'
import { createApp } from '../server.js'
import { serve } from '@hono/node-server'

export default class Serve extends Command {
  static override args = {
    file: Args.string({description: 'file to read'}),
  }
  static override description = 'describe the command here'
  static override examples = [
    '<%= config.bin %> <%= command.id %>',
  ]
  static override flags = {
    port: Flags.integer({char: 'p', description: 'port to listen on', default: 3000}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(Serve)

    const name = flags.name ?? 'world'
    this.log(`hello ${name} from /Users/sun-yryr/.ghr/github.com/sun-yryr/difql/src/commands/serve.ts`)
    const app = createApp();

    const server = serve({
      fetch: app.fetch,
      port: flags.port,
    })

    process.on('SIGINT', () => {
      server.close();
    });
    process.on('SIGTERM', () => {
      server.close();
    });

    this.log(`Server is running on port ${flags.port}\nPress Ctrl+C to exit`);
  }
}
