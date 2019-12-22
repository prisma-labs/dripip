import * as jetpack from 'fs-jetpack'
import * as Path from 'path'
import createGit from 'simple-git/promise'
import { gitInitRepo, Simple, gitResetToInitialCommit } from '../../src/lib/git'
import { createRunner } from '../../src/lib/proc'

type Workspace = {
  dir: { path: string; pathRelativeToGraphqlSanta: string; cacheHit: boolean }
  run: ReturnType<typeof createRunner>
  fs: ReturnType<typeof jetpack.dir>
  git: Simple
}

type Options = {
  name: string
  cache?: {
    on?: boolean
    version?: string
    includeLock?: boolean
  }
}

/**
 * Workspace creator coupled to jest.
 */
export function createWorkspace(config: Options): Workspace {
  const ws = {} as Workspace
  // TODO track the git commit started on, then reset hard to it after each test

  beforeAll(async () => {
    Object.assign(ws, await doCreateWorkspace(config))
    // In case of a cache hit where we manually debugged the directory or
    // somehow else it changed.
  })

  beforeEach(async () => {
    await gitResetToInitialCommit(ws.git)
  })

  return ws
}

// TODO if errors occur during workspace creation then the cache will be hit
// next time but actual contents not suitable for use. Make the system more robust!

/**
 * Create a generic workspace to perform work in.
 */
async function doCreateWorkspace(config: Options): Promise<Workspace> {
  //
  // Setup Dir
  //
  const projectName = require('../../package.json').name
  const dir = {} as Workspace['dir']
  const yarnLockHash =
    config.cache?.includeLock === true
      ? jetpack.inspect('yarn.lock', {
          checksum: 'md5',
        })!.md5
      : 'off'
  const ver = '5'
  const testVer = config.cache?.version ?? 'off'
  const currentGitBranch = (
    await createGit().raw(['rev-parse', '--abbrev-ref', 'HEAD'])
  ).trim()
  const cacheKey = `v${ver}-yarnlock-${yarnLockHash}-gitbranch-${currentGitBranch}-testv${testVer}`

  dir.path = `/tmp/${projectName}-integration-test-project-bases/${
    config.name
  }-${config.cache?.on === false ? Math.random() : cacheKey}`

  dir.pathRelativeToGraphqlSanta =
    '../' + Path.relative(dir.path, Path.join(__dirname, '../..'))

  if ((await jetpack.existsAsync(dir.path)) !== false) {
    dir.cacheHit = true
  } else {
    dir.cacheHit = false
    await jetpack.dirAsync(dir.path)
  }

  console.log('cache %s for %s', dir.cacheHit ? 'hit' : 'miss', dir.path)

  //
  // Setup Tools
  //
  const fs = jetpack.dir(dir.path)
  const run = createRunner(dir.path)
  const git = createGit(dir.path)

  //
  // Setup Project (if needed, cacheable)
  //
  if (!dir.cacheHit) {
    await Promise.all([
      fs.writeAsync('package.json', {
        name: 'test-app',
        license: 'MIT',
      }),
    ])
    await gitInitRepo(git)
  }

  //
  // Return a workspace
  //
  return {
    dir,
    fs,
    run,
    git,
  }
}
