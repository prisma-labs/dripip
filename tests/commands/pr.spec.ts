import { gitCreateEmptyCommit } from '../../src/lib/git'

const ctx = createContext('pr')
let instanceId: string
let branchName: string

beforeEach(async () => {
  instanceId = String(Math.random()).replace('0.', '')
  branchName = 'feat/foo-' + instanceId
  // https://github.com/steveukx/git-js/issues/14#issuecomment-45430322
  await ctx.git.checkout(['-b', branchName])
  await gitCreateEmptyCommit(ctx.git, 'some work on new branch')
  // await ws.git.addRemote(
  //   'origin',
  //   'https://github.com/prisma-labs/dripip-system-tests.git'
  // )
  await ctx.git.raw(['push', '--set-upstream', 'origin', branchName])
})
