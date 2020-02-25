export function isGithubCIEnvironment() {
  return process.env.GITHUB_RUN_ID !== undefined
}

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

  const repoPath = process.env.GITHUB_REPOSITORY!.split('/')

  let prNum: GithubCIEnvironment['parsed']['prNum']
  if (process.env.GITHUB_REF) {
    const result = process.env.GITHUB_REF.match(/refs\/pull\/(\d+)\/merge/)
    if (result) {
      prNum = parseInt(result[1], 10)
    }
  }

  return {
    runId: parseInt(process.env.GITHUB_RUN_ID!, 10),
    eventName: process.env
      .GITHUB_EVENT_NAME! as GithubCIEnvironment['eventName'],
    ref: process.env.GITHUB_REF ?? null,
    repository: process.env.GITHUB_REPOSITORY!,
    parsed: {
      prNum: prNum,
      repo: {
        owner: repoPath[0],
        name: repoPath[1],
      },
    },
  }
}
