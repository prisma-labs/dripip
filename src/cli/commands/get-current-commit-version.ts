import Command, { flags } from '@oclif/command'
import { rootDebug } from '../../lib/debug'
import { getLocationContext } from '../../utils/context'
import { octokit } from '../../utils/octokit'
import { getPullRequestReleaseVersionForLocation } from '../../utils/pr-release'
import { getCurrentCommit } from '../../utils/release'

const debug = rootDebug(__filename)

export class GetCurrentCommitVersion extends Command {
  static flags = {
    optional: flags.boolean({
      description: 'Exit 0 if a version for the commit cannot be found',
      default: false,
      char: 'r',
    }),
  }
  async run() {
    const { flags } = this.parse(GetCurrentCommitVersion)

    // Try to get version from preview/stable release
    // stable release preferred over preview
    // preview release preferred over pr release
    //
    // Note:
    //
    // - PR release should not be possible on same commit as stable/preview
    // anyway
    //
    // - PR release is much more costly to calculate than others
    //

    const c = await getCurrentCommit()
    debug('got current commit', c)

    // todo these could have `v` prefix

    if (c.releases.stable) {
      debug('counting stable release as version of this commit')
      return process.stdout.write(c.releases.stable.version)
    }

    if (c.releases.preview) {
      debug('counting preview release as version of this commit')
      return process.stdout.write(c.releases.preview.version)
    }

    // Try to get version from pr release
    debug('commit has no release information, checking for pr-releases')

    const ctx = await getLocationContext({ octokit: octokit })

    debug('got location context', ctx)

    if (ctx.currentBranch.pr) {
      const version = getPullRequestReleaseVersionForLocation({
        packageName: ctx.package.name,
        prNum: ctx.currentBranch.pr.number,
        sha: c.sha,
      })

      debug('pr release version for this location context?', { version })

      if (version) {
        debug('counting pr-release version as version of this commit')
        return process.stdout.write(version)
      }
    }

    // Give up, with error if specified to
    const giveUpWithError = !flags['optional']

    debug('giving up', { giveUpWithError })

    if (giveUpWithError) {
      return this.exit(1)
    }
  }
}
