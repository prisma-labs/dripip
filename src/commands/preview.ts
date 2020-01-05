import Command, { flags } from '@oclif/command'
import createGit from 'simple-git/promise'
import { indentBlock4 } from '../lib/utils'
import * as Rel from '../lib/release'
import { stripIndents } from 'common-tags'
import * as Git from '../lib/git'
import * as Output from '../lib/output'
import * as Publish from '../lib/publish'
import * as Semver from '../lib/semver'

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

    const series = await Rel.getCurrentSeries(git)

    if (series.current.releases.stable || series.current.releases.preview) {
      return send.commitAlreadyPreAndOrStableReleased(series.current)
    }

    if (await Git.isTrunk(git)) {
      if (flags['show-type']) {
        return send.releaseType({ type: 'stable', reason: 'is_trunk' })
      }

      const nextRelease = await calcNextStablePreview(series)

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

      // force update so the tag moves to a new commit
      await git.raw(['tag', '-f', 'next'])
      await git.raw(['push', 'origin', ':refs/tags/next'])
      await git.raw(['push', '--tags'])
      console.log('updated git-tag "next"')
      return
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
  bumpType: Semver.MajMinPat
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
function calcNextStablePreview(series: Rel.Series): null | ReleaseBrief {
  // We need all the commits since the last stable release to calculate the
  // pre-release. The pre-release is a bump against the last stable plus a
  // build number. The bump type used to bump is based on the aggregate of
  // all commits since the last stable. While the build number always
  // increments the maj/min/pat may only increment upon the first
  // pre-release, unless a later pre-release incurs a higher-order bump-type
  // e.g. begin with patch-kind changes followed later by min-kind changes.

  // Calculate the next version

  const incType = Semver.calcBumpType(
    series.commitsSinceStable.map(c => c.message)
  )

  if (incType === null) return null

  const nextStable = Semver.incStable(
    incType,
    series.previousStable?.releases.stable ?? Semver.zeroVer
  )

  const nextVer = Semver.stableToPreview(
    nextStable,
    'next',
    (series.previousPreview?.releases.preview.preRelease.buildNum ??
      Semver.zeroBuildNum) + 1
  )

  // TODO simplify by exposing series struct as is, little value in the remix here
  return {
    currentStable: series.previousStable?.releases.stable.version ?? null,
    currentPreviewNumber:
      series.previousPreview?.releases.preview.preRelease.buildNum ?? null,
    nextStable: nextStable.version,
    nextPreviewNumber: nextVer.preRelease.buildNum,
    currentVersion:
      series.previousPreview?.releases.preview.version ??
      series.previousStable?.releases.stable.version ??
      null,
    nextVersion: nextVer.version,
    commitsInRelease: series.previousPreview
      ? series.commitsSincePreview.map(c => c.message)
      : series.commitsSinceStable.map(c => c.message),
    bumpType: incType,
    isFirstVer:
      series.previousStable === null && series.previousPreview === null,
    isFirstVerStable: series.previousStable === null,
    isFirstVerPreRelease: series.previousPreview === null,
  }
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

  function commitAlreadyPreAndOrStableReleased(c: Rel.Commit): void {
    const baseMessage = `You cannot make a preview release for this commit because ${
      c.releases.preview && c.releases.stable
        ? 'stable and preview releases were already made'
        : c.releases.preview
        ? 'a preview release was already made.'
        : 'a stable release was already made.'
    }`
    if (opts.json) {
      Output.outputException('invalid_pre_release_case', baseMessage, {
        json: true,
        context: {
          sha: c.sha,
          preReleaseTag: c.releases.preview?.version,
          stableReleaseTag: c.releases.stable?.version,
          otherTags: c.nonReleaseTags,
        },
      })
    } else {
      let message = ''
      message += baseMessage + '\n'
      message += '\n'
      message += indentBlock4(stripIndents`
        The commit is:           ${c.sha}
        ${renderTagsPresent(c)}
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
function renderTagsPresent(c: Rel.Commit): string {
  const NA = 'N/A'
  let message = ''
  message += `The stable release is:   ${c.releases.stable?.version ?? NA}\n`
  message += `The preview release is:  ${c.releases.preview?.version ?? NA}\n`
  message += `Other tags present:      ${
    c.nonReleaseTags.length === 0 ? NA : c.nonReleaseTags.join(', ')
  }\n`
  // TODO make part of diagnostics
  // if (
  //   unexpectedOtherPreReleases.length > 0 ||
  //   unexpectedOtherStableReleases.length > 0
  // ) {
  //   message += '\nWARNING\n\n'
  //   if (unexpectedOtherStableReleases) {
  //     message +=
  //       '- Multiple stable releases appear to have been on this commit when there should only ever been 0 or 1\n'
  //   }
  //   if (unexpectedOtherPreReleases) {
  //     message +=
  //       '- Multiple preview releases appear to have been on this commit when there should only ever been 0 or 1\n'
  //   }
  //   message += '\n'
  //   message += 'This may have happened because:\n'
  //   message += '- A human manually fiddled with the git tags\n'
  //   message += '- Another tool than dripip acted on the git tags\n'
  //   message += '- There is a bug in dripip\n'
  //   message += '\n'
  //   message +=
  //     'If you think there is a bug in dripip please open an issue: https://github.com/prisma-labs/dripip/issues/new.\n'
  //   message +=
  //     'Otherwise consider manually cleaning up this commit to fix the above violated invariant(s).\n'
  // }

  return message
}
