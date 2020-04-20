import isogit from 'isomorphic-git'
import { createGit } from '../../../src/lib/git'
import { TmpDirContribution } from './tmp-dir'

interface GitContribution {
  git: typeof isogit
}

export const git = (ctx: TmpDirContribution): GitContribution => {
  const git = createGit()
  git.cwd(ctx.dir)
  return { git: isogit }
}
