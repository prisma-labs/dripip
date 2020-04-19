import { Octokit } from '../utils/octokit'
import { Release, Series } from '../utils/release'
import { renderChangelog } from './changelog'
import { isStable, renderStyledVersion } from './semver'

interface Repo {
  owner: string
  name: string
}

interface Input {
  repo: Repo
  octokit: Octokit
  series: Series
  release: Release
  options?: {
    /**
     * Mark the GitHub release as a draft rather than published.
     */
    draft?: boolean
  }
}

/**
 * Publish a changelog. The given git tag should have already been pushed to the
 * remote.
 */
export async function publishChangelog(input: Input) {
  const { octokit, release, repo, series } = input

  const res = await octokit.repos.createRelease({
    prerelease: !isStable(release.version),
    tag_name: renderStyledVersion(release.version),
    owner: repo.owner,
    repo: repo.name,
    draft: input.options?.draft ?? false,
    body: renderChangelog(series, { as: 'markdown' }),
  })
}
