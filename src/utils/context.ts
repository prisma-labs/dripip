import { Octokit } from '@octokit/rest'
import createGit from 'simple-git/promise'
import * as Git from '../lib/git'
import { parseGithubCIEnvironment } from '../lib/github-ci-environment'
import * as PackageJson from '../lib/package-json'
import * as Rel from './release'

export interface PullRequestContext {
  number: number
}

export interface Options {
  cwd: string
  overrides?: {
    trunk?: null | string
  }
}

export interface LocationContext {
  package: {
    name: string
  }
  // nextReleasesNowWouldBe: {
  //   stable: null | SemVer.SemVer
  //   preview: null | SemVer.SemVer
  // }
  githubRepo: {
    owner: string
    name: string
    trunkBranch: string
  }
  currentBranch: {
    name: string
    isTrunk: boolean
    syncStatus: Git.SyncStatus
    pr: null | PullRequestContext
  }
}

export interface Context extends LocationContext {
  series: Rel.Series
}

export async function getContext(opts: Options): Promise<Context> {
  const git = createGit(opts.cwd)
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  })
  const locationContext = await getLocationContext({ git, octokit, opts })
  const series = await Rel.getCurrentSeries(git)

  return { series, ...locationContext }
}

/**
 * Get location-oriented contextual information. Does not consider the release
 * series but things like current branch, repo, pr etc.
 */
export async function getLocationContext({
  git,
  octokit,
  opts,
}: {
  git: Git.Simple
  octokit: any
  opts?: Options
}): Promise<LocationContext> {
  const githubCIEnvironment = parseGithubCIEnvironment()

  // Get repo info

  const repoInfo = githubCIEnvironment?.parsed.repo ?? (await Git.parseGithubRepoInfoFromGitConfig())

  // Get which branch is trunk, overridable

  let trunkBranch: string

  if (opts?.overrides?.trunk) {
    trunkBranch = opts.overrides.trunk
  } else {
    const githubRepo = await octokit.repos.get({
      owner: repoInfo.owner,
      repo: repoInfo.name,
    })
    trunkBranch = githubRepo.data.default_branch
  }

  // Get the branch

  const branchesSummary = await git.branch({})

  let currentBranchName: undefined | string

  if (!branchesSummary.detached) {
    currentBranchName = branchesSummary.current
  } else if (githubCIEnvironment && githubCIEnvironment.parsed.branchName) {
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
    const maybePR = (
      await octokit.pulls.list({
        owner: repoInfo.owner,
        repo: repoInfo.name,
        head: `${repoInfo.owner}:${currentBranchName}`,
        state: 'open',
      })
    ).data[0]

    if (maybePR) {
      pr = {
        number: maybePR.number,
      }
    }
  }

  // get the branch sync status

  const syncStatus = await Git.checkSyncStatus(git)

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
