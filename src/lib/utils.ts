import createGit from 'simple-git/promise'
import * as Semver from 'semver'

export type SimpleGit = ReturnType<typeof createGit>

export const getReleaseTagsAtCommit = (ref: string): Promise<Semver.SemVer[]> =>
  createGit()
    .tag({ '--points-at': ref })
    .then(result =>
      result
        .trim()
        .split('\n')
        .map(tag => Semver.parse(tag))
        .filter((parsed): parsed is Semver.SemVer => parsed !== null)
    )

export const indentBlock4 = (block: string): string => indentBlock(4, block)

export const indentBlock = (size: number, block: string): string => {
  return block
    .split('\n')
    .map(
      line =>
        range(size)
          .map(constant(' '))
          .join('') + line
    )
    .join('\n')
}

const constant = <T>(x: T): (() => T) => {
  return function() {
    return x
  }
}

const range = (times: number): number[] => {
  const list: number[] = []
  while (list.length < times) {
    list.push(list.length + 1)
  }
  return list
}

export async function gitReset(git: SimpleGit): Promise<void> {
  await Promise.all([
    git.raw(['clean', '-d', '-x', '-f']),
    gitDeleteAllTags(git),
    git.raw(['reset', '--hard']),
  ])
}

export async function gitResetToInitialCommit(git: SimpleGit): Promise<void> {
  await Promise.all([
    git.raw(['clean', '-d', '-x', '-f']),
    git
      .raw('rev-list --max-parents=0 HEAD'.split(' '))
      .then(initialCommitSHA => {
        git.raw(['reset', '--hard', initialCommitSHA.trim()])
      }),
    gitDeleteAllTags(git),
  ])
}

/**
 * Reset not only the working directory but the git repo itself.
 */
export async function gitRepo(git: SimpleGit): Promise<void> {
  await git.init()
  await git.raw(['add', '-A'])
  await gitEmptyCommit(git, 'initial commit')
}

/**
 * Create an empty commit in the repo.
 */
export async function gitEmptyCommit(
  git: SimpleGit,
  messge: string
): Promise<void> {
  await git.raw(['commit', '--allow-empty', '--message', messge])
}

/**
 * Delete all tags in the repo.
 */
export async function gitDeleteAllTags(git: SimpleGit): Promise<void> {
  const tagsFound: string | null = await git.raw(['tag'])
  if (tagsFound === null) return

  const tags = tagsFound
    .trim()
    .split('\n')
    .map(t => t.trim())
  if (tags.length) {
    await git.raw(['tag', '-d', ...tags])
  }
}
