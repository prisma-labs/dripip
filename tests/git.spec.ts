import * as Git from '../src/lib/git'

const ws = createWorkspace({
  name: 'system-git',
})

describe('streamLog', () => {
  it('streams commits from newest to oldest', async () => {
    await Git.gitCreateEmptyCommit(ws.git, 'work 1')
    await ws.git.addTag('tag-1')
    await Git.gitCreateEmptyCommit(ws.git, 'work 2')
    await ws.git.addTag('tag-2')
    await Git.gitCreateEmptyCommit(ws.git, 'work 3')
    await ws.git.addTag('tag-3a')
    await ws.git.addTag('tag-3b')
    const entries = []
    for await (const entry of Git.streamLog({ cwd: ws.dir.path })) {
      entries.push(entry)
    }
    entries.forEach((e) => (e.sha = '__sha__'))
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
