import { inspect } from 'util'
import { Octokit } from '../utils/octokit'
import { Release } from '../utils/release'
import { isPreview, isStable, PreviewVer, renderStyledVersion } from './semver'

interface Repo {
  owner: string
  name: string
}

interface Input {
  octokit: Octokit
  repo: Repo
  release: Release
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
  const { octokit, release, repo } = input

  let res: any
  if (isStable(release.version)) {
    res = await octokit.repos.createRelease({
      prerelease: false,
      tag_name: renderStyledVersion(release.version),
      owner: repo.owner,
      repo: repo.name,
      draft: input.options?.draft ?? false,
      body: input.body,
    })
  } else if (isPreview(release.version)) {
    const v = release.version as PreviewVer
    let notFoundError
    try {
      res = await octokit.repos.getReleaseByTag({
        owner: repo.owner,
        repo: repo.name,
        tag: v.preRelease.identifier,
      })
    } catch (error) {
      if (error.status !== 404) {
        throw error
      } else {
        notFoundError = error
      }
    }

    if (notFoundError) {
      res = await octokit.repos.createRelease({
        prerelease: true,
        tag_name: v.preRelease.identifier,
        owner: repo.owner,
        repo: repo.name,
        draft: input.options?.draft ?? false,
        body: input.body,
      })
    } else {
      res = await octokit.repos.updateRelease({
        release_id: res.data.id,
        owner: repo.owner,
        repo: repo.name,
        body: input.body,
      })
    }
  } else {
    console.error(`WARNING: release notes are not supported for this kind of release: ${inspect(release)}`)
  }
  return res
}
