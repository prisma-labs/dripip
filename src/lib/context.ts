import createGit from 'simple-git/promise'
import Octokit from '@octokit/rest'
import * as Git from './git'
import {
  getReleasesAtCommit,
  findLatestStable,
  findLatestPreview,
  CommitReleases,
  StableRelease,
  PreviewRelease,
} from './utils'
import * as SemVer from 'semver'
import * as PackageJson from '../lib/package-json'

export type scanOoptions = {
  overrides?: {
    trunk?: null | string
  }
}
export type Context = {
  package: {
    name: string
  }
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
    releases: CommitReleases
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
  // get package info
  const packageJson = await PackageJson.read()

  if (packageJson === undefined) {
    // todo exception system
    throw new Error('could not find a package.json')
  }

  // return the final result
  return {
    package: {
      name: packageJson.name,
    },
    commitsSinceLastPreview,
    commitsSinceLastStable,
    latestReleases: {
      stable:
        maybeLatestStableVer === null
          ? null
          : {
              type: 'stable',
              sha: await Git.gitGetSha(git, { ref: maybeLatestStableVer }),
              version: SemVer.parse(maybeLatestStableVer)!,
            },
      preview:
        maybeLatestPreVerSinceStable === null
          ? null
          : {
              type: 'preview',
              sha: await Git.gitGetSha(git, {
                ref: maybeLatestPreVerSinceStable,
              }),
              version: SemVer.parse(maybeLatestPreVerSinceStable)!,
              buildNum: SemVer.parse(maybeLatestPreVerSinceStable)!
                .prerelease[1] as number,
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
