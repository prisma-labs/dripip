import Command, { flags } from '@oclif/command'
import * as Semver from '../../lib/semver'
import * as Context from '../../utils/context'
import { check, guard, Validator } from '../../utils/contrext-guard'
import * as Output from '../../utils/output'
import * as Publish from '../../utils/publish'
import * as Rel from '../../utils/release'

export class Preview extends Command {
  static flags = {
    'dry-run': flags.boolean({
      default: false,
      description: 'output what the next version would be if released now',
      char: 'd',
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
      .must(branchHasOpenPR())
      .must(commitNotAlreadyReleased())
      // todo only we if can figoure the commits since last pr release
      // .must(haveMeaningfulCommitsInTheSeries())
      .run()

    // if we have preflight errors then we won't be able to calculate the
    // release info. But if doing a dry-run we want to be consistent with
    // other commands that embed report into returned data rather than
    // throwing an error.
    if (report.mustFailures.length && flags['dry-run']) {
      return Output.outputOk('dry_run', {
        report: report,
        release: null, // cannot compute without PR info
      })
    }

    guard({ report, context: context, json: flags.json })

    const version = {
      major: 0,
      minor: 0,
      patch: 0,
      // prettier-ignore
      version: `0.0.0-pr.${context.currentBranch.prs.open!.number}.${context.series.current.sha.slice(0, 7)}`,
      vprefix: false,
      preRelease: {
        identifier: 'pr',
        prNum: context.currentBranch.prs.open!.number,
        shortSha: context.series.current.sha.slice(0, 7),
      },
    } as Semver.PullRequestVer

    const release = {
      distTag: `pr.${context.currentBranch.prs.open!.number}`,
      version: version.version,
    }

    if (flags['dry-run']) {
      return Output.outputOk('dry_run', {
        report: report,
        release: release,
      })
    }

    await Publish.publish({
      release: release,
      options: {
        gitTagForDistTags: false,
      },
    })
  }
}

//
// Validators
//

function commitNotAlreadyReleased(): Validator {
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

function branchHasOpenPR(): Validator {
  return {
    code: 'pr_release_without_open_pr',
    summary:
      'Pull-Request releases are only supported on branches with _open_ pull-requests',
    run(ctx) {
      return ctx.currentBranch.prs.open !== null
    },
  }
}
