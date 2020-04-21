import { setupNPMAuthfileOnCI } from '../lib/npm-auth'
import { publish, PublishPlan } from '../lib/publish'
import { getContext } from '../utils/context'
import { branchSynced, isTrunk, npmAuthSetup } from '../utils/context-checkers'
import { check, guard, Validator } from '../utils/contrext-guard'
import { createDidNotPublish, createDidPublish, createDryRun } from '../utils/output'
import { getNextStable, Release } from '../utils/release'

export interface Input {
  cwd: string
  dryRun: boolean
  json: boolean
  progress: boolean
  changelog: boolean
  overrides?: {
    skipNpm?: boolean
    buildNum?: number
    trunk?: string
  }
}

export async function runStableRelease(input: Input) {
  const context = await getContext({
    cwd: input.cwd,
    overrides: {
      trunk: input.overrides?.trunk ?? null,
    },
  })

  const report = check({ context })
    .errorUnless(npmAuthSetup())
    .errorUnless(isTrunk())
    .errorUnless(branchSynced())
    .stopUnless(notAlreadyStableRelease())
    .stopUnless(haveMeaningfulCommitsInTheSeries())
    .run()

  const maybeRelease = getNextStable(context.series)

  if (input.dryRun) {
    return createDryRun({
      report,
      release: maybeRelease,
      commits: context.series.commitsInNextStable,
    })
  }

  if (report.errors.length) {
    guard({ context, report, json: input.json })
  }

  if (input.json && report.stops.length) {
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
      npm: input.overrides?.skipNpm,
    },
  }

  setupNPMAuthfileOnCI()

  for await (const progress of publish(publishPlan)) {
    if (!input.json) {
      console.log(progress)
    }
  }

  return createDidPublish({ release: publishPlan.release })
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
