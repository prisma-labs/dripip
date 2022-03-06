import { gitInitRepo, Simple } from '../../src/lib/git'
import { createRunner } from '../../src/lib/proc'
import * as jetpack from 'fs-jetpack'
import * as Path from 'path'
import createGit from 'simple-git/promise'

type Workspace = {
  dir: { path: string; pathRelativeToSource: string; cacheHit: boolean }
  run: ReturnType<typeof createRunner>
  fs: ReturnType<typeof jetpack.dir>
  git: Simple
}

type Options = {
  name: string
  repo?: string
  git?: boolean
  cache?: {
    on?: boolean
    version?: string
    includeLock?: boolean
  }
}

/**
 * Workspace creator coupled to jest.
 */
export function createWorkspace(opts: Options): Workspace {
  const ws = {} as Workspace
  // TODO track the git commit started on, then reset hard to it after each test

  beforeAll(async () => {
    Object.assign(ws, await doCreateWorkspace(opts))
    // In case of a cache hit where we manually debugged the directory or
    // somehow else it changed.
  })

  beforeEach(async () => {
    await ws.fs.removeAsync(ws.dir.path)
    await ws.fs.dirAsync(ws.dir.path)
    if (opts.git !== false) {
      if (opts.repo) {
        await ws.git.clone(opts.repo, ws.dir.path)
      } else {
        await gitInitRepo(ws.git)
      }
    }
  })

  return ws
}

// TODO if errors occur during workspace creation then the cache will be hit
// next time but actual contents not suitable for use. Make the system more robust!

/**
 * Create a generic workspace to perform work in.
 */
async function doCreateWorkspace(optsGiven: Options): Promise<Workspace> {
  //
  // Setup Dir
  //
  const opts = {
    git: true,
    ...optsGiven,
  }

  let cacheKey: string
  if (opts.cache?.on) {
    const yarnLockHash =
      opts.cache?.includeLock === true
        ? jetpack.inspect(`yarn.lock`, {
            checksum: `md5`,
          })!.md5
        : `off`
    const ver = `8`
    const testVer = opts.cache?.version ?? `off`
    const currentGitBranch = (await createGit().raw([`rev-parse`, `--abbrev-ref`, `HEAD`])).trim()
    cacheKey = `v${ver}-yarnlock-${yarnLockHash}-gitbranch-${currentGitBranch}-testv${testVer}`
  } else {
    cacheKey = Math.random().toString().slice(2)
  }

  const projectName = require(`../../package.json`).name
  const dir = {} as Workspace[`dir`]
  dir.path = `/tmp/${projectName}-integration-test-project-bases/${opts.name}-${cacheKey}`

  dir.pathRelativeToSource = `../` + Path.relative(dir.path, Path.join(__dirname, `../..`))

  if ((await jetpack.existsAsync(dir.path)) !== false) {
    dir.cacheHit = true
  } else {
    dir.cacheHit = false
    await jetpack.dirAsync(dir.path)
  }

  console.log(`cache %s for %s`, dir.cacheHit ? `hit` : `miss`, dir.path)
  const ws: any = {}

  //
  // Setup Tools
  //
  ws.dir = dir
  ws.fs = jetpack.dir(dir.path)
  ws.run = createRunner(dir.path)
  if (opts.git) {
    ws.git = createGit(dir.path)
    //
    // Setup Project (if needed, cacheable)
    //
    if (!dir.cacheHit) {
      if (opts.repo) {
        await ws.git.clone(opts.repo, dir.path)
      } else {
        await gitInitRepo(ws.git)
      }
    }
  }

  //
  // Return a workspace
  //
  return ws
}
