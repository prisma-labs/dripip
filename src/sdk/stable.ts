import * as Changelog from '../lib/changelog'
import { setupNPMAuthfileOnCI } from '../lib/npm-auth'
import { publishChangelog } from '../lib/publish-changelog'
import { publishPackage, PublishPlan } from '../lib/publish-package'
import { getContext } from '../utils/context'
import { branchSynced, isTrunk, npmAuthSetup } from '../utils/context-checkers'
import { check, guard, Validator } from '../utils/context-guard'
import { octokit } from '../utils/octokit'
import { createDidNotPublish, createDidPublish, createDryRun } from '../utils/output'
import { getNextStable, Release } from '../utils/release'

export interface Options {
  cwd?: string
  dryRun: boolean
  json: boolean
  progress: boolean
  changelog: boolean
  overrides?: {
    skipNpm?: boolean
    buildNum?: number
    trunk?: string
  }
  readFromCIEnvironment?: boolean
}

export async function runStableRelease(options: Options) {
  const cwd = options.cwd ?? process.cwd()
  const readFromCIEnvironment = options.readFromCIEnvironment ?? true
  const context = await getContext({
    cwd,
    readFromCIEnvironment,
    overrides: {
      trunk: options.overrides?.trunk ?? null,
    },
  })

  const report = check({ context: context })
    .errorUnless(npmAuthSetup())
    .errorUnless(isTrunk())
    .errorUnless(branchSynced())
    .stopUnless(notAlreadyStableRelease())
    .stopUnless(haveMeaningfulCommitsInTheSeries())
    .run()

  const maybeRelease = getNextStable(context.series)
  const changelog = Changelog.renderFromSeries(context.series, { as: 'markdown' })

  if (options.dryRun) {
    return createDryRun({
      report,
      release: maybeRelease,
      commits: context.series.commitsInNextStable,
      changelog: changelog,
    })
  }

  if (report.errors.length) {
    guard({ context, report, json: options.json })
  }

  if (report.stops.length) {
    return createDidNotPublish({ reasons: report.stops })
  }

  const release = maybeRelease as Release // now validated

  const publishPlan: PublishPlan = {
    release: {
      version: release.version.version,
      distTag: 'latest',
      extraDistTags: ['next'],
    },
    options: {
      npm: options.overrides?.skipNpm !== true,
    },
  }

  setupNPMAuthfileOnCI()

  for await (const progress of publishPackage(publishPlan)) {
    if (!options.json) {
      console.log(progress)
    }
  }

  const releaseInfo = {
    ...release,
    head: {
      sha: context.series.current.sha,
    },
  }

  if (options.changelog && !options.dryRun) {
    await publishChangelog({
      octokit: octokit,
      release: releaseInfo,
      repo: context.githubRepo,
      body: changelog,
    })
  }

  return createDidPublish({ release: { notes: changelog, ...publishPlan.release } })
}

//
// Validators
//

function haveMeaningfulCommitsInTheSeries(): Validator {
  return {
    code: 'series_only_has_meaningless_commits',
    summary: 'A stable release must have at least one semantic commit',
    run(ctx) {
      const release = getNextStable(ctx.series)
      return release !== 'no_meaningful_change'
      // todo
      // hint:   //             'All commits are either meta or not conforming to conventional commit. No release will be made.',
    },
  }
}

function notAlreadyStableRelease(): Validator {
  return {
    code: 'commit_already_has_stable_release',
    summary: 'A stable release requires the commit to have no existing stable release',
    run(ctx) {
      return ctx.series.current.releases.stable === null
    },
  }
}
