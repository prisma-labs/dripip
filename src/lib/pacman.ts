import * as fs from 'fs-jetpack'
import * as PJ from './package-json'
import * as proc from './proc'
import { casesHandled } from './utils'

type PackageManagerType = 'npm' | 'yarn'

/**
 * This module abstracts running package manager commands. It is useful when
 * your users might be using npm or yarn but your code needs to stay agnostic to
 * which one.
 */

/**
 * Detect if being run within a yarn or npm script. Ref
 * https://stackoverflow.com/questions/51768743/how-to-detect-that-the-script-is-running-with-npm-or-yarn/51793644#51793644
 */
function detectScriptRunner(): null | 'npm' | 'yarn' {
  if (process.env.npm_execpath?.match(/.+npm-cli.js$/)) return 'npm'
  if (process.env.npm_execpath?.match(/.+yarn.js$/)) return 'yarn'
  return null
}

/**
 * Publishes the package.
 *
 * About version handling and package.json:
 *
 * In the case of npm the given version will be written to the package.json
 * before publishing and then unwritten afterward.
 *
 * In the case of yarn, package.json is not touched at all.
 *
 * Either way, it should not be noticable to the user of this function.
 */
async function publish(manType: PackageManagerType, input: { version: string; tag: string }): Promise<void> {
  if (manType === 'yarn') {
    const runString = `yarn publish --tag ${input.tag} --no-git-tag-version --new-version ${input.version}`
    await proc.run(runString, { require: true })
  } else if (manType === 'npm') {
    const pj = PJ.create(process.cwd())
    const pjd = (await pj.read())! // assume present and valid package.json has been validated already
    await pj.write({ ...pjd, version: input.version })
    const runString = `npm publish --tag ${input.tag}`
    await proc.run(runString, { require: true })
    await pj.write(pjd)
  } else {
    casesHandled(manType)
  }
}

/**
 * Set an npm "dist-tag" to point at a particular version in the npm registry.
 * If the dist-tag does not exist it will be created. If it already exists it
 * will be moved without error. If it already points to the given version,
 * nothing will happen, including namely no error.
 */
async function tag(
  manType: PackageManagerType,
  packageName: string,
  input: {
    packageVersion: string
    tagName: string
  }
) {
  const runString =
    manType === 'npm'
      ? `npm dist-tags add ${packageName}@${input.packageVersion} ${input.tagName}`
      : manType === 'yarn'
      ? `yarn tag add ${packageName}@${input.packageVersion} ${input.tagName}`
      : casesHandled(manType)
  try {
    await proc.run(runString, { require: true })
  } catch (e) {
    if (
      manType === 'yarn' &&
      e.message.match(/error Couldn't add tag./) &&
      e.message.match(/error An unexpected error occurred: ""./)
    ) {
      try {
        fs.remove('yarn-error.log')
      } catch (e) {
        // silence error if for some reason we cannot clean up the yarn error
        // log because it is not important enough to handle/tell user about.
      }
      // Silence error here because there is a bug with yarn where tag change command errors out but
      // actually work, ref: https://github.com/yarnpkg/yarn/issues/7823
    } else {
      throw e
    }
  }
}

export async function create(input: { default: PackageManagerType }) {
  const packageManagerType = detectScriptRunner() ?? input.default
  const packageJson = PJ.getPackageJsonSync()
  return {
    publish: publish.bind(null, packageManagerType),
    tag: tag.bind(null, packageManagerType, packageJson.name),
  }
}
