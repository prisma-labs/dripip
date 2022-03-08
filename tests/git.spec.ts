import * as Git from '../src/lib/git'
import { fixture } from './__providers__/fixture'
import { git } from './__providers__/git'
import { konn, providers } from 'konn'
import createGit from 'simple-git/promise'

const ctx = konn()
  .useBeforeAll(providers.dir())
  .useBeforeAll(git())
  .useBeforeEach(fixture({ use: `git-init`, into: `.git` }))
  .done()

describe(`streamLog`, () => {
  it(`streams commits from newest to oldest`, async () => {
    await ctx.git.commit(`initial commit`)
    const git = createGit(ctx.fs.cwd())
    await Git.gitCreateEmptyCommit(git, `work 1`)
    await ctx.git.tag(`tag-1`)
    await Git.gitCreateEmptyCommit(git, `work 2`)
    await ctx.git.tag(`tag-2`)
    await Git.gitCreateEmptyCommit(git, `work 3`)
    await ctx.git.tag(`tag-3a`)
    await ctx.git.tag(`tag-3b`)
    // console.log(await ctx.git.log())
    const entries = []
    for await (const entry of Git.streamLog({ cwd: ctx.fs.cwd() })) {
      entries.push(entry)
    }
    entries.forEach((e) => (e.sha = `__sha__`))
    expect(entries).toMatchInlineSnapshot(`
      Array [
        Object {
          "message": "work 3",
          "sha": "__sha__",
          "tags": Array [
            "tag-3b",
            "tag-3a",
          ],
        },
        Object {
          "message": "work 2",
          "sha": "__sha__",
          "tags": Array [
            "tag-2",
          ],
        },
        Object {
          "message": "work 1",
          "sha": "__sha__",
          "tags": Array [
            "tag-1",
          ],
        },
        Object {
          "message": "initial commit",
          "sha": "__sha__",
          "tags": Array [],
        },
      ]
    `)
  })
})
