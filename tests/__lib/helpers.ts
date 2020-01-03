import * as path from 'path'
import * as proc from '../../src/lib/proc'
import * as WS from '../__lib/workspace'
import { format } from 'util'
import Octokit from '@octokit/rest'

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
export function createWorkspace(command: 'preview' | 'stable') {
  const ws = addOctokitToworkspace(
    addDripipToWorkspace(
      WS.createWorkspace({
        name: command,
        repo: 'git@github.com:prisma-labs/system-tests-repo.git',
        cache: {
          version: '7',
        },
      })
    )
  )

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

export function addOctokitToworkspace<T>(ws: T): T & { octokit: Octokit } {
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
): T & { dripip: ReturnType<typeof createDripipRunner> } {
  beforeAll(async () => {
    // @ts-ignore
    ws.dripip = createDripipRunner({ cwd: ws.dir.path })
  })

  return ws as T & { dripip: ReturnType<typeof createDripipRunner> }
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
  raw?: boolean
}

const createDripipRunner = (optsBase?: DripipRunnerOptions) => (
  command: string,
  optsLocal?: DripipRunnerOptions
): Promise<Record<string, any> | RunDripipResult> => {
  const opts = {
    ...optsBase,
    ...optsLocal,
  }

  // TODO Why is the extra `../` needed...
  const pathToProject =
    '../' +
    path.relative((opts as any)['cwd'] || '.', path.join(__dirname, '../..'))
  // console.log(pathToProject)
  return proc
    .run(
      `${pathToProject}/node_modules/.bin/ts-node --project ${pathToProject}/tsconfig.json ${pathToProject}/src/main ${command} --json`,
      opts
    )
    .then(result => {
      if ((opts as any).raw === true) {
        // TODO remove given new json parse approach?
        delete result.command
        // TODO not used/helpful...?
        sanitizeResultForSnap(result as RunDripipResult)
        return result as RunDripipResult // force TS to ignore the stderr: null possibility
      }

      // Avoid silent confusion
      if (result.stderr) {
        console.log(
          `WARNING dripip command sent output to stderr:\n\n${result.stderr}`
        )
      }

      try {
        // TODO typed response...
        return JSON.parse(result.stdout!) as Record<string, any>
      } catch (e) {
        throw new Error(
          `Something went wrong while trying to JSON parse the dripip cli stdout:\n\n${
            e.stack
          }\n\nThe underlying cli result was:\n\n${format(result)}`
        )
      }
    })
}

export { createDripipRunner }
