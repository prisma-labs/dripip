import { format } from 'util'
import { Octokit } from '@octokit/rest'
import * as proc from '../../src/lib/proc'
import * as WS from '../__lib/workspace'

/**
 * Reset the environment before each test, allowing each test to modify it to
 * its needs.
 */
export function resetEnvironmentBeforeEachTest() {
  const originalEnvironment = Object.assign({}, process.env)
  beforeEach(() => {
    process.env = Object.assign({}, originalEnvironment)
  })
}

/**
 * Helper for creating a specialized workspace
 */
export function createContext(name: string) {
  const ws = addOctokitToWorkspace(
    addDripipToWorkspace(
      WS.createWorkspace({
        name: name,
        repo: 'git@github.com:prisma-labs/dripip-system-tests.git',
        cache: {
          version: '8',
        },
      })
    )
  )

  resetEnvironmentBeforeEachTest()

  beforeEach(async () => {
    await Promise.all([
      ws.fs.writeAsync('package.json', {
        name: 'test-app',
        license: 'MIT',
      }),
    ])
    await ws.git.add('package.json')
    await ws.git.commit('chore: add package.json')
  })

  return ws
}

// any https://github.com/octokit/rest.js/issues/1624
export function addOctokitToWorkspace<T>(ws: T): T & { octokit: any } {
  beforeAll(() => {
    // @ts-ignore
    ws.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    })
  })

  // @ts-ignore
  return ws
}

/**
 * Add the dripip cli to the workspace, ready to use.
 */
export function addDripipToWorkspace<T extends {}>(
  ws: T
): T & {
  dripip: ReturnType<typeof createDripipRunner>
  dripipRunString: string
} {
  beforeAll(() => {
    // @ts-ignore
    ws.dripip = createDripipRunner(ws.dir.path, ws.dir.pathRelativeToSource)
    // @ts-ignore
    ws.dripipRunString = createDripipRunString(ws.dir.pathRelativeToSource)
  })

  // @ts-ignore
  return ws
}

/**
 * Certain parts of dripip output are highly dynamic, making it difficult to
 * snapshot. This function strips out those dynamic parts.
 */
function sanitizeResultForSnap(result: RunDripipResult): void {
  const shortSHAPattern = /\(.{7}\)/g
  result.stderr = result.stderr!.replace(shortSHAPattern, '(__SHORT_SHA__)')
  result.stdout = result.stdout!.replace(shortSHAPattern, '(__SHORT_SHA__)')
}

export type RunDripipResult = Omit<proc.SuccessfulRunResult, 'command'> & {
  stderr: string
}

type DripipRunnerOptions = proc.RunOptions & {
  /**
   * Return the raw proc result
   *
   * @default false
   */
  raw?: boolean
  /**
   * Work with stderr instead of stdout.
   */
  error?: boolean
  replacements?: [RegExp, string][]
}

function createDripipRunString(pathToProject: string) {
  return `${pathToProject}/node_modules/.bin/ts-node --project ${pathToProject}/tsconfig.json ${pathToProject}/src/cli/main`
}

function createDripipRunner(cwd: string, pathToProject: string) {
  // prettier-ignore
  return (command: string, optsLocal?: DripipRunnerOptions): Promise<Record<string, any> | RunDripipResult> => {
    const opts:any = { ...optsLocal, cwd }

    //@ts-ignore
    // prettier-ignore
    const runString = `${createDripipRunString(pathToProject)} ${command} --json`
    return proc.run(runString, opts).then(result => {
      if (opts.raw === true) {
        // TODO not used/helpful...?
        sanitizeResultForSnap(result as RunDripipResult)
        return result as RunDripipResult // force TS to ignore the stderr: null possibility
      }

      const content = opts.error === true ? result.stderr ?? '' : result.stdout ?? ''
      let contentSanitized = content.replace(/"sha": *"[^"]+"/g, '"sha": "__dynamic_content__"')
      
      opts.replacements?.forEach(([pattern, replacement]:any) => {
        contentSanitized = content.replace(pattern, replacement)
      })

      try {
        // TODO typed response...
        return JSON.parse(contentSanitized) as Record<string, any>
      } catch (e) {
        throw new Error(
          `Something went wrong while trying to JSON parse the dripip cli stdout:\n\n${
            e.stack
          }\n\nThe underlying cli result was:\n\n${format(result)}`
        )
      }
    })
  }
}

export { createDripipRunner }
