import * as fs from 'fs-jetpack'
import * as proc from './proc'
import createGit from 'simple-git/promise'

/**
 * This module handles the concerns of publishing. It handles interaction with
 * git tagging, pushing to the git origin, the package registry, etc.
 */
type Options = {
  vPrefix?: boolean
}

const defaultOpts: Options = {
  vPrefix: false,
}

type Release = {
  version: string
  isPreview: boolean
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

  await proc.run(`npm publish --tag ${release.distTag}`, { require: true })
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
