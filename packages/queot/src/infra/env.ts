import { Context, Layer } from "effect";

export class Env extends Context.Tag("Env")<
  Env,
  {
    get: (name: string) => string | undefined;
  }
>() {}

export function EnvLive(env: NodeJS.ProcessEnv) {
  return Layer.succeed(Env, {
    get: (name) => env[name],
  });
}
