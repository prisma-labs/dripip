import { Octokit } from '@octokit/rest'
import createGit from 'simple-git/promise'
import * as Git from '../lib/git'
import * as PackageJson from '../lib/package-json'
import * as Rel from './release'

export type scanOoptions = {
  overrides?: {
    trunk?: null | string
  }
}
export type Context = {
  package: {
    name: string
  }
  series: Rel.Series
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
    isDetatched: boolean
    isTrunk: boolean
    syncStatus: Git.SyncStatus
    prs: {
      open: null | PullRequest
      closed: PullRequest[]
    }
  }
}

type PullRequest = {
  title: string
  number: number
}

export async function scan(opts?: scanOoptions): Promise<Context> {
  // Build up instances
  const octoOps = {} as Octokit.Options
  if (process.env.GITHUB_TOKEN) octoOps.auth = process.env.GITHUB_TOKEN
  const octokit = new Octokit(octoOps)
  const git = createGit()
  // Generally required information
  const githubRepoAddress = await Git.parseGithubRepoInfoFromGitConfig()
  // Get the trunk branch either from a given override or by default from the
  // GitHub repo settings.
  let trunkBranch: string
  if (opts?.overrides?.trunk) {
    trunkBranch = opts.overrides.trunk
  } else {
    const githubRepo = await octokit.repos.get({
      owner: githubRepoAddress.owner,
      repo: githubRepoAddress.name,
    })
    trunkBranch = githubRepo.data.default_branch
  }
  // Get the PRs if any
  const branchesSummary = await git.branch({})
  const prs = (
    await octokit.pulls.list({
      owner: githubRepoAddress.owner,
      repo: githubRepoAddress.name,
      head: `${githubRepoAddress.owner}:${branchesSummary.current}`,
      state: 'all',
    })
  ).data
  // Github only permits one open PR per branch name. If there is an open one
  // then we can discard any others as inconsequential. If none are open, and
  // there are multiple, we should not discard them, as they may be of interest
  // to the user to debug an exception, e.g. attempting a pr release without a
  // pr open: then we can say "Hey, you have no pr open, but oddly we did find
  // these past PRs...?"
  const prsByState: Context['currentBranch']['prs'] = {
    open: null,
    closed: [],
  }
  for (const pr of prs) {
    if (pr.state === 'open') {
      prsByState.open = { number: pr.number, title: pr.title }
    } else {
      prsByState.closed.push({ number: pr.number, title: pr.title })
    }
  }
  // get the branch sync status
  const syncStatus = await Git.checkSyncStatus(git)
  // get the latest releases and commits since
  const series = await Rel.getCurrentSeries(git)
  // get package info
  const packageJson = await PackageJson.read(process.cwd())
  if (packageJson === undefined) {
    // todo exception system
    throw new Error('could not find a package.json')
  }

  return {
    series,
    package: {
      name: packageJson.name,
    },
    githubRepo: {
      owner: githubRepoAddress.owner,
      name: githubRepoAddress.name,
      trunkBranch,
    },
    currentBranch: {
      name: branchesSummary.current,
      isTrunk: branchesSummary.current === trunkBranch,
      isDetatched: branchesSummary.detached,
      prs: prsByState,
      syncStatus,
    },
  }
}
