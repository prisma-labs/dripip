import * as ConventionalCommit from '../lib/conventional-commit'
import * as Git from '../lib/git'
import * as Semver from '../lib/semver'

export type Release = {
  bumpType: Semver.MajMinPat
  version: Semver.Ver
}

export function shortSha(c: Commit): string {
  return c.sha.slice(0, 7)
}

/**
 * Get the previous stable and commits since then. If there is no previous
 * stable then commits are counted from start of history.
 */
export async function getCurrentSeries(input: { cwd: string }): Promise<Series> {
  return getLog({ cwd: input.cwd }).then(buildSeries)
}

/**
 * Like `getLog` but works on the given data. Useful for unit testing with mock
 * log data.
 */
export function fromLogs(entries: Git.LogEntry[]): Series {
  const commits: Git.LogEntry[] = []
  let previousStableCommit: null | Git.LogEntry = null

  for (const log of entries) {
    if (log.tags.find(isStableTag)) {
      previousStableCommit = log
      break
    }
    commits.push(log)
  }

  return buildSeries([previousStableCommit, commits])
}

/**
 * Get the latest stable and all subsequent commits. If no stable then all
 * commits (edge-case, new project) since-inclusive initial commit. The returned
 * tuple contains the  stable commit partitioned from the subsequent commits.
 * The stable commit may be null.
 */
async function getLog(input: { cwd: string }): Promise<SeriesLog> {
  const commits: Git.LogEntry[] = []
  let previousStableCommit: null | Git.LogEntry = null

  for await (const log of Git.streamLog({ cwd: input.cwd })) {
    if (log.tags.find(isStableTag)) {
      previousStableCommit = log
      break
    }
    commits.push(log)
  }

  return [previousStableCommit, commits]
}

/**
 * Get the current commit.
 */
export async function getCurrentCommit(): Promise<Commit> {
  let currLog: undefined | Git.LogEntry
  for await (const log of Git.streamLog()) {
    currLog = log
    break
  }

  if (!currLog) {
    throw new Error('There are no commits in this repo')
  }

  return logEntryToCommit(currLog)
}

// todo non-conforming aka. non-conventional commits
type CommitBase = {
  message: {
    raw: string
    parsed: null | ConventionalCommit.ConventionalCommit
  }
  sha: string
  nonReleaseTags: string[]
}

export type Commit = CommitBase & {
  releases: {
    stable: null | Semver.StableVer
    preview: null | Semver.PreviewVer
  }
}

export type StableCommit = CommitBase & {
  releases: {
    stable: Semver.StableVer
    preview: null
  }
}

export type PreviewCommit = CommitBase & {
  releases: {
    stable: null
    preview: Semver.PreviewVer
  }
}

export type MaybePreviewCommit = CommitBase & {
  releases: {
    stable: null
    preview: null | Semver.PreviewVer
  }
}

export type UnreleasedCommit = CommitBase & {
  releases: {
    stable: null
    preview: null
  }
}

export type Series = {
  previousStable: null | StableCommit
  commitsInNextStable: MaybePreviewCommit[]
  previousPreview: null | PreviewCommit
  commitsInNextPreview: UnreleasedCommit[]
  current: Commit
  hasBreakingChange: boolean
  isInitialDevelopment: boolean
}

export type SeriesLog = [null | Git.LogEntry, Git.LogEntry[]]

/**
 * Transform a log entry into a commit.
 */
function logEntryToCommit(log: Git.LogEntry): Commit {
  const parsedMessage = ConventionalCommit.parse(log.message)
  const previewTag = log.tags.find(isPreviewTag) ?? null
  const stableTag = log.tags.find(isStableTag) ?? null
  const otherTags = log.tags.filter(isUnknownTag)

  return {
    sha: log.sha,
    message: {
      parsed: parsedMessage,
      raw: log.message,
    },
    releases: {
      stable: stableTag ? Semver.parse(stableTag) : null,
      preview: previewTag ? Semver.parsePreview(previewTag) : null,
    },
    nonReleaseTags: otherTags,
  }
}

/**
 * Build structured series data from a raw series log.
 */
