import { spawn,SpawnOptions } from 'child_process'
import { stripIndent } from 'common-tags'
import * as Path from 'path'

export type SuccessfulRunResult = {
  command: string
  stderr: null | string // present if stdio using pipe mode
  stdout: null | string // present if stdio using pipe mode
  signal: null | string
  exitCode: null | number // present if optional (non-throw) mode
  error: null | Error // present if optional (non-throw) mode
}

export type RunOptions = SpawnOptions & {
  envAdditions?: Record<string, string | undefined>
  require?: boolean
}

/**
 * A wrapper around spawn, easier to use.
 */
export async function run(commandRaw: string, options?: RunOptions): Promise<SuccessfulRunResult> {
  const command = parseCommandString(commandRaw)
  const env = options?.envAdditions ? { ...process.env, ...options.envAdditions } : process.env

  const child = spawn(command.name, command.args, {
    ...options,
    env,
  })

  // TODO use proper signal typing, see child exit cb types
  const result = await new Promise<SuccessfulRunResult>((resolve, reject) => {
    // NOTE "exit" may fire after "error", in which case it will be a noop
    // as per how promises work.

    // When spawn is executed in pipe mode, then we buffer up the data for
    // later inspection
    // TODO return type should use conditional types to express mapping
    // between stdio option settings and resulting returned std err/out buffers.
    let stderr: null | string = null
    let stdout: null | string = null

    if (child.stderr) {
      stderr = ``
      child.stderr.on(`data`, bufferStderr)
    }

    if (child.stdout) {
      stdout = ``
      child.stdout.on(`data`, bufferStdout)
    }

    function bufferStderr(chunk: any) {
      stderr += String(chunk)
    }

    function bufferStdout(chunk: any) {
      stdout += String(chunk)
    }

    child.once(`error`, (error) => {
      const richError = createCommandError({
        command: commandRaw,
        underlyingError: error,
        stderr,
        stdout,
        signal: null,
        exitCode: null,
      })

      if (options?.require === true) {
        cleanup()
        reject(richError)
      } else {
        cleanup()
        resolve({
          command: commandRaw,
          stdout,
          stderr,
          signal: null,
          error: richError,
          exitCode: null,
        })
      }
    })

    child.once(`exit`, (exitCode, signal) => {
      const error = isFailedExitCode(exitCode)
        ? createCommandError({
            command: commandRaw,
            underlyingError: null,
            signal,
            stderr,
            stdout,
            exitCode,
          })
        : null

      if (options?.require === true && isFailedExitCode(exitCode)) {
        cleanup()
        reject(error)
      } else {
        cleanup()
        resolve({
          command: commandRaw,
          signal,
          stderr,
          stdout,
          exitCode,
          error,
        })
      }
    })

    function cleanup() {
      child.stderr?.removeListener(`data`, bufferStderr)
      child.stdout?.removeListener(`data`, bufferStdout)
    }
  })

  return result
}

/**
 * Util that binds a command to run making it easy to abstract a parent command.
 *
 * @example
 *
 *    const git = createRunner('git')
 *    const result = await git('status')
 */
export const createRunner = (cwd: string): typeof run => {
  return (cmd, opts) => {
    return run(cmd, { ...opts, cwd })
  }
}

/**
 * Create an error enriched with properties related to the run result.
 */
function createCommandError({
  command,
  signal,
  stderr,
  stdout,
  exitCode,
  underlyingError,
}: Omit<SuccessfulRunResult, `error`> & {
  underlyingError: null | Error
}): Error {
  const error = new Error(stripIndent`
    The following command failed to complete successfully:

        ${command}

    It ended with this exit code:

        ${exitCode}

    This underlying error occurred (null = none occurred):

        ${underlyingError}

    It received signal (null = no signal received):

        ${signal}

    It output on stderr (null = not spawned in pipe mode):

        ${stderr}

    It output on stdout (null = not spawned in pipe mode):

        ${stdout}
  `)
  // @ts-ignore
  error.exitCode = exitCode
  // @ts-ignore
  error.signal = signal
  // @ts-ignore
  error.stderr = stderr
  // @ts-ignore
  error.stdout = stdout
  return error
}

/**
 * Convert a command string into something the standard lib child process module
 * APIs will accept.
 */
function parseCommandString(cmd: string): { name: string; args: string[] } {
  const [name, ...args] = cmd.split(` `)

  return {
    name: name!,
    args,
  }
}

/**
 * Is the given exit code a failure or success? Intended for internal use,
 * handles null which is convenient for this module.
 */
function isFailedExitCode(exitCode: null | number): boolean {
  return typeof exitCode === `number` && exitCode !== 0
}

/**
 * Check if this process was created from the bin of the given project or not.
 * @param packageJsonPath
 */
export function isProcessFromProjectBin(packageJsonPath: string): boolean {
  const processBinPath = process.argv[1]!
  const processBinDirPath = Path.dirname(processBinPath)
  const projectBinDirPath = Path.join(Path.dirname(packageJsonPath), `node_modules/.bin`)
  return processBinDirPath !== projectBinDirPath
}

/**
 * Log a meaningful semantic error message sans stack track and then crash
 * the program with exit code 1. Parameters are a passthrough to `console.error`.
 */
export function fatal(format: string, ...vars: unknown[]): never {
  console.error(format, ...vars)
  process.exit(1)
}
