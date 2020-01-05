export type Ver = StableVer | PreviewVer

export type StableVer = {
  version: string
  vprefix: boolean
  major: number
  minor: number
  patch: number
}

export type PreviewVer = {
  version: string
  vprefix: boolean
  major: number
  minor: number
  patch: number
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
export function calcBumpType(commitMessages: string[]): null | MajMinPat {
  let semverPart: null | MajMinPat = null
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

export type MajMinPat = 'major' | 'minor' | 'patch'

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
export function incStable(
  bumpType: 'major' | 'minor' | 'patch',
  // | 'premajor'
  // | 'preminor'
  // | 'prepatch'
  // | 'pre',
  // preReleaseTypeIdentifier: string,
  v: Ver
): Ver {
  // const buildNumPrefix = preReleaseTypeIdentifier
  //   ? `${preReleaseTypeIdentifier}.`
  //   : ''
  const { vprefix, major, minor, patch } = v
  switch (bumpType) {
    case 'major':
      return createStable(major + 1, 0, 0, { vprefix })
    case 'minor':
      return createStable(major, minor + 1, 0, { vprefix })
    case 'patch':
      return createStable(major, minor, patch + 1, { vprefix })
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

export function stableToPreview(
  v: StableVer,
  identifier: string,
  buildNum: number
): PreviewVer {
  return createPreRelease(v.major, v.minor, v.patch, identifier, buildNum)
}

/**
 * Create a semantic pre-release version programatically.
 */
export function createPreRelease(
  major: number,
  minor: number,
  patch: number,
  identifier: string,
  buildNum: number,
  opts?: { vprefix: boolean }
): PreviewVer {
  return {
    version: `${major}.${minor}.${patch}-${identifier}.${buildNum}`,
    vprefix: opts?.vprefix ?? false,
    major,
    minor,
    patch,
    preRelease: {
      buildNum,
      identifier,
    },
  }
}

/**
 * Create a semantic version programatically.
 */
export function createStable(
  major: number,
  minor: number,
  patch: number,
  opts?: { vprefix: boolean }
): StableVer {
  return {
    major,
    minor,
    patch,
    vprefix: opts?.vprefix ?? false,
    version: `${major}.${minor}.${patch}`,
  }
}

// export function render(ver:Omit<Ver,'version'>):string{
//   return isPreview(ver as any)
//   ? `${ver.major}.${ver.minor}.${ver.patch}`
//   : `${ver.major}.${ver.minor}.${ver.patch}-${ver.preRelease}`
// }

export function isPreview(v: Ver): v is PreviewVer {
  return (v as any).preRelease !== undefined
}

export function isStable(v: Ver): v is StableVer {
  return !isPreview(v)
}

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
  const result = ver.match(
    /^(v)?(\d+).(\d+).(\d+)$|^(v)?(\d+).(\d+).(\d+)-(\w+).(\d+)$/
  )

  if (result === null) return null

  if (result[6]) {
    const vprefix = result[5] === 'v'
    const major = parseInt(result[6], 10)
    const minor = parseInt(result[7], 10)
    const patch = parseInt(result[8], 10)
    const identifier = result[9]
    const buildNum = parseInt(result[10], 10)
    return {
      version: `${major}.${minor}.${patch}-${identifier}.${buildNum}`,
      vprefix,
      major,
      minor,
      patch,
      preRelease: {
        identifier,
        buildNum,
      },
    }
  }

  const vprefix = result[1] === 'v'
  const major = parseInt(result[2], 10)
  const minor = parseInt(result[3], 10)
  const patch = parseInt(result[4], 10)
  return {
    version: `${major}.${minor}.${patch}`,
    vprefix,
    major,
    minor,
    patch,
  }
}

export const zeroVer = createStable(0, 0, 0)

export const zeroBuildNum = 0
