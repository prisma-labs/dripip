/**
 * Generic extensions to the simple-git library.
 */

import createGit from 'simple-git/promise'
import Octokit from '@octokit/rest'
import parseGitConfig from 'parse-git-config'
import parseGitHubURL from 'parse-github-url'

export type Simple = ReturnType<typeof createGit>

/**
 * Get tags at the given commit or HEAD by default.
 */
export async function gitGetTags(
  git: Simple,
  opts?: { ref?: string }
): Promise<string[]> {
  const ref = opts?.ref ?? 'HEAD'
  const tagsString: string | null = await git.tag({ '--points-at': ref })
  if (tagsString === null) return []
  const tags = tagsString
    .trim()
    .split('\n')
    .map(t => t.trim())
  return tags
}

/**
 * Get all tags in the git repo.
 */
export async function gitGetTagsInRepo(git: Simple): Promise<string[]> {
  const tagsString: string | null = await git.raw(['tag'])
  if (tagsString === null) return []
  const tags = tagsString
    .trim()
    .split('\n')
    .map(t => t.trim())
  return tags
}

/**
 * Reset a git repository to its last commit, removing staged files, cleaning
 * dirty working directory, etc.
 */
export async function gitReset(git: Simple): Promise<void> {
  await Promise.all([
    git.raw(['clean', '-d', '-x', '-f']),
    gitDeleteAllTagsInRepo(git),
    git.raw(['reset', '--hard']),
  ])
}

/**
 * Reset a git repository to its initial commit
 */
export async function gitResetToInitialCommit(git: Simple): Promise<void> {
  await Promise.all([
    git.raw(['clean', '-d', '-x', '-f']),
    git
      .raw('rev-list --max-parents=0 HEAD'.split(' '))
      .then(initialCommitSHA => {
        git.raw(['reset', '--hard', initialCommitSHA.trim()])
      }),
    gitDeleteAllTagsInRepo(git),
  ])
}

/**
 * Get the SHA at the given commit or HEAD by default.
 */
export async function gitGetSha(
  git: Simple,
  opts?: { short?: boolean; ref?: string }
): Promise<string> {
  const args = []
  if (opts?.short === true) args.push('--short')
  if (typeof opts?.ref === 'string') {
    args.push(opts.ref)
  } else {
    args.push('HEAD')
  }
  return git.revparse(args)
}

/**
 * Reset not only the working directory but the git repo itself.
 */
export async function gitInitRepo(git: Simple): Promise<void> {
  await git.init()
  await git.raw(['add', '-A'])
  await gitCreateEmptyCommit(git, 'initial commit')
}

/**
 * Create an empty commit in the repo.
 */
export async function gitCreateEmptyCommit(
  git: Simple,
  messge: string
): Promise<void> {
  await git.raw(['commit', '--allow-empty', '--message', messge])
}

/**
 * Delete all tags in the repo.
 */
export async function gitDeleteAllTagsInRepo(git: Simple): Promise<void> {
  const tags = await gitGetTagsInRepo(git)
  if (tags.length) {
    await git.raw(['tag', '-d', ...tags])
  }
}

/**
 * Detect if there is a pull-request for the current branch. The CI environment
 * is checked for well-known environment variables providing sufficient signal
 * to answer the question first, as this is cheap. If not confirmed is PR, we
 * next go through the GitHub API and local Git config to see if the current
 * branch has an associated pull-request. If not confirmed is PR, we finally
 * accept that there is no PR for the current branch.
 *
 * TODO private repo support
 */
export async function checkBranchPR(
  git: Simple
): Promise<
  | {
      isPR: false
      inferredBy: 'circle_sans_pr_var' | 'branch_no_open_pr'
    }
  | {
      isPR: true
      inferredBy: 'ci_env_var' | 'git_branch_github_api'
    }
> {
  // CircleCI Environment variables docs:
  // https://circleci.com/docs/2.0/env-vars/#built-in-environment-variables
  if (process.env.CIRCLECI === 'true') {
    if (
      typeof process.env.CIRCLE_PULL_REQUEST === 'string' &&
      process.env.CIRCLE_PULL_REQUEST !== ''
    ) {
      return {
        isPR: true,
        inferredBy: 'ci_env_var',
      }
    } else {
      return {
        isPR: false,
        inferredBy: 'circle_sans_pr_var',
      }
    }
  }

  // Inspiration from how `$ hub pr show` works
  // https://github.com/github/hub/blob/a5fbf29be61a36b86c7f0ff9e9fd21090304c01f/commands/pr.go#L327

  const gitConfig = await parseGitConfig()
  if (gitConfig === null) {
    throw new Error('Could not parse your git config')
  }

  const gitOrigin = gitConfig['remote "origin"']
  if (gitOrigin === undefined) {
    throw new Error('Could not find a configured origin in your git config')
  }

  const gitOriginURL: string = gitOrigin['url']
  if (gitOriginURL === undefined) {
    throw new Error(
      'Could not find a URL in your remote origin config in your git config'
    )
  }

  const githubRepoURL = parseGitHubURL(gitOriginURL)
  if (githubRepoURL === null) {
    throw new Error(
      'Could not parse the URL in your remote origin config in your git config'
    )
  }
  if (githubRepoURL.owner === null) {
    throw new Error(
      'Could not parse out the GitHub owner from the URL in your remote origin config in your git config'
    )
  }
  if (githubRepoURL.name === null) {
    throw new Error(
      'Could not parse out the GitHub repo name from the URL in your remote origin config in your git config'
    )
  }

  const octokit = new Octokit()
  // TODO we could fetch all pull-requests and check against `state` later. One
  // benefit would be better feedback for users, like: "The branch you are on
  // had a pull a request but it has been closed [...]" which is more precise
  // than e.g. "No open pull-requests found [...]". We could go further yet,
  // checking if the PR was closed via merge or not, "Did you forget to switch
  // to trunk branch?", etc.
  //
  // To attain this level of feedback users would need to accept potentially
  // higher levels of latentcy to pagination through all pull-requests.
  // TODO pagination https://octokit.github.io/rest.js/#pagination
  const pullsRes = await octokit.pulls.list({
    owner: githubRepoURL.owner,
    repo: githubRepoURL.name,
    state: 'open',
  })

  const branchSummary = await git.branch({})
  if (pullsRes.data.length > 0) {
    for (const pull of pullsRes.data) {
      if (pull.head.ref === branchSummary.current) {
        return { isPR: true, inferredBy: 'git_branch_github_api' }
      }
    }
  }

  return { isPR: false, inferredBy: 'branch_no_open_pr' }
}

/**
 * Determin if the current branch is trunk or not. Currently a simple check
 * against if current branch is master or not but TODO in the future will
 * account for checking against the remote Git repo for if the so-called `base`
 * branch of the repo is set to something else than `master`.
 */
export async function isTrunk(git: Simple): Promise<boolean> {
  const branchSumamry = await git.branch({})
  return branchSumamry.current === 'master'
}
