import createGit from 'simple-git/promise'
import Octokit from '@octokit/rest'
import * as Git from './git'
import {
  getReleasesAtCommit,
  isStable,
  isStablePreview,
  findLatestStable,
  findLatestPreview,
} from './utils'
import * as SemVer from 'semver'

export type Context = {
  commitsSinceLastStable: Git.LogEntry[]
  commitsSinceLastPreview: Git.LogEntry[]
  // nextReleasesNowWouldBe: {
  //   stable: null | SemVer.SemVer
  //   preview: null | SemVer.SemVer
  // }
  latestReleases: {
    stable: null | StableRelease
    preview: null | PreviewRelease
  }
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
  currentCommit: {
    sha: string
    releases: {
      stable: null | StableRelease
      preview: null | PreviewRelease
    }
  }
}

type Commit = {
  sha: string
  message: string
}

type PullRequest = {
  title: string
  number: number
}

type StableRelease = {
  type: 'stable'
  version: SemVer.SemVer
  sha: string
}

type PreviewRelease = {
  type: 'preview'
  version: SemVer.SemVer
  sha: string
}

export async function scan(): Promise<Context> {
  // Build up instances
  const octoOps = {} as Octokit.Options
  if (process.env.GITHUB_TOKEN) octoOps.auth = process.env.GITHUB_TOKEN
  const octokit = new Octokit(octoOps)
  const git = createGit()
  // Get the trunk branch
  const githubRepoAddress = await Git.parseGithubRepoInfoFromGitConfig()
  const githubRepo = await octokit.repos.get({
    owner: githubRepoAddress.owner,
    repo: githubRepoAddress.name,
  })
  const trunkBranch = githubRepo.data.default_branch
  const branchesSummary = await git.branch({})
  // Get the PRs if any
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
  // get commit info
  const currentCommitSHA = await Git.gitGetSha(git, { ref: 'head' })
  const commitReleases = await getReleasesAtCommit(currentCommitSHA)
  // get the latest releases
  const maybeLatestStableVer = await findLatestStable(git)
  const maybeLatestPreVerSinceStable = await findLatestPreview(
    git,
    maybeLatestStableVer
  )
  // get commits since the latest releases
  const [commitsSinceLastStable, commitsSinceLastPreview] = await Promise.all([
    Git.log(git, { since: maybeLatestStableVer }),
    Git.log(git, { since: maybeLatestPreVerSinceStable }),
  ])

  // return the final result
  return {
    commitsSinceLastPreview,
    commitsSinceLastStable,
    latestReleases: {
      stable:
        maybeLatestStableVer === null
          ? null
          : {
              type: 'stable',
              sha: 'todo',
              version: SemVer.parse(maybeLatestStableVer)!,
            },
      preview:
        maybeLatestPreVerSinceStable === null
          ? null
          : {
              type: 'preview',
              sha: 'todo',
              version: SemVer.parse(maybeLatestPreVerSinceStable)!,
            },
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
    currentCommit: {
      sha: currentCommitSHA,
      releases: commitReleases,
    },
  }
}
