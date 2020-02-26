import { debug } from './debug'

export interface GithubCIEnvironment {
  runId: number
  eventName: 'pull_request'
  ref: null | string
  repository: string
  parsed: {
    repo: {
      name: string
      owner: string
    }
    prNum?: number
  }
}

/**
 * Parse the Github CI Environment. Returns null if parsing fails which should
 * mean it is not a Github CI Environment.
 *
 * @remarks
 *
 * Github docs: https://help.github.com/en/actions/configuring-and-managing-workflows/using-environment-variables#default-environment-variables
 */
export function parseGithubCIEnvironment(): null | GithubCIEnvironment {
  if (!isGithubCIEnvironment()) return null

  let prNum: GithubCIEnvironment['parsed']['prNum']

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

  return {
    runId: parseInt(process.env.GITHUB_RUN_ID!, 10),
    eventName: process.env
      .GITHUB_EVENT_NAME! as GithubCIEnvironment['eventName'],
    ref: process.env.GITHUB_REF ?? null,
    repository: process.env.GITHUB_REPOSITORY!,
    parsed: {
      prNum: prNum,
      repo: repo,
    },
  }
}

/**
 * Check if the current process appers to be running in a Github CI environment.
 */
export function isGithubCIEnvironment() {
  return process.env.GITHUB_RUN_ID !== undefined
}
