import * as path from 'path'
import * as proc from '../../src/lib/proc'

export function addLibreToWorkspace<T extends {}>(
  ws: T
): T & { libre: ReturnType<typeof createLibreRunner> } {
  beforeAll(async () => {
    // @ts-ignore
    ws.libre = createLibreRunner({ cwd: ws.dir.path })
  })

  return ws as T & { libre: ReturnType<typeof createLibreRunner> }
}

const createLibreRunner = (optionsBase?: proc.RunOptions) => (
  command: string,
  options?: proc.RunOptions
): Promise<Omit<proc.SuccessfulRunResult, 'command'>> => {
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
      return result
    })
}

export { createLibreRunner }
