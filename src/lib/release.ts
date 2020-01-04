import * as SemVer from './semver'
import * as Git from './git'
import { findIndexFromEnd } from './utils'

export type SeriesLog = [null | Git.LogEntry, Git.LogEntry[]]

/**
 * Get the previous stable and commits since then. If there is no previous
 * stable then commits are counted from start of history.
 */
export async function getCurrentSeries(git: Git.Simple): Promise<Series> {
  return getLog(git).then(buildSeries)
}

async function getLog(git: Git.Simple): Promise<SeriesLog> {
  const previousStableCommit = await findLatestStable(git)
  const commits = await Git.log(git, { since: previousStableCommit })
  return previousStableCommit
    ? [commits.shift() as Git.LogEntry, commits]
    : [null, commits]
}

export type Commit = {
  message: string
  sha: string
  nonReleaseTags: []
  releases: {
    stable: null | SemVer.StableVer
    preview: null | SemVer.PreviewVer
  }
}

export type StableCommit = {
  message: string
  sha: string
  nonReleaseTags: []
  releases: {
    stable: SemVer.StableVer
    preview: null
  }
}

export type PreviewCommit = {
  message: string
  sha: string
  nonReleaseTags: []
  releases: {
    stable: null
    preview: SemVer.PreviewVer
  }
}

export type MaybePreviewCommit = {
  message: string
  sha: string
  nonReleaseTags: []
  releases: {
    stable: null
    preview: null | SemVer.PreviewVer
  }
}

export type UnreleasedCommit = {
  message: string
  sha: string
  nonReleaseTags: []
  releases: {
    stable: null
    preview: null
  }
}

export type Series = {
  previousStable: null | StableCommit
  commitsSinceStable: MaybePreviewCommit[]
  previousPreview: null | PreviewCommit
  commitsSincePreview: UnreleasedCommit[]
  current: Commit
  isEmpty: boolean
}

/**
 * Build structured series data from a raw series log.
 */
export function buildSeries([previousStable, commitsSince]: SeriesLog): Series {
  const pi = findIndexFromEnd(
    commitsSince,
    c => c.tags.find(tag => tag.match(/.+-next\.\d+/)) !== undefined
  )

  let previousPreview: null | PreviewRelease = null
  let commitsSincePreview: Git.LogEntry[] = []
  if (pi !== -1) {
    const c = commitsSince[pi]!
    const r = SemVer.parse(c.tags.find(isPreviewTag)!)!
    previousPreview = {
      sha: c.sha,
      type: 'preview',
      // TODO findFirstSuccess(processor, xs)
      version: r,
      buildNum: r.prerelease[1] as number,
    }
    commitsSincePreview = commitsSince.slice(pi + 1)
  }

  const previousStable2: null | StableRelease =
    previousStable === null
      ? null
      : {
          type: 'stable',
          sha: previousStable.sha,
          version: SemVer.parse(previousStable.tags.find(isStableTag)!)!,
        }

  return {
    previousStable: previousStable2,
    commitsSinceStable: commitsSince,
    previousPreview,
    commitsSincePreview,
  } as any
}

function isStableTag(tag: string): boolean {
  const ver = SemVer.parse(tag)
  if (ver === null) return false
  if (ver.prerelease.length === 0) return true
  return false
}

function isPreviewTag(tag: string): boolean {
  const ver = SemVer.parse(tag)
  if (ver === null) return false
  if (ver.prerelease[0] === 'next' && typeof ver.prerelease[1] === 'number')
    return true
  return false
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

export const zeroVer = '0.0.0'

export const zeroBuildNum = 0

//
// Private helpers
//

async function findLatestStable(git: Git.Simple): Promise<null | string> {
  return Git.findTag(git, {
    matcher: candidate => {
      const maybeSemVer = SemVer.parse(candidate)
      if (maybeSemVer === null) return false
      return isStable(maybeSemVer)
    },
  })
}

// const zeroReleases = {
//   stable: null,
//   preview: null,
// }

/**
 * Get the releases at the given commit.
 */
// export async function getReleasesAtCommit(
//   sha: string
// ): Promise<CommitReleases> {
//   const git = createGit()
//   const tags = await Git.gitGetTags(git, { ref: sha })
//   if (isEmpty(tags)) return zeroReleases
//   const parsedTags = groupByProp(tags.map(parseTag), 'type')
//   const stableTags = parsedTags.stable_release ?? []
//   const previewtags = parsedTags.pre_release ?? []

//   const invariantViolations = []
//   if (stableTags.length > 1) {
//     invariantViolations.push(
//       `Multiple stable releases found but there should only be 0 or 1: ${stableTags}`
//     )
//   }
//   if (previewtags.length > 1) {
//     invariantViolations.push(
//       `Multiple preview releases found but there should only be 0 or 1: ${stableTags}`
//     )
//   }
//   if (invariantViolations.length > 0) {
//     throw new Error(
//       `While getting the pre-existing releases at commit ${sha} the following invariant violations were found:\n\n${invariantViolations
//         .map(x => `    - ${x}`)
//         .join('\n')}`
//     )
//   }

//   return {
//     stable: stableTags[0]
//       ? {
//           type: 'stable',
//           version: stableTags[0].value,
//           sha,
//         }
//       : null,
//     preview: previewtags[0]
//       ? {
//           type: 'preview',
//           version: previewtags[0].value,
//           sha,
//           buildNum: previewtags[0].value.prerelease[1] as number,
//         }
//       : null,
//   }
// }

// export type ParsedTag =
//   | { type: 'unknown'; value: string }
//   | { type: 'stable_release'; value: SemVer.SemVer }
//   | { type: 'pre_release'; value: SemVer.SemVer }

// export function parseTag(rawTag: string): ParsedTag {
//   const semverParseResult = SemVer.parse(rawTag)
//   if (semverParseResult !== null) {
//     if (semverParseResult.prerelease.length > 0) {
//       return { type: 'pre_release', value: semverParseResult } as const
//     } else {
//       return { type: 'stable_release', value: semverParseResult } as const
//     }
//   } else {
//     return { type: 'unknown', value: rawTag } as const
//   }
// }
