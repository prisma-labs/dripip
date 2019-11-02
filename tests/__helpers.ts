import { spawnSync } from "child_process"

type RunResult = { stderr: string; stdout: string; status: null | number }

export function run(command: string): RunResult {
  const [name, ...args] = command.split(" ")
  const { stderr, stdout, status } = spawnSync(name, args, { encoding: "utf8" })
  return { stderr, stdout, status }
}
