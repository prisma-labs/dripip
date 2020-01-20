import Command, { flags } from '@oclif/command'
import * as Output from '../utils/output'
import * as Context from '../utils/context'
import * as Rel from '../utils/release'
import * as Semver from '../lib/semver'
import { publish } from '../utils/publish'
import createGit from 'simple-git/promise'

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
    }),
    json: flags.boolean({
      default: false,
      description: 'format output as JSON',
    }),
  }
  async run() {
    const { flags } = this.parse(Stable)
    const git = createGit()
    const show = createShowers({ json: flags.json })
    const check = createValidators({ json: flags.json })
    const ctx = await Context.scan({
      overrides: {
        trunk: flags.trunk || null,
      },
    })

    if (!check.isTrunk(ctx)) return
    if (!check.branchSynced(ctx)) return
    if (!check.notAlreadyStableReleased(ctx)) return

    const release = Rel.getNextStable(ctx.series)

    if (Rel.isNoReleaseReason(release)) {
      return show.noReleaseNeeded(ctx, release)
    }

    if (flags['dry-run']) {
      return show.dryRun(ctx, release)
    }

    await publish({
      version: release.version.version,
      distTag: 'latest',
      additiomalDistTags: ['next'],
    })

    // force update so the tag moves to a new commit
    await git.raw(['tag', '-f', 'latest'])
    await git.raw(['tag', '-f', 'next'])
    // https://stackoverflow.com/questions/8044583/how-can-i-move-a-tag-on-a-git-branch-to-a-different-commit
    await git.raw(['push', 'origin', ':refs/tags/latest', ':refs/tags/next'])
    await git.raw(['push', '--tags'])
    console.log('updated git-tags "latest" "next"')
  }
}

type OutputterOptions = {
  json: boolean
}

function createShowers(opts: OutputterOptions) {
  function noReleaseNeeded(
    ctx: Context.Context,
    reason: Rel.NoReleaseReason
  ): void {
    if (reason === 'no_meaningful_change') {
      Output.outputException(
        'only_chore_like_changes', // todo replace this with reason forward
        'The release you attempting only contains chore commits which means no release is needed.',
        {
          json: opts.json,
          context: {
            commits: ctx.series.commitsInNextStable.map(c => c.message),
          },
        }
      )
    } else if (reason === 'empty_series') {
      Output.outputException(
        reason,
        'There are no commits to release since the last stable.',
        {
          json: opts.json,
          context: {
            commits: ctx.series.commitsInNextStable.map(c => c.message),
          },
        }
      )
    }
  }

  function dryRun(ctx: Context.Context, release: Rel.Release): void {
    Output.outputOk('dry_run', {
      ...release,
      commits: ctx.series.commitsInNextStable,
    })
  }

  return {
    noReleaseNeeded,
    dryRun,
  }
}

function createValidators(opts: OutputterOptions) {
  function branchSynced(ctx: Context.Context): boolean {
    if (ctx.currentBranch.syncStatus !== 'synced') {
      Output.outputException(
        'branch_not_synced_with_remote',
        'You are attempting a stable release but your trunk (aka. master/base branch) is not synced with the remote.',
        {
          json: opts.json,
          context: {
            syncStatus: ctx.currentBranch.syncStatus,
            sha: ctx.series.current.sha,
          },
        }
      )
      return false
    }
    return true
  }
  function isTrunk(ctx: Context.Context): boolean {
    if (!ctx.currentBranch.isTrunk) {
      Output.outputException(
        'must_be_on_trunk',
        'You are attempting a stable release but you are not on trunk (aka. master/base branch)',
        {
          json: opts.json,
          context: {
            branch: ctx.currentBranch.name,
            sha: ctx.series.current.sha,
          },
        }
      )
      return false
    }
    return true
  }

  function notAlreadyStableReleased(ctx: Context.Context): boolean {
    if (ctx.series.current.releases.stable) {
      Output.outputException(
        'commit_already_has_stable_release',
        'You are attempting a stable release on a commit that already has a stable release.',
        {
          json: opts.json,
          context: {
            version: ctx.series.current.releases.stable!.version,
            sha: ctx.series.current.sha,
          },
        }
      )
      return false
    }
    return true
  }

  return {
    branchSynced,
    isTrunk,
    notAlreadyStableReleased,
  }
}
