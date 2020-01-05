import * as SemVer from 'semver'

export type Ver = StableVer | PreviewVer

export type StableVer = {
  version: string
  major: string
  minor: string
  patch: string
}

export type PreviewVer = {
  version: string
  major: string
  minor: string
  patch: string
  preRelease: {
    identifier: string
    buildNum: number
  }
}

/**
 * Given a list of conventional commit messages (subject and body, the entire
 * message for the commit) calculate what the package version containing these
 * changes should be. Returns `null` if all changes were meta or unconforming.
 */
export function calcBumpType(
  commitMessages: string[]
): null | SemverStableVerParts {
  let semverPart: null | SemverStableVerParts = null
  for (const m of commitMessages) {
    // Commits that do not conform to conventional commit standard are discarded
    if (!isValidConventionalCommit(m)) {
      continue
    }

    // chore type commits are considered to not change the runtime in any way
    if (isMetaChange(m)) {
      continue
    }

    // Nothing can be be higher so we've reached our final value effectively.
    if (isBreakingchange(m)) {
      semverPart = 'major'
      break
    }

    // If already at minor continue, now looking only for major changes
    if (semverPart === 'minor') {
      continue
    }

    if (isMinorChange(m)) {
      semverPart = 'minor'
      continue
    }

    semverPart = 'patch'
  }

  return semverPart
}

function isMinorChange(message: string): boolean {
  return message.match(/^(?:feat|feature): /) !== null
}

function isBreakingchange(message: string): boolean {
  return message.match(/BREAKING CHANGE/) !== null
}

function isMetaChange(message: string): boolean {
  return message.match(/^chore: /) !== null
}

function isValidConventionalCommit(message: string): boolean {
  return message.match(/\w+: .+/) !== null
}

export type SemverStableVerParts = 'major' | 'minor' | 'patch'

/**
 * Calculate the stable bump to a given semver version. This function is similar
 * to `semver` package inc function with the following differences:
 *
 *     1. pre-releases are 1 based:
 *
 *          this  : '0.0.1'  inc('prerelease') --> '0.0.1-1'
 *          semver: '0.0.1'  inc('prerelease') --> '0.0.1-0'
 *
 *     2. bumping pre{min,maj,pat} also bumps the build num:
 *
 *          this  : '0.0.1-1' inc('preminor') --> '0.1.0-2'
 *          semver: '0.0.1'   inc('preminor') --> '0.1.0-0'
 */
export function bump(
  bumpType: 'major' | 'minor' | 'patch',
  // | 'premajor'
  // | 'preminor'
  // | 'prepatch'
  // | 'pre',
  // preReleaseTypeIdentifier: string,
  prevVer: SemVer.SemVer
): SemVer.SemVer {
  // const buildNumPrefix = preReleaseTypeIdentifier
  //   ? `${preReleaseTypeIdentifier}.`
  //   : ''
  switch (bumpType) {
    case 'major':
      return SemVer.parse(`${prevVer.major + 1}.0.0`)!
    case 'minor':
      return SemVer.parse(`${prevVer.major}.${prevVer.minor + 1}.0`)!
    case 'patch':
      return SemVer.parse(
        `${prevVer.major}.${prevVer.minor}.${prevVer.patch + 1}`
      )!
    // // TODO refactor
    // case 'premajor':
    //   // TODO unsafe, assumes the incoming ver has format #.#.# or #.#.#-foo.#
    //   const buildNum1 = (prevVer.prerelease[1] as undefined | number) ?? 1
    //   const preRelease1 = buildNumPrefix + String(buildNum1 + 1)
    //   return Semver.parse(
    //     `${prevVer.major + 1}.${prevVer.minor}.${prevVer.patch}-${preRelease1}`
    //   )!
    // case 'preminor':
    //   // TODO unsafe, assumes the incoming ver has format #.#.# or #.#.#-foo.#
    //   const buildNum2 = (prevVer.prerelease[1] as undefined | number) ?? 1
    //   const preRelease2 = buildNumPrefix + String(buildNum2 + 1)
    //   return Semver.parse(
    //     `${prevVer.major}.${prevVer.minor + 1}.${prevVer.patch}-${preRelease2}`
    //   )!
    // case 'prepatch':
    //   // TODO unsafe, assumes the incoming ver has format #.#.# or #.#.#-foo.#
    //   const buildNum3 = (prevVer.prerelease[1] as undefined | number) ?? 1
    //   const preRelease3 = buildNumPrefix + String(buildNum3 + 1)
    //   return Semver.parse(
    //     `${prevVer.major}.${prevVer.minor}.${prevVer.patch + 1}-${preRelease3}`
    //   )!
    // case 'pre':
    //   // TODO unsafe, assumes the incoming ver has format #.#.# or #.#.#-foo.#
    //   const buildNum4 = (prevVer.prerelease[1] as undefined | number) ?? 1
    //   const preRelease4 = buildNumPrefix + String(buildNum4 + 1)
    //   return Semver.parse(
    //     `${prevVer.major}.${prevVer.minor}.${prevVer.patch}-${preRelease4}`
    //   )!
  }
}

/**
 * Create a semver instance programatically.
 */
export const create = (maj: number, min: number, pat: number) =>
  SemVer.parse(`${maj}.${min}.${pat}`)!

export function parsePreview(ver: string): null | PreviewVer {
  const result = parse(ver)
  if (result === null) return null
  if ((result as any).preRelease) {
    return result as PreviewVer
  }
  throw new Error(
    `Given version string ${ver} could not be parsed as a preview.`
  )
}

/**
 * Parse a version string into structured data.
 */
export function parse(ver: string): null | StableVer | PreviewVer {
  const result = ver.match(/(\d).(\d).(\d)(?:-(\w+).(\d)+)?/)
  if (result === null) return null
  const major = result[1]
  const minor = result[2]
  const patch = result[3]

  if (result[4]) {
    const identifier = result[4]
    const buildNum = parseInt(result[5], 10)
    return {
      version: `${major}.${minor}.${patch}-${identifier}.${buildNum}`,
      major,
      minor,
      patch,
      preRelease: {
        identifier,
        buildNum,
      },
    }
  }

  return {
    version: `${major}.${minor}.${patch}`,
    major,
    minor,
    patch,
  }
}

export const parseToClass = SemVer.parse

export { SemVer } from 'semver'
