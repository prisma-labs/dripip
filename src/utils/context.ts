import { Octokit } from '@octokit/rest'
import createGit from 'simple-git/promise'
import * as Git from '../lib/git'
import { parseGithubCIEnvironment } from '../lib/github-ci-environment'
import * as PackageJson from '../lib/package-json'
import * as Rel from './release'

export interface scanOoptions {
  overrides?: {
    trunk?: null | string
  }
}

export interface Context {
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
    isTrunk: boolean
    syncStatus: Git.SyncStatus
    pr: null | {
      number: number
    }
  }
}

export async function scan(opts?: scanOoptions): Promise<Context> {
  const githubCIEnvironment = parseGithubCIEnvironment()

  // Build up instances
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  })

  const git = createGit()

  // Generally required information

  const repoInfo =
    githubCIEnvironment?.parsed.repo ??
    (await Git.parseGithubRepoInfoFromGitConfig())

  // Get the trunk branch either from a given override or by default from the
  // GitHub repo settings.

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

  const branchesSummary = await git.branch({})

  if (!githubCIEnvironment && branchesSummary.detached) {
    throw new Error(
      'Not in a known CI environment and git status is a detached head state. Not enough information to build a release context.'
    )
  }

  // Get the pr and current branch
  // How this is done various considerably depending on the environment

  let pr: Context['currentBranch']['pr'] = null
  let currentBranchName: string

  if (githubCIEnvironment) {
    if (githubCIEnvironment.parsed.prNum) {
      pr = {
        number: githubCIEnvironment.parsed.prNum,
      }
    }
    if (
      githubCIEnvironment.parsed.prNum &&
      branchesSummary.detached &&
      githubCIEnvironment.eventName === 'pull_request'
    ) {
      // Try to get branch info from the Github API
      const prResponse = await octokit.pulls.get({
        owner: repoInfo.owner,
        repo: repoInfo.name,
        pull_number: githubCIEnvironment.parsed.prNum,
      })
      currentBranchName = prResponse.data.head.ref
    }
  }

  if (currentBranchName! === undefined) {
    currentBranchName = branchesSummary.current
  }

  if (!pr) {
    const maybePR = (
      await octokit.pulls.list({
        owner: repoInfo.owner,
        repo: repoInfo.name,
        head: `${repoInfo.owner}:${branchesSummary.current}`,
        state: 'open',
      })
    ).data[0]

    if (maybePR) {
      pr = {
        number: maybePR.number,
      }
    }
  }

  // // Github only permits one open PR per branch name. If there is an open one
  // // then we can discard any others as inconsequential. If none are open, and
  // // there are multiple, we should not discard them, as they may be of interest
  // // to the user to debug an exception, e.g. attempting a pr release without a
  // // pr open: then we can say "Hey, you have no pr open, but oddly we did find
  // // these past PRs...?"
  // const prsByState: Context['currentBranch']['prs'] = {
  //   open: null,
  //   closed: [],
  // }
  // for (const pr of prs) {
  //   if (pr.state === 'open') {
  //     prsByState.open = { number: pr.number, title: pr.title }
  //   } else {
  //     prsByState.closed.push({ number: pr.number, title: pr.title })
  //   }
  // }

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
