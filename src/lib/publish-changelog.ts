import { inspect } from 'util'
import { Octokit, ReleaseByTagRes } from '../utils/octokit'
import { Release } from '../utils/release'
import { isPreview, isStable, PreviewVer, renderStyledVersion } from './semver'

interface Repo {
  owner: string
  name: string
}

interface Input {
  octokit: Octokit
  repo: Repo
  /**
   * Uses the release to manage the changelog changes. A preview release will result
   * in a pre-release github release. A stable release will result in the
   * preview github release being cleared of notes and pointed toward the latest
   * stable commit sha.
   */
  release: Release & { head: { sha: string } }
  /**
   * The Changelog content.
   */
  body: string
  options?: {
    /**
     * Mark the GitHub release as a draft rather than published.
     */
    draft?: boolean
  }
}

/**
 * Publish a changelog. The given git tag should have already been pushed to the
 * remote. If the release is a preview then the github release will be made
 * against the pre-release identifier name. Otherwise the github release will be
 * made against the styled version.
 */
export async function publishChangelog(input: Input) {
  const {
    octokit,
    release,
    repo: { owner, name: repo },
  } = input

  let res: any
  try {
    if (isStable(release.version)) {
      res = await octokit.repos.createRelease({
        owner,
        repo,
        prerelease: false,
        tag_name: renderStyledVersion(release.version),
        draft: input.options?.draft ?? false,
        body: input.body,
      })
      const existingPreviewRelease = await maybeGetRelease({ octokit, owner, repo, tag: 'next' })
      if (existingPreviewRelease) {
        res = await octokit.repos.updateRelease({
          owner,
          repo,
          release_id: existingPreviewRelease.data.id,
          target_commitish: release.head.sha,
          body: 'None since last stable.',
        })
      }
    } else if (isPreview(release.version)) {
      const v = release.version as PreviewVer
      const tag = v.preRelease.identifier
      const existingPreviewRelease = await maybeGetRelease({ octokit, owner, repo, tag })

      if (!existingPreviewRelease) {
        res = await octokit.repos.createRelease({
          owner,
          repo,
          prerelease: true,
          tag_name: v.preRelease.identifier,
          draft: input.options?.draft ?? false,
          body: input.body,
        })
      } else {
        res = await octokit.repos.updateRelease({
          owner,
          repo,
          release_id: existingPreviewRelease.data.id,
          body: input.body,
        })
      }
    } else {
      // Should never happen if used correctly.
      throw new Error(
        `WARNING: release notes are not supported for this kind of release: ${inspect(release)}`
      )
    }
  } catch (e) {
    throw new Error(`Failed to publish changelog\n\n${inspect(e)}`)
  }
  return res
}

async function maybeGetRelease(input: {
  octokit: Octokit
  owner: string
  repo: string
  tag: string
}): Promise<null | ReleaseByTagRes> {
  let res = null
  try {
    res = await input.octokit.repos.getReleaseByTag({
      owner: input.owner,
      repo: input.repo,
      tag: input.tag,
    })
  } catch (error) {
    if (error.status !== 404) {
      throw new Error(
        `Failed to fetch releases for tag ${input.tag} on repo ${input.owner}/${input.repo}.\n\n${inspect(
          error
        )}`
      )
    }
  }
  return res
}