export function buildSeries([previousStableLogEntry, commitsSincePrevStable]: SeriesLog): Series {
  if (previousStableLogEntry === null && commitsSincePrevStable.length === 0) {
    throw new Error(
      `Cannot build release series with given data. There is no previous stable release and no commits since. This would indicate an unexpected error or working with a git repo that has zero commits. The latter should be guarded by upstream checks. Therefore this is bad. There must be a bug.`
    )
  }

  let hasBreakingChange = false

  const commitsInNextStable = commitsSincePrevStable.map((c) => {
    const parsedMessage = ConventionalCommit.parse(c.message)
    if (parsedMessage?.breakingChange) {
      hasBreakingChange = true
    }
    return {
      message: {
        raw: c.message,
        parsed: parsedMessage,
      },
      sha: c.sha,
      nonReleaseTags: c.tags.filter(isUnknownTag),
      releases: {
        stable: Semver.parse(c.tags.find(isStableTag) ?? ''),
        preview: Semver.parsePreview(c.tags.find(isPreviewTag) ?? ''),
      },
    } as MaybePreviewCommit
  })

  const previousPreviewIndex = commitsInNextStable.findIndex((c) => c.releases.preview !== null)

  const previousPreview =
    previousPreviewIndex === -1 ? null : (commitsInNextStable[previousPreviewIndex]! as PreviewCommit)

  const commitsInNextPreview: UnreleasedCommit[] =
    previousPreviewIndex === -1
      ? (commitsInNextStable as UnreleasedCommit[])
      : (commitsInNextStable.slice(0, previousPreviewIndex) as UnreleasedCommit[])

  const previousStable =
    previousStableLogEntry === null
      ? null
      : ({
          sha: previousStableLogEntry.sha,
          message: {
            raw: previousStableLogEntry.message,
            parsed: ConventionalCommit.parse(previousStableLogEntry.message),
          },
          nonReleaseTags: previousStableLogEntry.tags.filter(isUnknownTag),
          releases: {
            stable: Semver.parse(previousStableLogEntry.tags.find(isStableTag)!)!,
            preview: Semver.parsePreview(previousStableLogEntry.tags.find(isPreviewTag) ?? ''),
          },
        } as StableCommit)

  const isInitialDevelopment = (previousStable?.releases.stable.major ?? 0) < 1

  return {
    isInitialDevelopment,
    hasBreakingChange,
    previousStable: previousStable,
    previousPreview,
    commitsInNextStable,
    commitsInNextPreview,
    // If there are no commits since stable and no stable that means we're on a
    // repo with no commit. This edge-case is ignored. It is assumed that it
    // will be validated for before calling this function.
    current: commitsInNextStable[0] ?? previousStable!,
  }
}

function isUnknownTag(tag: string): boolean {
  return Semver.parse(tag) === null
}

function isStableTag(tag: string): boolean {
  const v = Semver.parse(tag)
  if (v === null) return false
  return Semver.isStable(v)
}

function isPreviewTag(tag: string): boolean {
  const v = Semver.parse(tag)
  if (v === null) return false
  return Semver.isPreview(v)
}

// function getNextVer(series: Series): Semver.PreviewVer {
//   if (series.previousPreview === null) {
//     return series.previousPreview
//   }
// }

export type NoReleaseReason = 'empty_series' | 'no_meaningful_change'

export function isNoReleaseReason(x: unknown): x is NoReleaseReason {
  return x === 'no_meaningful_change' || x === 'empty_series'
}

/**
 * Get the next stable from a given series. If a release cannot be made for the
 * given series then a code indicating why will be returned.
 */
export function getNextStable(series: Series): NoReleaseReason | Release {
  if (series.commitsInNextStable.length === 0) {
    return 'empty_series'
  }

  const bumpType = ConventionalCommit.calcBumpType(
    series.isInitialDevelopment,
    series.commitsInNextStable.map((c) => c.message.raw)
  )

  if (bumpType === null) return 'no_meaningful_change'

  const version = Semver.incStable(
    bumpType,
    series.previousStable === null ? Semver.zeroVer : series.previousStable.releases.stable
  )

  return { bumpType, version }
}

/**
 * Calculate the preview release for the given series.
 */
export function getNextPreview(series: Series): NoReleaseReason | Release {
  if (series.commitsInNextStable.length === 0) {
    return 'empty_series'
  }

  // todo test this case, it was fixed without regression test being added
  const bumpTypeContributionFromCommitsInNextPreview = ConventionalCommit.calcBumpType(
    series.isInitialDevelopment,
    series.commitsInNextPreview.map((c) => c.message.raw)
  )

  if (bumpTypeContributionFromCommitsInNextPreview === null) return 'no_meaningful_change'

  const bumpType = ConventionalCommit.calcBumpType(
    series.isInitialDevelopment,
    series.commitsInNextStable.map((c) => c.message.raw)
  )

  // Stable is superset of preview so based on guard above there MUST be a
  // bumpType here.
  if (!bumpType) {
    throw new Error(
      'next preview in series has bump type but not series as a whole. You should not be seeing this. This should be impossible.'
    )
  }

  const nextStable = Semver.incStable(bumpType, series.previousStable?.releases.stable ?? Semver.zeroVer)

  const version = Semver.stableToPreview(
    nextStable,
    'next',
    (series.previousPreview?.releases.preview.preRelease.buildNum ?? Semver.zeroBuildNum) + 1
  )

  return { bumpType, version }
}

//
// Private helpers
//

// async function findLatestStable(git: Git.Simple): Promise<null | string> {
//   return Git.findTag(git, { matcher: isStableTag })
// }

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
