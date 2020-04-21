import { setupNPMAuthfileOnCI } from '../lib/npm-auth'
import { publish, PublishPlan } from '../lib/publish'
import { publishChangelog } from '../lib/publish-changelog'
import { PreviewVer, setBuildNum } from '../lib/semver'
import { getContext } from '../utils/context'
import { isTrunk, npmAuthSetup } from '../utils/context-checkers'
import { check, guard, Validator } from '../utils/contrext-guard'
import { octokit } from '../utils/octokit'
import { createDidNotPublish, createDidPublish, createDryRun } from '../utils/output'
import { getNextPreview, isNoReleaseReason, Release } from '../utils/release'

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

export async function runPreviewRelease(input: Input) {
  const context = await getContext({
    cwd: input.cwd,
    overrides: {
      trunk: input.overrides?.trunk ?? null,
    },
  })

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

  const report = check({ context })
    .errorUnless(npmAuthSetup())
    .errorUnless(isTrunk())
    .errorUnless(notAlreadyStableOrPreviewReleased())
    .stopUnless(haveCommitsInTheSeries())
    .stopUnless(haveMeaningfulCommitsInTheSeries())
    .run()

  const maybeRelease = getNextPreview(context.series)

  if (input.overrides?.buildNum !== undefined && !isNoReleaseReason(maybeRelease)) {
    maybeRelease.version = setBuildNum(maybeRelease.version as PreviewVer, input.overrides.buildNum)
  }

  if (input.dryRun) {
    return createDryRun({
      report: report,
      release: maybeRelease,
      commits: context.series.commitsInNextPreview.map((c) => c.message),
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
      distTag: 'next',
      version: release.version.version,
    },
    options: {
      npm: input.overrides?.skipNpm,
    },
  }

  setupNPMAuthfileOnCI()

  for await (const progress of publish(publishPlan)) {
    if (input.progress) {
      console.log(progress)
    }
  }

  if (input.changelog && !input.dryRun) {
    await publishChangelog({
      octokit: octokit,
      release: release,
      repo: context.githubRepo,
      series: context.series,
    })
  }

  return createDidPublish({ release: publishPlan.release })
}

//
// Validators
//

function haveCommitsInTheSeries(): Validator {
  return {
    code: 'series_empty',
    summary: 'A preview release must have at least one commit since the last preview',
    run(ctx) {
      const release = getNextPreview(ctx.series)
      return release !== 'empty_series'
    },
  }
}

function haveMeaningfulCommitsInTheSeries(): Validator {
  return {
    code: 'series_only_has_meaningless_commits',
    summary: 'A preview release must have at least one semantic commit',
    run(ctx) {
      const release = getNextPreview(ctx.series)
      return release !== 'no_meaningful_change'
      // todo
      // hint:   //             'All commits are either meta or not conforming to conventional commit. No release will be made.',
    },
  }
}

function notAlreadyStableOrPreviewReleased(): Validator {
  return {
    code: 'preview_on_commit_with_preview_and_or_stable',
    summary: 'A preview release requires the commit to have no existing stable or preview release.',
    run(ctx) {
      if (ctx.series.current.releases.stable && ctx.series.current.releases.preview) {
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
