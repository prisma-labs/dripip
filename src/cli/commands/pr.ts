import Command, { flags } from '@oclif/command'
import * as Semver from '../../lib/semver'
import * as Context from '../../utils/context'
import { isTrunk } from '../../utils/context-checkers'
import { check, guard, Validator } from '../../utils/contrext-guard'
import * as Output from '../../utils/output'
import * as Publish from '../../utils/publish'
import * as Rel from '../../utils/release'

export class Preview extends Command {
  static flags = {
    ['build-num']: flags.integer({
      description:
        'Force a build number. Should not be needed generally. For exceptional cases.',
      char: 'n',
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

    const context = await Context.scan({})

    const report = check({ context })
      .must(isTrunk())
      .must(notAlreadyStableOrPreviewReleased())
      .must(haveCommitsInTheSeries())
      .must(haveMeaningfulCommitsInTheSeries())
      .run()

    const maybeRelease = Rel.getNextPreview(context.series)

    if (flags['build-num'] && !Rel.isNoReleaseReason(maybeRelease)) {
      maybeRelease.version = Semver.setBuildNum(
        maybeRelease.version as Semver.PreviewVer,
        flags['build-num']
      )
    }

    guard({ report, context: context, json: flags.json })
    // const release = maybeRelease as Rel.Release // now validated

    const version = {
      major: 0,
      minor: 0,
      patch: 0,
      version: `0.0.0-pr.${
        context.currentBranch.prs.open!.number
      }.${context.series.current.sha.slice(0, 7)}`,
      vprefix: false,
      preRelease: {
        identifier: 'pr',
        prNum: context.currentBranch.prs.open!.number,
        shortSha: context.series.current.sha.slice(0, 7),
      },
    } as Semver.PullRequestVer

    if (flags['dry-run']) {
      return Output.outputOk('dry_run', {
        report: report,
        release: maybeRelease,
        commits: context.series.commitsInNextPreview.map(c => c.message),
      })
    }

    await Publish.publish(
      {
        distTag: `pr.${context.currentBranch.prs.open!.number}`,
        version: version.version,
      },
      {
        skipNPM: flags['skip-npm'],
        gitTagForDistTags: false,
      }
    )
  }
}

//
// Validators
//

function haveCommitsInTheSeries(): Validator {
  return {
    code: 'series_empty',
    summary:
      'A preview release must have at least one commit since the last preview',
    run(ctx) {
      const release = Rel.getNextPreview(ctx.series)
      return release !== 'empty_series'
    },
  }
}

function haveMeaningfulCommitsInTheSeries(): Validator {
  return {
    code: 'series_only_has_meaningless_commits',
    summary: 'A preview release must have at least one semantic commit',
    run(ctx) {
      const release = Rel.getNextPreview(ctx.series)
      return release !== 'no_meaningful_change'
      // todo
      // hint:   //             'All commits are either meta or not conforming to conventional commit. No release will be made.',
    },
  }
}

function notAlreadyStableOrPreviewReleased(): Validator {
  return {
    code: 'preview_on_commit_with_preview_and_or_stable',
    summary:
      'A preview release requires the commit to have no existing stable or preview release.',
    run(ctx) {
      if (
        ctx.series.current.releases.stable &&
        ctx.series.current.releases.preview
      ) {
        return { kind: 'fail', details: { subCode: 'preview_and_stable' } }
      }

      if (ctx.series.current.releases.stable) {
        return { kind: 'fail', details: { subCode: 'stable' } }
      }

      if (ctx.series.current.releases.preview) {
        return { kind: 'fail', details: { subCode: 'preview' } }
      }

      return true
    },
  }
}

// /**
//  * Output that current conditions do not permit a preview release.
//  */
// function invalidBranchForPreRelease(): void {
//   Output.output(
//     Output.createException('invalid_branch_for_pre_release', {
//       summary:
//         'Preview releases are only supported on trunk (master) branch or branches with _open_ pull-requests. If you want to make a preview release for this branch then open a pull-request for it.',
//     }),
//     { json: opts.json }
//   )
// }
