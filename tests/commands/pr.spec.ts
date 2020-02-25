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

it('preflight check that user is on branch with open pr', async () => {
  const result: any = await ctx.dripip('pr --json', { error: true })
  expect(result.failures).toMatchInlineSnapshot(`
    Array [
      Object {
        "code": "pr_release_without_open_pr",
        "details": Object {},
        "summary": "Pull-Request releases are only supported on branches with _open_ pull-requests",
      },
    ]
  `)
})

it('makes a release for the current commit, updating pr dist tag, and version format', async () => {
  await ctx.octokit.pulls.create({
    head: branchName,
    base: 'master',
    owner: 'prisma-labs',
    repo: 'dripip-system-tests',
    title: `${instanceId} treats releases as a pr preview if on branch with open pr`,
  })
  const result: any = await ctx.dripip('pr --json --dry-run')
  expect(result.data.publishPlan).toMatchObject({
    options: {
      gitTag: 'none',
    },
    release: {
      distTag: expect.stringMatching(/pr.\d+/),
      version: expect.stringMatching(/0.0.0-pr.\d+.[a-z0-9]+/),
    },
  })
})
