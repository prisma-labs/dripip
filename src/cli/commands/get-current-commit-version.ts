import Command, { flags } from '@oclif/command'
import { Octokit } from '@octokit/rest'
import { createGit } from '../../lib/git'
import { getLocationContext } from '../../utils/context'
import { getPullRequestReleaseVersion as getPullRequestReleaseVersionForLocation } from '../../utils/pr-release'
import { getCurrentCommit } from '../../utils/release'

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
    // anyways
    //
    // - PR release is much more costly to calculate than others
    //

    const c = await getCurrentCommit()

    // todo these could have `v` prefix

    if (c.releases.stable) {
      return process.stdout.write(c.releases.stable.version)
    }

    if (c.releases.preview) {
      return process.stdout.write(c.releases.preview.version)
    }

    // Try to get version from pr release

    const ctx = await getLocationContext({
      git: createGit(),
      octokit: new Octokit({
        auth: process.env.GITHUB_TOKEN,
      }),
    })

    if (ctx.currentBranch.pr) {
      const version = getPullRequestReleaseVersionForLocation({
        packageName: ctx.package.name,
        prNum: ctx.currentBranch.pr.number,
        sha: c.sha,
      })

      if (version) {
        return process.stdout.write(version)
      }
    }

    // Give up, with error if specified to

    if (!flags['optional']) {
      return this.exit(1)
    }
  }
}
