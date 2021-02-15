/**
 * This module handles the concerns of publishing. It handles interaction with
 * git tagging, pushing to the git origin, the package registry, etc.
 */

import createGit from 'simple-git/promise'
import * as Git from './git'
import { isGithubCIEnvironment } from './github-ci-environment'
import * as Pacman from './pacman'

type Options = {
  /**
   * Should publishing to npm take place?
   *
   * @default true
   */
  npm?: boolean
  /**
   * Should the semver git tag have a "v" prefix.
   *
   * @default false
   */
  gitTagVPrefix?: boolean
  /**
   * Should each given dist tag have a corresponding git tag made?
   *
   * @default 'all'
   */
  gitTag?: 'all' | 'just_version' | 'just_dist_tags' | 'none'
}

const optionDefaults: Options = {
  gitTagVPrefix: false,
  npm: true,
  gitTag: 'all',
}

export interface Release {
  /**
   * The version to publish.
   */
  version: string
  /**
   * The npm dist tag to use for this release.
   */
  distTag: string
  /**
   * Additional dist tags to use for this release.
   *
   * @remarks
   *
   * When publishing it is sometimes desirable to update other dist tags to
   * point at the new version. For example "next" should never fall behind
   * stable, etc.
   */
  extraDistTags?: string[]
  /**
   * Release notes.
   */
  notes?: string
}

export interface PublishPlan {
  release: Release
  options?: Options
}

/**
 * Events that provide insight into the progress of the publishing process.
 */
type ProgressMessage =
  | { kind: 'extra_dist_tag_updated'; distTag: string }
  | { kind: 'package_published' }
  | { kind: 'package_json_reverted' }
  | { kind: 'version_git_tag_created' }
  | { kind: 'extra_dist_tag_git_tag_created'; distTag: string }
  | { kind: 'extra_dist_tag_git_tag_pushed'; distTag: string }

/**
 * Run the publishing process.
 *
 * 1. Change package.json version field to be new version.
 * 2. npm publish --tag next.
 * 3. discard package.json change.
 * 4. git tag {newVer}.
 * 5. git tag next.
 * 6. git push --tags.
 *
 */
export async function* publishPackage(input: PublishPlan): AsyncGenerator<ProgressMessage> {
  const release = input.release
  const opts = {
    ...optionDefaults,
    ...input.options,
  }

  if (opts.npm) {
    // publish to the npm registry
    //
    // If we are using a script runner then publish with that same tool. Otherwise
    // default to using npm. The reason we need to do this is that problems occur
    // when mixing tools. For example `yarn run ...` will lead to a spawn of `npm
    // publish` failing due to an authentication error.
    const pacman = await Pacman.create({ default: 'npm' })
    await pacman.publish({ version: release.version, tag: release.distTag })
    yield { kind: 'package_published' }

    // todo parallel optimize?
    if (release.extraDistTags) {
      for (const distTag of release.extraDistTags) {
        await pacman.tag({ packageVersion: release.version, tagName: distTag })
        yield { kind: 'extra_dist_tag_updated', distTag }
      }
    }
  }

  // While the fields of the package.json should not have changed, its
  // formatting, like indentation level, might have. We do not want to leave a
  // dirty working directoy on the user's system.
  //
  // TODO no invariant in system that checks that package.json was not modified
  // before beginning the publishing process. In other words we may be losing
  // user work here. This check should be in strict mode.
  const git = createGit()
  await setupGitUsernameAndEmailOnCI(git)
  await git.checkout('package.json')
  yield { kind: 'package_json_reverted' }

  // Tag the git commit
  //
  const versionTag = opts.gitTagVPrefix ? 'v' + release.version : release.version

  if (opts.gitTag === 'all' || opts.gitTag === 'just_version') {
    await git.addAnnotatedTag(versionTag, versionTag)
    // Avoid general git push tags otherwise we could run into trying to push e.g.
    // old `next` tag (dist-tags, forced later) that was since updated on remote
    // by CI––assuming user is doing a publish from their machine (maybe stable
    // for example).
    // Ref: https://stackoverflow.com/questions/23212452/how-to-only-push-a-specific-tag-to-remote
    await git.raw(['push', 'origin', `refs/tags/${versionTag}`])
    yield { kind: 'version_git_tag_created' }
  }

  // Tag the git commit with the given dist tag names
  //
  if (opts.gitTag === 'all' || opts.gitTag === 'just_dist_tags') {
    // todo parallel optimize?
    const distTags = [release.distTag, ...(release.extraDistTags ?? [])]
    for (const distTag of distTags) {
      // dist tags are movable pointers. Except for init case it is expected to
      // exist in the git repo. So use force to move the tag.
      // https://stackoverflow.com/questions/8044583/how-can-i-move-a-tag-on-a-git-branch-to-a-different-commit
      // todo provide nice semantic descriptions for each dist tag
      await git.raw(['tag', '--force', '--message', distTag, distTag])
      yield { kind: 'extra_dist_tag_git_tag_created', distTag }
      await git.raw(['push', '--force', '--tags'])
      yield { kind: 'extra_dist_tag_git_tag_pushed', distTag }
    }
  }
}

// todo turn this into a check
/**
 * On CI set the local Git config user email and name if not already set on the
 * machine. If not CI this function is a no-op.
 *
 * @remarks
 *
 * It can happen that no user name or email is setup on a machine for git.
 * Certain git commands fail in that case like creating annotated tags. Ref:
 * https://stackoverflow.com/questions/11656761/git-please-tell-me-who-you-are-error.
 */
async function setupGitUsernameAndEmailOnCI(git: Git.Simple) {
  if (!isGithubCIEnvironment()) return

  const [email, name] = await Promise.all([
    git.raw(['config', '--get', 'user.email']),
    git.raw(['config', '--get', 'user.name']),
  ])

  const promises = []

  if (!email) {
    promises.push(git.addConfig('user.name', 'dripip'))
  }
  if (!name) {
    promises.push(git.addConfig('user.email', 'dripip@prisma.io'))
  }

  await Promise.all(promises)
}
