import Command, { flags } from '@oclif/command'
import * as Context from '../../utils/context'
import { branchSynced, isTrunk } from '../../utils/context-checkers'
import { check, guard, Validator } from '../../utils/contrext-guard'
import * as Output from '../../utils/output'
import { publish } from '../../utils/publish'
import * as Rel from '../../utils/release'

export class Stable extends Command {
  static flags = {
    trunk: flags.string({
      default: '',
      description:
        'State which branch is trunk. Defaults to honuring the "base" branch setting in the GitHub repo settings.',
    }),
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
    'skip-npm': flags.boolean({
      default: false,
      description: 'skip the step of publishing the package to npm',
    }),
  }
  async run() {
    const { flags } = this.parse(Stable)

    const context = await Context.scan({
      overrides: {
        trunk: flags.trunk || null,
      },
    })

    const report = check({ context })
      .must(isTrunk())
      .must(branchSynced())
      .must(notAlreadyStableRelease())
      .must(haveMeaningfulCommitsInTheSeries())
      .run()

    const maybeRelease = Rel.getNextStable(context.series)

    if (flags['dry-run']) {
      return Output.outputOk('dry_run', {
        report,
        release: maybeRelease,
        commits: context.series.commitsInNextStable,
      })
    }

    guard({ context, report, json: flags.json })
    const release = maybeRelease as Rel.Release // now validated

    await publish({
      release: {
        version: release.version.version,
        distTag: 'latest',
        additiomalDistTags: ['next'],
      },
      options: {
        skipNPM: flags['skip-npm'],
      },
    })
  }
}

//
// Validators
//

function haveMeaningfulCommitsInTheSeries(): Validator {
  return {
    code: 'series_only_has_meaningless_commits',
    summary: 'A stable release must have at least one semantic commit',
    run(ctx) {
      const release = Rel.getNextStable(ctx.series)
      return release !== 'no_meaningful_change'
      // todo
      // hint:   //             'All commits are either meta or not conforming to conventional commit. No release will be made.',
    },
  }
}

function notAlreadyStableRelease(): Validator {
  return {
    code: 'commit_already_has_stable_release',
    summary:
      'A stable release requires the commit to have no existing stable release',
    run(ctx) {
      return ctx.series.current.releases.stable === null
    },
  }
}
