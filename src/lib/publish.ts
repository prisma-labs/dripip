/**
 * This module handles the concerns of publishing. It handles interaction with
 * git tagging, pushing to the git origin, the package registry, etc.
 */
import * as fs from 'fs-jetpack'
import * as proc from './proc'
import createGit from 'simple-git/promise'
import { detectScriptRunner, assertAllCasesHandled } from './utils'

type Options = {
  /**
   * Should the semver git tag have a "v" prefix.
   */
  vPrefix?: boolean
}

const defaultOpts: Options = {
  vPrefix: false,
}

type Release = {
  /**
   * The version to publish.
   */
  version: string
  /**
   * The npm dist tag to use for this release.
   */
  distTag: string
}

/**
 * Run the publishing process.
 *
 * 1. Change package.json version field to be new version.
 * 2. npm publish --tag next.
 * 3. discard package.json change.
 * 4. git tag {newVer}.
 * 5. git tag next.
 * 6. git push --tags.
 *
 */
export async function publish(release: Release, givenOpts?: Options) {
  const opts = {
    ...defaultOpts,
    ...givenOpts,
  }

  // Update package.json

  const packageJsonPath = fs.path('package.json')
  const packageJson = await fs.readAsync(packageJsonPath, 'json')

  if (!packageJson) {
    throw new Error(
      `Looked for but could not find a package.json file at ${packageJsonPath}. This file is required for publishing to the npm registry.`
    )
  }

  if (typeof packageJson !== 'object') {
    throw new Error(
      `Found a package.json file at ${packageJsonPath} but it appears to be malformed. It did not parse into an object but rather: ${packageJson}`
    )
  }

  const updatedPackageJson = {
    ...packageJson,
    version: release.version,
  }

  await fs.writeAsync(packageJsonPath, updatedPackageJson)
  console.log('updated package.json in prep for publishing')

  // publish to the npm registry

  // If we are using a script runner then publish with that same tool. Otherwise
  // default to using npm. The reason we need to do this is that problems occur
  // when mixing tools. For example `yarn run ...` will lead to a spawn of `npm
  // publish` failing due to an authentication error.
  const scriptRunner = detectScriptRunner() ?? 'npm'
  if (scriptRunner === 'npm') {
    await proc.run(`${scriptRunner} publish --tag ${release.distTag}`, {
      require: true,
    })
  } else if (scriptRunner === 'yarn') {
    await proc.run(
      `${scriptRunner} publish --tag ${release.distTag} --no-git-tag-version --new-version ${release.version}`,
      {
        require: true,
      }
    )
  } else {
    assertAllCasesHandled(scriptRunner)
  }
  console.log('published package to the npm registry')

  const git = createGit()
  // TODO no invariant in system that checks that package.json was not modified
  // before beginning the publishing process. In other words we may be losing
  // user work here. This check should be in strict mode.
  await git.checkout('package.json')
  console.log('reverted package.json changes now that publishing is done')

  // tag the commit

  const versionTag = opts.vPrefix ? 'v' + release.version : release.version
  await git.addAnnotatedTag(versionTag, versionTag)
  console.log(`tagged this commit with ${versionTag}`)

  await git.pushTags()
  console.log(`pushed tag to remote`)
}
