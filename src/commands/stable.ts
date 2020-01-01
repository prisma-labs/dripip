import Command, { flags } from '@oclif/command'
import * as Output from '../lib/output'
import * as Context from '../lib/context'
import { calcBumpTypeFromConventionalCommits } from '../lib/conventional-commit'
import { bumpVer } from '../lib/utils'
import * as SemVer from 'semver'
// import createGit from 'simple-git/promise'

export class Stable extends Command {
  static flags = {
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
    const show = createShowers({ json: flags.json })
    const check = createValidators({ json: flags.json })
    const ctx = await Context.scan()

    if (!check.isTrunk(ctx)) return
    if (!check.branchSynced(ctx)) return
    if (!check.notAlreadyStableReleased(ctx)) return

    const bumpType = calcBumpTypeFromConventionalCommits(
      ctx.commitsSinceLastStable.map(c => c.message)
    )

    if (bumpType === null) {
      return show.noReleaseNeeded(ctx)
    }

    const newVer = bumpVer(
      bumpType,
      ctx.latestReleases.stable?.version ?? SemVer.parse('0.0.0')!
    )

    if (flags['dry-run']) {
      return show.dryRun(ctx, newVer.version)
    }

    // Run publishing process:
    // Change package.json version field to be new version.
    // Run npm publish --tag latest.
    // Undo package.json change.
    // Run git tag {newVersion}.
    // Run git tag next (normally should already be present)
    // Run git push --tags.
  }
}

type OutputterOptions = {
  json: boolean
}

function createShowers(opts: OutputterOptions) {
  function noReleaseNeeded(ctx: Context.Context): void {
    Output.outputException(
      'only_chore_like_changes',
      'The release you attempting only contains chore commits which means no release is needed.',
      {
        json: opts.json,
        context: {
          commits: ctx.commitsSinceLastStable.map(c => c.message),
        },
      }
    )
  }

  function dryRun(ctx: Context.Context, newVer: string): void {
    Output.outputOk('dry_run', {
      newVer,
      commits: ctx.commitsSinceLastStable,
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
            sha: ctx.currentCommit.sha,
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
            sha: ctx.currentCommit.sha,
          },
        }
      )
      return false
    }
    return true
  }

  function notAlreadyStableReleased(ctx: Context.Context): boolean {
    if (ctx.currentCommit.releases.stable) {
      Output.outputException(
        'commit_already_has_stable_release',
        'You are attempting a stable release on a commit that already has a stable release.',
        {
          json: opts.json,
          context: {
            version: ctx.currentCommit.releases.stable!.version,
            sha: ctx.currentCommit.sha,
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
