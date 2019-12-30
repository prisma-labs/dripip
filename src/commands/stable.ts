import Command, { flags } from '@oclif/command'
import { getReleasesAtCommit } from '../lib/utils'
import * as Output from '../lib/output'
import createGit from 'simple-git/promise'
import { gitGetSha } from '../lib/git'

export class Stable extends Command {
  static flags = {
    json: flags.boolean({
      default: false,
      description: 'format output as JSON',
    }),
  }
  async run() {
    console.log('todo')
    const { flags } = this.parse(Stable)
    const send = createOutputters({ json: flags.json })
    const git = createGit()
    const releaseSHA = await gitGetSha(git, { ref: 'head' })
    const existingReleases = await getReleasesAtCommit(releaseSHA)
    if (existingReleases.stable) {
      return send.commitAlreadyHasStableRelease(
        releaseSHA,
        existingReleases.stable.version
      )
    }

    // Calculate new version:
    // Find the last stable version (git tag on the current branch). If none use 0.0.1.
    // Calculate the semver bump type. Do this by analyizing the commits on the branch between HEAD and the last stable git tag. The highest change type found is used.
    // Bump last stable version by bump type, thus producing the new version.

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

function createOutputters(opts: OutputterOptions) {
  function commitAlreadyHasStableRelease(sha: string, version: string) {
    Output.outputException(
      'commit_already_has_stable_release',
      'You are attempting a stable release on a commit that already has a stable release.',
      {
        json: opts.json,
        context: {
          version,
          sha,
        },
      }
    )
  }

  return {
    commitAlreadyHasStableRelease,
  }
}
