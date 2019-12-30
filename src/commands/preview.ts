import Command, { flags } from '@oclif/command'
import createGit from 'simple-git/promise'
import {
  indentBlock4,
  parseTag,
  groupByProp,
  ParsedTag,
  GroupBy,
  bumpVer,
  SemverStableVerParts,
} from '../lib/utils'
import { stripIndents } from 'common-tags'
import * as Git from '../lib/git'
import * as SemVer from 'semver'
import * as Output from '../lib/output'
import * as Publish from '../lib/publish'
import { calcBumpTypeFromConventionalCommits } from '../lib/conventional-commit'

type ReleaseTypeInfo = {
  type: string
  reason: string
}

export class Preview extends Command {
  static flags = {
    /**
     * This flag is mostly used for debugging. It allows the user to see what
     * kind of preview release _would_ be made under the current conditions, and
     * why.
     */
    'show-type': flags.boolean({
      default: false,
      description:
        'output the kind of preview release that would be made and why',
    }),
    'dry-run': flags.boolean({
      default: false,
      description: 'output what the next version would be if released now',
    }),
    // TODO currently all output is JSON, regardless of this flag
    json: flags.boolean({
      default: false,
      description: 'format output as JSON',
    }),
  }

  async run() {
    const { flags } = this.parse(Preview)
    const send = createOutputters({ json: flags.json })
    const git = createGit()
    // TODO validate for missing or faulty package.json
    // TODO validate for dirty git status
    // TODO validate for found releases that fall outside the subset we support.
    // For example #.#.#-foobar.1 is something we would not know what to do
    // with. A good default is probably to hard-error when these are
    // encountered. But offer a flag/config option called e.g. "ignore_unsupport_pre_release_identifiers"
    // TODO handle edge case: not a git repo
    // TODO handle edge case: a git repo with no commits
    // TODO nicer tag rendering:
    //    1. for annotated tags should the messge
    //    2. show the tag author name
    //    3. show the the date the tag was made

    /**
     * Before executing a preview release confirm that the commit to be released
     * has not already been released either as preview or stable.
     */
    const [currentCommitShortSha, tags] = await Promise.all([
      Git.gitGetSha(git, { short: true }),
      Git.gitGetTags(git).then(tags => {
        return groupByProp(tags.map(parseTag), 'type')
      }),
    ])

    const hasReleaseTags = tags.stable_release || tags.pre_release

    if (hasReleaseTags) {
      return send.commitAlreadyPreAndOrStableReleased(
        currentCommitShortSha,
        tags
      )
    }

    if (await Git.isTrunk(git)) {
      if (flags['show-type']) {
        return send.releaseType({ type: 'stable', reason: 'is_trunk' })
      }

      const nextRelease = await calcNextStablePreview(git)

      if (nextRelease === null) {
        return send.noReleaseToMake()
      }

      if (flags['dry-run']) {
        return send.dryRun(nextRelease)
      }

      await Publish.publish({
        distTag: 'next',
        version: nextRelease.nextVersion,
        isPreview: true,
      })
      await git.raw(['tag', '-f', 'next'])
      await git.pushTags()
    }

    const prCheck = await Git.checkBranchPR(git)

    if (prCheck.isPR === false) {
      return send.invalidBranchForPreRelease()
    }

    if (flags['show-type']) {
      return send.releaseType({
        type: 'pr',
        reason: prCheck.inferredBy,
      })
    }

    // TODO
    return process.stdout.write('todo: pr preview release')
  }
}

type ReleaseBrief = {
  currentVersion: null | string
  currentStable: null | string
  currentPreviewNumber: null | number
  nextStable: string
  nextPreviewNumber: number
  nextVersion: string
  commitsInRelease: string[]
  bumpType: SemverStableVerParts
  isFirstVer: boolean
  isFirstVerPreRelease: boolean
  isFirstVerStable: boolean
}

/**
 * 1. Find the last pre-release on the current branch. Take its build number. If
 *    none use 1.
 * 2. Calculate the semver bump type. Do this by analyizing the commits on the
 *    branch between HEAD and the last stable git tag.  The highest change type
 *    found is used. If no previous stable git tag use 0.0.1.
 * 3. Bump last stable version by bump type, thus producing the next version.
 * 4. Construct new version {nextVer}-next.{buildNum}. Example: 1.2.3-next.1.
 */
