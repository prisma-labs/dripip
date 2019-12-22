/**
 * Generic extensions to the simple-git library.
 */

import createGit from 'simple-git/promise'

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
