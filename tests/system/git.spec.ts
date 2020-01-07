import * as Git from '../../src/lib/git'
import * as WS from '../__lib/workspace'

const ws = WS.createWorkspace({
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
    expect(entries).toMatchInlineSnapshot(`
      Array [
        Object {
          "message": "work 3",
          "sha": "660a73bc9a4dfc67078c7b5b852a648a81f8e790",
          "tags": Array [
            "tag-3b",
            "tag-3a",
          ],
        },
        Object {
          "message": "work 2",
          "sha": "4476e403fe0fb1cfde343907e19c3dc7af3cd701",
          "tags": Array [
            "tag-2",
          ],
        },
        Object {
          "message": "work 1",
          "sha": "b79ffbcb9ed2179c0509cd3d1e129c2bc587b50e",
          "tags": Array [
            "tag-1",
          ],
        },
        Object {
          "message": "initial commit",
          "sha": "9dce8fcd167b7bbc60b2f370849a0a35655dcc00",
          "tags": Array [],
        },
      ]
    `)
  })
})