async function calcNextStablePreview(
  git: Git.Simple
): Promise<null | ReleaseBrief> {
  const maybeLatestStableVer = await Git.findTag(git, {
    matcher: candidate => {
      const maybeSemVer = SemVer.parse(candidate)
      if (maybeSemVer === null) return false
      return isStable(maybeSemVer)
    },
  })

  const maybeLatestPreVerSinceStable = await Git.findTag(git, {
    since: maybeLatestStableVer ?? undefined,
    matcher: candidate => {
      const maybeSemVer = SemVer.parse(candidate)
      if (maybeSemVer === null) return false
      return isStablePreview(maybeSemVer)
    },
  })

  // We need all the commits since the last stable release to calculate the
  // pre-release. The pre-release is a bump against the last stable plus a
  // build number. The bump type used to bump is based on the aggregate of
  // all commits since the last stable. While the build number always
  // increments the maj/min/pat may only increment upon the first
  // pre-release, unless a later pre-release incurs a higher-order bump-type
  // e.g. begin with patch-kind changes followed later by min-kind changes.

  const commitsSinceLastStable = await Git.log(git, {
    since: maybeLatestStableVer ?? undefined,
  })

  const commitMessagesSinceLastStable = commitsSinceLastStable.map(
    c => c.message
  )

  // Calculate the next version

  const stablePreReleaseIdentifier = 'next'
  const bumpType = calcBumpTypeFromConventionalCommits(
    commitMessagesSinceLastStable
  )

  if (bumpType === null) return null

  // The semver parses in this expression are guaranteed by the tag finding
  // done before.
  const maybeLatestBuildNum =
    maybeLatestPreVerSinceStable === null
      ? null
      : (SemVer.parse(maybeLatestPreVerSinceStable)!.prerelease[1] as number)

  maybeLatestPreVerSinceStable !== null
    ? SemVer.parse(maybeLatestPreVerSinceStable)!
    : maybeLatestStableVer !== null

  const nextVerBuildNum = (maybeLatestBuildNum ?? 0) + 1

  const nextStable = bumpVer(
    bumpType,
    SemVer.parse(maybeLatestStableVer ?? '0.0.0')!
  ).version

  const nextVer =
    nextStable + `-${stablePreReleaseIdentifier}.${nextVerBuildNum}`

  // TODO refactor, expensive re-calc of log when its already a subset of the above
  // filter on tags? commitsInRelease[0].tags
  const commitsInRelease = await Git.log(git, {
    since: maybeLatestPreVerSinceStable ?? maybeLatestStableVer ?? undefined,
  })
  const commitMessagesInRelease = commitsInRelease.map(m => m.message)

  return {
    currentStable: maybeLatestStableVer,
    currentPreviewNumber: maybeLatestBuildNum,
    nextStable: nextStable,
    nextPreviewNumber: nextVerBuildNum,
    currentVersion:
      maybeLatestPreVerSinceStable ?? maybeLatestStableVer ?? null,
    nextVersion: nextVer,
    commitsInRelease: commitMessagesInRelease,
    bumpType,
    isFirstVer:
      maybeLatestPreVerSinceStable === null && maybeLatestStableVer === null,
    isFirstVerStable: maybeLatestStableVer === null,
    isFirstVerPreRelease: maybeLatestPreVerSinceStable === null,
  }
}

/**
 * Is the given release a stable one?
 */
function isStable(release: SemVer.SemVer): boolean {
  return release.prerelease.length === 0
}

/**
 * Is the given release a stable preview one?
 */
function isStablePreview(release: SemVer.SemVer): boolean {
  return (
    release.prerelease[0] === 'next' &&
    String(release.prerelease[1]).match(/\d+/) !== null
  )
}

type OutputterOptions = {
  json: boolean
}

