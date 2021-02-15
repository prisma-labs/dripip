import { rootDebug } from './debug'

const debug = rootDebug(__filename)

export interface GitHubCIEnvironment {
  runId: number
  eventName: 'pull_request'
  ref: null | string
  headRef: null | string
  repository: string
  parsed: {
    repo: {
      name: string
      owner: string
    }
    branchName: null | string
    prNum?: number
  }
}

/**
 * Parse the GitHub CI Environment. Returns null if parsing fails which should
 * mean it is not a GitHub CI Environment.
 *
 * @remarks
 *
 * GitHub docs: https://help.github.com/en/actions/configuring-and-managing-workflows/using-environment-variables#default-environment-variables
 */
export function parseGitHubCIEnvironment(): null | GitHubCIEnvironment {
  if (!isGitHubCIEnvironment()) return null

  let prNum: GitHubCIEnvironment['parsed']['prNum']

  if (process.env.GITHUB_REF) {
    const match = process.env.GITHUB_REF.match(/refs\/pull\/(\d+)\/merge/)

    if (match) {
      debug('found a pr number from github ci environment %s', match[1])
      prNum = parseInt(match[1], 10)
    }
  }

  const repoPath = process.env.GITHUB_REPOSITORY!.split('/')

  const repo = {
    owner: repoPath[0],
    name: repoPath[1],
  }

  let branchName: null | string = null
  if (process.env.GITHUB_HEAD_REF) {
    branchName = process.env.GITHUB_HEAD_REF
  } else if (process.env.GITHUB_REF) {
    branchName = process.env.GITHUB_REF.match(/^refs\/heads\/(.+)$/)?.[1] ?? null
  }

  return {
    runId: parseInt(process.env.GITHUB_RUN_ID!, 10),
    eventName: process.env.GITHUB_EVENT_NAME! as GitHubCIEnvironment['eventName'],
    ref: process.env.GITHUB_REF ?? null,
    headRef: process.env.GITHUB_HEAD_REF ?? null,
    repository: process.env.GITHUB_REPOSITORY!,
    parsed: {
      prNum: prNum,
      repo: repo,
      branchName: branchName,
    },
  }
}

/**
 * Check if the current process appears to be running in a GitHub CI environment.
 */
export function isGitHubCIEnvironment() {
  return process.env.GITHUB_RUN_ID !== undefined
}
