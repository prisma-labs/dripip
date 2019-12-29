import * as Semver from 'semver'

export type ParsedTag =
  | { type: 'unknown'; value: string }
  | { type: 'stable_release'; value: Semver.SemVer }
  | { type: 'pre_release'; value: Semver.SemVer }

export function parseTag(rawTag: string): ParsedTag {
  const semverParseResult = Semver.parse(rawTag)
  if (semverParseResult !== null) {
    if (semverParseResult.prerelease.length > 0) {
      return { type: 'pre_release', value: semverParseResult } as const
    } else {
      return { type: 'stable_release', value: semverParseResult } as const
    }
  } else {
    return { type: 'unknown', value: rawTag } as const
  }
}

export const indentBlock4 = (block: string): string => indentBlock(4, block)

export const indentBlock = (size: number, block: string): string => {
  return block
    .split('\n')
    .map(
      line =>
        range(size)
          .map(constant(' '))
          .join('') + line
    )
    .join('\n')
}

const constant = <T>(x: T): (() => T) => {
  return function() {
    return x
  }
}

const range = (times: number): number[] => {
  const list: number[] = []
  while (list.length < times) {
    list.push(list.length + 1)
  }
  return list
}

type IndexableKeyTypes = string | number | symbol

type Indexable<T = unknown> = Record<string | number, T>

type JustIndexableTypes<T> = T extends IndexableKeyTypes ? T : never

type KeysMatching<Rec, Keys> = NonNullable<
  {
    [RecKey in keyof Rec]: Rec[RecKey] extends Keys ? RecKey : never
  }[keyof Rec]
>

export type GroupBy<T extends Indexable, K extends IndexableKeys<T>> = {
  [KV in JustIndexableTypes<T[K]>]?: Array<T extends Record<K, KV> ? T : never>
}

type IndexableKeys<Rec> = KeysMatching<Rec, IndexableKeyTypes>

export function groupByProp<
  Obj extends Indexable,
  KeyName extends IndexableKeys<Obj>
>(xs: Obj[], keyName: KeyName): GroupBy<Obj, KeyName> {
  type KeyValue = JustIndexableTypes<Obj[KeyName]>
  const seed = {} as GroupBy<Obj, KeyName>

  return xs.reduce((groupings, x) => {
    const groupName = x[keyName] as KeyValue

    if (groupings[groupName] === undefined) {
      groupings[groupName] = []
    }

    // We know the group will exist, given above initializer.
    groupings[groupName]!.push(
      x as Obj extends Record<KeyName, KeyValue> ? Obj : never
    )

    return groupings
  }, seed)
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
export function bumpVer(
  bumpType: 'major' | 'minor' | 'patch',
  // | 'premajor'
  // | 'preminor'
  // | 'prepatch'
  // | 'pre',
  // preReleaseTypeIdentifier: string,
  prevVer: Semver.SemVer
): Semver.SemVer {
  // const buildNumPrefix = preReleaseTypeIdentifier
  //   ? `${preReleaseTypeIdentifier}.`
  //   : ''
  switch (bumpType) {
    case 'major':
      return Semver.parse(
        `${prevVer.major + 1}.${prevVer.minor}.${prevVer.patch}`
      )!
    case 'minor':
      return Semver.parse(
        `${prevVer.major}.${prevVer.minor + 1}.${prevVer.patch}`
      )!
    case 'patch':
      return Semver.parse(
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
 * Use this to make assertion at end of if-else chain that all members of a
 * union have been accounted for.
 */
export function assertAllCasesHandled(x: never): void {
  throw new Error(`A case was not handled for value: ${x}`)
}
