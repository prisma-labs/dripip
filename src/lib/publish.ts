/**
 * This module handles the concerns of publishing. It handles interaction with
 * git tagging, pushing to the git origin, the package registry, etc.
 */
import * as fs from 'fs'
import * as Path from 'path'
import * as proc from './proc'
import createGit from 'simple-git/promise'
import { detectScriptRunner, casesHandled } from './utils'

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
  additiomalDistTags?: string[]
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

  const packageJsonPath = Path.join(process.cwd(), 'package.json')
  const packageJsonString = await fs.readFileSync(packageJsonPath, {
    encoding: 'utf8',
  })
  const packageJson = JSON.parse(packageJsonString)

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

  await fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(updatedPackageJson, null, 2)
  )
  console.log('updated package.json in prep for publishing')

  // publish to the npm registry

  // If we are using a script runner then publish with that same tool. Otherwise
  // default to using npm. The reason we need to do this is that problems occur
  // when mixing tools. For example `yarn run ...` will lead to a spawn of `npm
  // publish` failing due to an authentication error.
  const scriptRunner = detectScriptRunner() ?? 'npm'
  const runPublishString =
    scriptRunner === 'npm'
      ? `npm publish --tag ${release.distTag}`
      : scriptRunner === 'yarn'
      ? `${scriptRunner} publish --tag ${release.distTag} --no-git-tag-version --new-version ${release.version}`
      : casesHandled(scriptRunner)
  await proc.run(runPublishString, { require: true })
  console.log('published package to the npm registry')

  if (release.additiomalDistTags) {
    for (const distTag of release.additiomalDistTags) {
      const runString =
        scriptRunner === 'npm'
          ? `npm dist-tags add ${packageJson.name}@${release.version} ${distTag}`
          : scriptRunner === 'yarn'
          ? `yarn tag add ${packageJson.name}@${release.version} ${distTag}`
          : casesHandled(scriptRunner)
      // There is a bug with yarn where tag change command errors out but
      // actually work, ref: https://github.com/yarnpkg/yarn/issues/7823
      try {
        await proc.run(runString, { require: true })
      } catch (e) {
        if (
          scriptRunner === 'yarn' &&
          e.message.match(/error Couldn't add tag./) &&
          e.message.match(/error An unexpected error occurred: ""./)
        ) {
          try {
            fs.unlinkSync(Path.join(process.cwd(), 'yarn-error.log'))
          } catch (e) {
            // silence error
          }
          // silence error
        } else {
          throw e
        }
      }
      console.log(`updated dist-tag "${distTag}" to point at this version`)
    }
  }

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
