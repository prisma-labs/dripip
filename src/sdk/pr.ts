import { setupNPMAuthfileOnCI } from '../lib/npm-auth'
import { publishPackage, PublishPlan } from '../lib/publish-package'
import { PullRequestVer } from '../lib/semver'
import { getContext } from '../utils/context'
import { npmAuthSetup } from '../utils/context-checkers'
import { check, guard, Validator } from '../utils/context-guard'
import { createDidNotPublish, createDidPublish, createDryRun } from '../utils/output'
import { getNextPreReleaseBuildNum } from '../utils/pr-release'

interface Options {
  dryRun: boolean
  progress: boolean
  json: boolean
  cwd?: string
  readFromCIEnvironment?: boolean
}

export async function runPullRequestRelease(options: Options) {
  const cwd = options.cwd ?? process.cwd()
  const readFromCIEnvironment = options.readFromCIEnvironment ?? true
  const context = await getContext({ cwd, readFromCIEnvironment })

  const report = check({ context })
    .errorUnless(npmAuthSetup())
    .errorUnless(branchHasOpenPR())
    // todo only we if can figure the commits since last pr release
    // .must(haveMeaningfulCommitsInTheSeries())
    .run()

  // if we have preflight errors then we won't be able to calculate the
  // release info. But if doing a dry-run we want to be consistent with
  // other commands that embed report into returned data rather than
  // throwing an error.
  if (report.errors.length && options.dryRun) {
    return createDryRun({
      report: report,
      release: null, // cannot compute without PR info
    })
  }

  if (report.errors.length) {
    guard({ context, report, json: options.json })
  }

  if (report.stops.length) {
    return createDidNotPublish({ reasons: report.stops })
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
  } as PullRequestVer

  // todo show publish plan in dryrun for other commands too
  const publishPlan: PublishPlan = {
    release: {
      distTag: `pr.${context.currentBranch.pr!.number}`,
      version: versionInfo.version,
    },
    options: {
      gitTag: 'none',
    },
  }

  if (options.dryRun) {
    return createDryRun({
      report: report,
      publishPlan: publishPlan,
    })
  }

  setupNPMAuthfileOnCI()

  for await (const progress of publishPackage(publishPlan)) {
    // turn this func into async iterator and yield structured progress
    if (options.progress) {
      console.log(progress)
    }
  }

  return createDidPublish({ release: publishPlan.release })
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
