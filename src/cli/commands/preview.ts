import Command, { flags } from '@oclif/command'
import { setupNPMAuthfileOnCI } from '../../lib/npm-auth'
import * as Semver from '../../lib/semver'
import * as Context from '../../utils/context'
import { isTrunk, npmAuthSetup } from '../../utils/context-checkers'
import { check, guard, Validator } from '../../utils/contrext-guard'
import * as Output from '../../utils/output'
import * as Publish from '../../utils/publish'
import * as Rel from '../../utils/release'

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
    'dry-run': flags.boolean({
      default: false,
      description: 'output what the next version would be if released now',
      char: 'd',
    }),
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

    const context = await Context.scan({
      overrides: {
        trunk: flags.trunk || null,
      },
    })

    const report = check({ context })
      .must(npmAuthSetup())
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

    if (flags['dry-run']) {
      return Output.outputOk('dry_run', {
        report: report,
        release: maybeRelease,
        commits: context.series.commitsInNextPreview.map(c => c.message),
      })
    }

    guard({ report, context, json: flags.json })
    const release = maybeRelease as Rel.Release // now validated

    const publishPlan: Publish.PublishPlan = {
      release: {
        distTag: 'next',
        version: release.version.version,
      },
      options: {
        skipNPM: flags['skip-npm'],
        showProgress: !flags.json,
      },
    }

    setupNPMAuthfileOnCI()

    await Publish.publish(publishPlan)

    if (flags.json) {
      Output.outputJson(publishPlan.release)
    }
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
