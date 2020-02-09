import Command, { flags } from '@oclif/command'
import { stripIndents } from 'common-tags'
import createGit from 'simple-git/promise'
import * as Semver from '../../lib/semver'
import { casesHandled, indentBlock4 } from '../../lib/utils'
import * as Context from '../../utils/context'
import * as Output from '../../utils/output'
import * as Publish from '../../utils/publish'
import * as Rel from '../../utils/release'

type PreviewTypeFound = {
  type: string
  reason: string
}

export class Preview extends Command {
  static flags = {
    trunk: flags.string({
      default: '',
      description:
        'State which branch is trunk. Defaults to honuring the "base" branch setting in the GitHub repo settings.',
    }),
    ['build-num']: flags.integer({
      description:
        'Force a build number. Should not be needed generally. For exceptional cases.',
      char: 'n',
    }),
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
      char: 'd',
    }),
    // todo test skip-npm
    'skip-npm': flags.boolean({
      default: false,
      description: 'skip the step of publishing the package to npm',
    }),
    json: flags.boolean({
      default: false,
      description: 'format output as JSON',
      char: 'j',
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

    const ctx = await Context.scan({
      overrides: {
        trunk: flags.trunk || null,
      },
    })

    if (
      ctx.series.current.releases.stable ||
      ctx.series.current.releases.preview
    ) {
      return send.commitAlreadyPreAndOrStableReleased(ctx.series.current)
    }

    if (ctx.currentBranch.isTrunk) {
      if (flags['show-type']) {
        return send.releaseType({ type: 'stable', reason: 'is_trunk' })
      }

      const release = Rel.getNextPreview(ctx.series)

      if (Rel.isNoReleaseReason(release)) {
        return send.noReleaseToMake(release)
      }

      if (flags['build-num']) {
        release.version = Semver.setBuildNum(
          release.version as Semver.PreviewVer,
          flags['build-num']
        )
      }

      if (flags['dry-run']) {
        return send.dryRun(ctx.series, release)
      }

      await Publish.publish(
        {
          distTag: 'next',
          version: release.version.version,
        },
        { skipNPM: flags['skip-npm'] }
      )

      // force update so the tag moves to a new commit
      await git.raw(['tag', '-f', 'next'])
      await git.raw(['push', 'origin', ':refs/tags/next'])
      await git.raw(['push', '--tags'])
      console.log('updated git-tag "next"')
      return
    }

    if (!ctx.currentBranch.prs.open) {
      // todo show helpful info if found past closed prs
      return send.invalidBranchForPreRelease()
    }

    if (flags['show-type']) {
      return send.releaseType({
        type: 'pr',
        reason: 'git_branch_github_api',
      })
    }

    // TODO
    return process.stdout.write('todo: pr preview release')
  }
}

type OutputterOptions = {
  json: boolean
}

function createOutputters(opts: OutputterOptions) {
  /**
   * Output the release type.
   */
  function releaseType(info: PreviewTypeFound): void {
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
  function noReleaseToMake(reason: Rel.NoReleaseReason): void {
    Output.output(
      reason === 'no_meaningful_change'
        ? // todo forward reason code
          Output.createException('no_release_to_make', {
            summary:
              'All commits are either meta or not conforming to conventional commit. No release will be made.',
          })
        : reason === 'empty_series'
        ? Output.createException(reason, {
            summary: 'There are no commits to release since the last stable.',
          })
        : (casesHandled(reason) as never),
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

  function dryRun(series: Rel.Series, nextRel: Rel.Release): void {
    Output.outputOk('dry_run', {
      bumpType: nextRel.bumpType,
      version: nextRel.version.version,
      commits: series.commitsInNextPreview.map(c => c.message),
    })
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
