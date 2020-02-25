describe('pr preview releases', () => {
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

  it('treats releases as a pr preview if on branch with open pr', async () => {
    try {
      await ctx.octokit.pulls.create({
        head: branchName,
        base: 'master',
        owner: 'prisma-labs',
        repo: 'dripip-system-tests',
        title: `${instanceId} treats releases as a pr preview if on branch with open pr`,
      })
    } catch (e) {
      console.log(e)
    }
    const result = await ctx.dripip('preview --show-type')
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "reason": "git_branch_github_api",
          "type": "pr",
        },
        "kind": "ok",
        "type": "release_type",
      }
    `)
  })
})
