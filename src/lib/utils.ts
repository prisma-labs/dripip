import * as SemVer from 'semver'
import createGit from 'simple-git/promise'
import * as Git from './git'
import { parse } from 'path'

export type ParsedTag =
  | { type: 'unknown'; value: string }
  | { type: 'stable_release'; value: SemVer.SemVer }
  | { type: 'pre_release'; value: SemVer.SemVer }

export function parseTag(rawTag: string): ParsedTag {
  const semverParseResult = SemVer.parse(rawTag)
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

/**
 * Use this to make assertion at end of if-else chain that all members of a
 * union have been accounted for.
 */
export function assertAllCasesHandled(x: never): void {
  throw new Error(`A case was not handled for value: ${x}`)
}

export type StableRelease = {
  type: 'stable'
  version: SemVer.SemVer
  sha: string
}

export type PreviewRelease = {
  type: 'preview'
  version: SemVer.SemVer
  sha: string
  buildNum: number
}

export type CommitReleases = {
  stable: null | StableRelease
  preview: null | PreviewRelease
}

const emptyCommitReleases = {
  stable: null,
  preview: null,
}

/**
 * Get the releases at the given commit.
 */
export async function getReleasesAtCommit(
  sha: string
): Promise<CommitReleases> {
  const git = createGit()
  const tags = await Git.gitGetTags(git, { ref: sha })
  if (isEmpty(tags)) return emptyCommitReleases
  const parsedTags = groupByProp(tags.map(parseTag), 'type')
  const stableTags = parsedTags.stable_release ?? []
  const previewtags = parsedTags.pre_release ?? []

  const invariantViolations = []
  if (stableTags.length > 1) {
    invariantViolations.push(
      `Multiple stable releases found but there should only be 0 or 1: ${stableTags}`
    )
  }
  if (previewtags.length > 1) {
    invariantViolations.push(
      `Multiple preview releases found but there should only be 0 or 1: ${stableTags}`
    )
  }
  if (invariantViolations.length > 0) {
    throw new Error(
      `While getting the pre-existing releases at commit ${sha} the following invariant violations were found:\n\n${invariantViolations
        .map(x => `    - ${x}`)
        .join('\n')}`
    )
  }

  return {
    stable: stableTags[0]
      ? {
          type: 'stable',
          version: stableTags[0].value,
          sha,
        }
      : null,
    preview: previewtags[0]
      ? {
          type: 'preview',
          version: previewtags[0].value,
          sha,
          buildNum: previewtags[0].value.prerelease[1] as number,
        }
      : null,
  }
}

/**
 * Determin if the given array or object is empty.
 */
export function isEmpty(x: {} | unknown[]): boolean {
  return Array.isArray(x) ? x.length === 0 : Object.keys(x).length > 0
}

/**
 * Is the given release a stable one?
 */
export function isStable(release: SemVer.SemVer): boolean {
  return release.prerelease.length === 0
}

/**
 * Is the given release a stable preview one?
 */
export function isStablePreview(release: SemVer.SemVer): boolean {
  return (
    release.prerelease[0] === 'next' &&
    String(release.prerelease[1]).match(/\d+/) !== null
  )
}

export async function findLatestStable(
  git: Git.Simple
): Promise<null | string> {
  return Git.findTag(git, {
    matcher: candidate => {
      const maybeSemVer = SemVer.parse(candidate)
      if (maybeSemVer === null) return false
      return isStable(maybeSemVer)
    },
  })
}

export async function findLatestPreview(
  git: Git.Simple,
  maybeLatestStableVer: null | string
): Promise<null | string> {
  return Git.findTag(git, {
    since: maybeLatestStableVer ?? undefined,
    matcher: candidate => {
      const maybeSemVer = SemVer.parse(candidate)
      if (maybeSemVer === null) return false
      return isStablePreview(maybeSemVer)
    },
  })
}

export function delay(milliseconds: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, 1000)
  })
}