function createOutputters(opts: OutputterOptions) {
  /**
   * Output the release type.
   */
  function releaseType(info: ReleaseTypeInfo): void {
    if (opts.json) {
      Output.outputOk('release_type', info)
    } else {
      Output.outputRaw(
        `The release type that would be made right now is ${info.type} becuase ${info.reason}.`
      )
    }
  }

  /**
   * Output no release to make notice.
   */
  function noReleaseToMake(): void {
    Output.output(
      Output.createException('no_release_to_make', {
        summary:
          'All commits are either meta or not conforming to conventional commit. No release will be made.',
      }),
      { json: opts.json }
    )
  }

  /**
   * Output that current conditions do not permit a preview release.
   */
  function invalidBranchForPreRelease(): void {
    Output.output(
      Output.createException('invalid_branch_for_pre_release', {
        summary:
          'Preview releases are only supported on trunk (master) branch or branches with _open_ pull-requests. If you want to make a preview release for this branch then open a pull-request for it.',
      }),
      { json: opts.json }
    )
  }

  function commitAlreadyPreAndOrStableReleased(
    sha: string,
    tags: GroupBy<ParsedTag, 'type'>
  ): void {
    const baseMessage = `You cannot make a preview release for this commit because ${
      (tags.pre_release?.length ?? 0) > 0 &&
      (tags.stable_release?.length ?? 0) > 0
        ? 'stable and preview releases were already made'
        : (tags.pre_release?.length ?? 0) > 0
        ? 'a preview release was already made.'
        : 'a stable release was already made.'
    }`
    if (opts.json) {
      Output.outputException('invalid_pre_release_case', baseMessage, {
        sha,
        preReleaseTag: tags.pre_release?.[0]?.value.version,
        stableReleaseTag: tags.stable_release?.[0]?.value.version,
        otherTags: tags.unknown?.map(t => t.value) ?? [],
      })
    } else {
      let message = ''
      message += baseMessage + '\n'
      message += '\n'
      message += indentBlock4(stripIndents`
        The commit is:           ${sha}
        ${renderTagsPresent(tags)}
      `)
      Output.outputRaw(message)
    }
  }

  function dryRun(info: ReleaseBrief): void {
    Output.outputOk('dry_run', info)
  }

  return {
    releaseType,
    noReleaseToMake,
    invalidBranchForPreRelease,
    commitAlreadyPreAndOrStableReleased,
    dryRun,
  }
}

/**
 * Given groups of parsed tags, create a nice summary of the commit for the user
 * to read in their terminal.
 */
function renderTagsPresent(tags: GroupBy<ParsedTag, 'type'>): string {
  const NA = 'N/A'
  const [expectedMaybePreRelease, ...unexpectedOtherPreReleases] =
    tags.pre_release ?? []
  const [expectedMaybeStableRelease, ...unexpectedOtherStableReleases] =
    tags.stable_release ?? []

  let message = ''

  message += `The stable release is:   ${expectedMaybeStableRelease?.value.format() ??
    NA}\n`
  message += `The preview release is:  ${expectedMaybePreRelease?.value.format() ??
    NA}\n`
  message += `Other tags present:      ${
    !tags.unknown ? NA : tags.unknown.map(t => t.value).join(', ')
  }\n`
  if (
    unexpectedOtherPreReleases.length > 0 ||
    unexpectedOtherStableReleases.length > 0
  ) {
    message += '\nWARNING\n\n'
    if (unexpectedOtherStableReleases) {
      message +=
        '- Multiple stable releases appear to have been on this commit when there should only ever been 0 or 1\n'
    }
    if (unexpectedOtherPreReleases) {
      message +=
        '- Multiple preview releases appear to have been on this commit when there should only ever been 0 or 1\n'
    }
    message += '\n'
    message += 'This may have happened because:\n'
    message += '- A human manually fiddled with the git tags\n'
    message += '- Another tool than libre acted on the git tags\n'
    message += '- There is a bug in libre\n'
    message += '\n'
    message +=
      'If you think there is a bug in libre please open an issue: https://github.com/prisma-labs/libre/issues/new.\n'
    message +=
      'Otherwise consider manually cleaning up this commit to fix the above violated invariant(s).\n'
  }

  return message
}
