import * as Git from '../lib/git'
import { createGit, GitSyncStatus } from '../lib/git2'
import { parseGitHubCIEnvironment } from '../lib/github-ci-environment'
import * as PackageJson from '../lib/package-json'
import { octokit } from './octokit'
import * as Rel from './release'

export interface PullRequestContext {
  number: number
}

export interface Options {
  cwd: string
  /**
   * When building the context should the CI environment be checked for data?
   * Useful to boost performance.
   *
   * @default true
   */
  readFromCIEnvironment: boolean
  overrides?: {
    /**
     * @default null
     */
    trunk?: null | string
  }
}

export interface LocationContext {
  package: {
    name: string
  }
  githubRepo: {
    owner: string
    name: string
    trunkBranch: string
  }
  currentBranch: {
    name: string
    isTrunk: boolean
    syncStatus: GitSyncStatus
    pr: null | PullRequestContext
  }
}

export interface Context extends LocationContext {
  series: Rel.Series
}

export async function getContext(options: Options): Promise<Context> {
  const locationContext = await getLocationContext({ octokit, options })
  const series = await Rel.getCurrentSeries({ cwd: options.cwd })
  return { series, ...locationContext }
}

/**
 * Get location-oriented contextual information. Does not consider the release
 * series but things like current branch, repo, pr etc.
 */
export async function getLocationContext({
  octokit,
  options,
}: {
  octokit: any
  options?: Options
}): Promise<LocationContext> {
  const git = createGit({ cwd: options?.cwd })
  const readFromCIEnvironment = options?.readFromCIEnvironment

  let githubCIEnvironment = null

  if (readFromCIEnvironment) {
    githubCIEnvironment = parseGitHubCIEnvironment()
  }

  // Get repo info

  let repoInfo

  repoInfo = githubCIEnvironment?.parsed.repo

  if (!repoInfo) {
    repoInfo = await Git.parseGitHubRepoInfoFromGitConfig()
  }

  // Get which branch is trunk, overridable

  let trunkBranch: string

  if (options?.overrides?.trunk) {
    trunkBranch = options.overrides.trunk
  } else {
    let githubRepo
    try {
      githubRepo = await octokit.repos.get({
        owner: repoInfo.owner,
        repo: repoInfo.name,
      })
    } catch (e) {
      throw new Error(
        `Failed to fetch repo info from ${repoInfo.owner}/${repoInfo.name} in order to get the default branch.\n\n${e}`
      )
    }

    trunkBranch = githubRepo.data.default_branch
  }

  // Get the branch

  // const branchesSummary = await git.branch({})

  let currentBranchName = await git.getCurrentBranchName()

  if (!currentBranchName && githubCIEnvironment && githubCIEnvironment.parsed.branchName) {
    currentBranchName = githubCIEnvironment.parsed.branchName
  }

  if (!currentBranchName) {
    throw new Error('Could not get current branch name')
  }

  // Get the pr

  let pr: LocationContext['currentBranch']['pr'] = null

  if (githubCIEnvironment && githubCIEnvironment.parsed.prNum) {
    pr = {
      number: githubCIEnvironment.parsed.prNum,
    }
  } else {
    const head = `${repoInfo.owner}:${currentBranchName}`
    const owner = repoInfo.owner
    const repo = repoInfo.name
    const state = 'open'
    let maybePR

    try {
      maybePR = (await octokit.pulls.list({ owner, repo, head, state })).data[0]
    } catch (e) {
      throw new Error(
        `Failed to fetch ${state} pull requests from ${owner}/${name} for head ${head} in order to find out if this branch has an open pull-request.\n\n${e}`
      )
    }

    if (maybePR) {
      pr = {
        number: maybePR.number,
      }
    }
  }

  // get the branch sync status

  const syncStatus = await git.checkSyncStatus({
    branchName: currentBranchName,
  })

  // get package info

  const packageJson = await PackageJson.getPackageJson()

  return {
    package: {
      name: packageJson.name,
    },
    githubRepo: {
      owner: repoInfo.owner,
      name: repoInfo.name,
      trunkBranch: trunkBranch,
    },
    currentBranch: {
      name: currentBranchName,
      isTrunk: currentBranchName === trunkBranch,
      pr: pr,
      syncStatus: syncStatus,
    },
  }
}
