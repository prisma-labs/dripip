import Command, { flags } from '@oclif/command'
import { setupNPMAuthfileOnCI } from '../../lib/npm-auth'
import * as Semver from '../../lib/semver'
import { getContext } from '../../utils/context'
import { npmAuthSetup } from '../../utils/context-checkers'
import { check, guard, Validator } from '../../utils/contrext-guard'
import * as Output from '../../utils/output'
import { getNextPreReleaseBuildNum } from '../../utils/pr-release'
import * as Publish from '../../utils/publish'

export class PR extends Command {
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
    const { flags } = this.parse(PR)

    const context = await getContext()

    const report = check({ context })
      .errorUnless(npmAuthSetup())
      .errorUnless(branchHasOpenPR())
      // todo only we if can figoure the commits since last pr release
      // .must(haveMeaningfulCommitsInTheSeries())
      .run()

    // if we have preflight errors then we won't be able to calculate the
    // release info. But if doing a dry-run we want to be consistent with
    // other commands that embed report into returned data rather than
    // throwing an error.
    if (report.errors.length && flags['dry-run']) {
      return Output.outputOk('dry_run', {
        report: report,
        release: null, // cannot compute without PR info
      })
    }

    if (report.errors.length) {
      guard({ context, report, json: flags.json })
    }

    if (flags.json && report.stops.length) {
      Output.didNotPublish({ reasons: report.stops })
      return this.exit(0)
    }

    const versionPrefix = `0.0.0-pr.${context.currentBranch.pr!.number}.`
    const versionBuildNum = getNextPreReleaseBuildNum(context.package.name, versionPrefix)
    const version = `${versionPrefix}${versionBuildNum}.${context.series.current.sha.slice(0, 7)}`

    const versionInfo = {
      major: 0,
      minor: 0,
      patch: 0,
      // prettier-ignore
      version: version,
      vprefix: false,
      preRelease: {
        identifier: 'pr',
        prNum: context.currentBranch.pr!.number,
        shortSha: context.series.current.sha.slice(0, 7),
      },
    } as Semver.PullRequestVer

    // todo show publish plan in dryrun for other commands too
    const publishPlan: Publish.PublishPlan = {
      release: {
        distTag: `pr.${context.currentBranch.pr!.number}`,
        version: versionInfo.version,
      },
      options: {
        gitTag: 'none',
        showProgress: !flags.json,
      },
    }

    if (flags['dry-run']) {
      return Output.outputOk('dry_run', {
        report: report,
        publishPlan: publishPlan,
      })
    }

    setupNPMAuthfileOnCI()

    await Publish.publish(publishPlan)

    if (flags.json) {
      Output.didPublish({ release: publishPlan.release })
    }
  }
}

//
// Validators
//

function branchHasOpenPR(): Validator {
  return {
    code: 'pr_release_without_open_pr',
    summary: 'Pull-Request releases are only supported on branches with _open_ pull-requests',
    run(ctx) {
      return ctx.currentBranch.pr !== null
    },
  }
}
