import Command, { flags } from '@oclif/command'
import * as cp from 'child_process'
import { setupNPMAuthfileOnCI } from '../../lib/npm-auth'
import * as Semver from '../../lib/semver'
import { numericAscending } from '../../lib/utils'
import * as Context from '../../utils/context'
import { npmAuthSetup } from '../../utils/context-checkers'
import { check, guard, Validator } from '../../utils/contrext-guard'
import * as Output from '../../utils/output'
import * as Publish from '../../utils/publish'

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
      .must(npmAuthSetup())
      .must(branchHasOpenPR())
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

    const versionPrefix = `0.0.0-pr.${context.currentBranch.pr!.number}.`
    const versionBuildNum = getNextPreReleaseBuildNum(
      context.package.name,
      versionPrefix
    )
    const version = `${versionPrefix}${versionBuildNum}.${context.series.current.sha.slice(
      0,
      7
    )}`

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
      },
    }

    if (flags['dry-run']) {
      return Output.outputOk('dry_run', {
        report: report,
        publishPlan,
      })
    }

    setupNPMAuthfileOnCI()
    await Publish.publish(publishPlan)
  }
}

//
// Validators
//

function branchHasOpenPR(): Validator {
  return {
    code: 'pr_release_without_open_pr',
    summary:
      'Pull-Request releases are only supported on branches with _open_ pull-requests',
    run(ctx) {
      return ctx.currentBranch.pr !== null
    },
  }
}

function getNextPreReleaseBuildNum(
  packageName: string,
  prefix: string
): number {
  const result = cp.spawnSync('npm', [
    'show',
    packageName,
    'versions',
    '--json',
  ])

  if (result.error) throw result.error

  const versions: string[] = JSON.parse(result.stdout)
  const nextBuildNum = getNextPreReleaseBuildNumFromVersions(prefix, versions)
  return nextBuildNum
}

function getNextPreReleaseBuildNumFromVersions(
  prefix: string,
  versions: string[]
): number {
  const filteredSorted = versions
    .filter(v => v.startsWith(prefix))
    .map(v => {
      const match = v.slice(prefix.length).match(/^(\d+)$|^(\d+)\./)
      if (match === null) return null
      if (match[1] !== undefined) return match[1]
      if (match[2] !== undefined) return match[2]
      // never
    })
    .filter(v => v !== undefined)
    .map(v => Number(v))
    .sort(numericAscending)

  if (filteredSorted.length === 0) return 1
  return filteredSorted.pop()! + 1
}

// // todo put into unit test
// const vs = [
//   '0.0.0-pr.30.1.1079baa',
//   '0.0.0-pr.30.2.1c2e772',
//   '0.0.0-pr.30.5.3a9ec9f',
//   '0.0.0-pr.30.3.6f29f57',
//   '0.0.0-pr.30.46.ee27408',
//   '0.2.0',
//   '0.2.7',
//   '0.2.8-next.1',
//   '0.2.8',
//   '0.2.9-next.2',
//   '0.2.9',
//   '0.3.0',
//   '0.3.1',
//   '0.3.2',
//   '0.4.0',
//   '0.5.0',
//   '0.6.0-next.1',
//   '0.6.0-next.2',
//   '0.6.0',
//   '0.6.1-next.1',
//   '0.6.1-next.2',
//   '0.6.1',
// ]

// // getNextPreReleaseBuildNumFromVersions('0.0.0-pr.30.', vs) //?

// '1.1079baa'.match(/^(\d+)$|^(\d+)\./) //?
// '1079'.match(/^(\d+)$|^(\d+)\./) //?
// '1079baa'.match(/^(\d+)$|^(\d+)\./) //?
