import * as path from 'path'
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
export function createWorkspace(command: 'preview') {
  return addLibreToWorkspace(
    WS.createWorkspace({
      name: command,
      cache: {
        version: '7',
      },
    })
  )
}

/**
 * Add the libre cli to the workspace, ready to use.
 */
export function addLibreToWorkspace<T extends {}>(
  ws: T
): T & { libre: ReturnType<typeof createLibreRunner> } {
  beforeAll(async () => {
    // @ts-ignore
    ws.libre = createLibreRunner({ cwd: ws.dir.path })
  })

  return ws as T & { libre: ReturnType<typeof createLibreRunner> }
}

/**
 * Certain parts of libre output are highly dynamic, making it difficult to
 * snapshot. This function strips out those dynamic parts.
 */
function sanitizeResultForSnap(result: RunLibreResult): void {
  const shortSHAPattern = /\(.{7}\)/g
  result.stderr = result.stderr!.replace(shortSHAPattern, '(__SHORT_SHA__)')
  result.stdout = result.stdout!.replace(shortSHAPattern, '(__SHORT_SHA__)')
}

export type RunLibreResult = Omit<proc.SuccessfulRunResult, 'command'> & {
  stderr: string
}

const createLibreRunner = (optionsBase?: proc.RunOptions) => (
  command: string,
  options?: proc.RunOptions
): Promise<RunLibreResult> => {
  const mergedOptions = { ...optionsBase, ...options }
  // TODO Why is the extra `../` needed...
  const pathToProject =
    '../' +
    path.relative(
      (mergedOptions as any)['cwd'] || '.',
      path.join(__dirname, '../..')
    )
  // console.log(pathToProject)
  return proc
    .run(
      `${pathToProject}/node_modules/.bin/ts-node --project ${pathToProject}/tsconfig.json ${pathToProject}/src/main ${command}`,
      mergedOptions
    )
    .then(result => {
      delete result.command
      sanitizeResultForSnap(result as RunLibreResult)
      return result as RunLibreResult // force TS to ignore the stderr: null possibility
    })
}

export { createLibreRunner }
