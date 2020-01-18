// TODO test that context honours the base branch setting of the repo
import { createWorkspace } from '../../__lib/helpers'
import { gitCreateEmptyCommit } from '../../../src/lib/git'

const ws = createWorkspace('stable')

async function setupPackageJson() {
  await ws.fs.writeAsync('package.json', {
    name: 'foo',
    version: '0.0.0-ignoreme',
  })
}

describe('preflight requirements include that', () => {
  it('the branch is trunk', async () => {
    await ws.git.checkoutLocalBranch('foobar')
    const result: any = await ws.dripip('stable')
    result.data.context.sha = '__sha__'
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "context": Object {
            "branch": "foobar",
            "sha": "__sha__",
          },
          "summary": "You are attempting a stable release but you are not on trunk (aka. master/base branch)",
        },
        "kind": "exception",
        "type": "must_be_on_trunk",
      }
    `)
  })

  // TODO need a flag like --queued-releases which permits releasing on
  // potentially not the latest commit of trunk. Think of a CI situation with
  // race-condition PR merges.
  it('the branch is synced with remote (needs push)', async () => {
    await gitCreateEmptyCommit(ws.git, 'some work')
    const result: any = await ws.dripip('stable')
    result.data.context.sha = '__sha__'
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "context": Object {
            "sha": "__sha__",
            "syncStatus": "needs_push",
          },
          "summary": "You are attempting a stable release but your trunk (aka. master/base branch) is not synced with the remote.",
        },
        "kind": "exception",
        "type": "branch_not_synced_with_remote",
      }
    `)
  })

  it('the branch is synced with remote (needs pull)', async () => {
    await ws.git.raw(['reset', '--hard', 'head~2']) // package.json + something on remote
    await setupPackageJson()
    const result: any = await ws.dripip('stable')
    result.data.context.sha = '__sha__'
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "context": Object {
            "sha": "__sha__",
            "syncStatus": "needs_pull",
          },
          "summary": "You are attempting a stable release but your trunk (aka. master/base branch) is not synced with the remote.",
        },
        "kind": "exception",
        "type": "branch_not_synced_with_remote",
      }
    `)
  })

  it('the branch is synced with remote (diverged)', async () => {
    await ws.git.raw(['reset', '--hard', 'head~2']) // remove package.json + something on remote
    await setupPackageJson()
    await gitCreateEmptyCommit(ws.git, 'some work')
    const result: any = await ws.dripip('stable')
    result.data.context.sha = '__sha__'
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "context": Object {
            "sha": "__sha__",
            "syncStatus": "diverged",
          },
          "summary": "You are attempting a stable release but your trunk (aka. master/base branch) is not synced with the remote.",
        },
        "kind": "exception",
        "type": "branch_not_synced_with_remote",
      }
    `)
  })

  it('check that the commit does not already have a stable release present', async () => {
    await ws.git.raw(['reset', '--hard', 'head~1']) // package.json
    await setupPackageJson()
    await ws.git.addTag('1.0.0')
    const result: any = await ws.dripip('stable')
    result.data.context.sha = '__sha__'
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "context": Object {
            "sha": "__sha__",
            "version": "1.0.0",
          },
          "summary": "You are attempting a stable release on a commit that already has a stable release.",
        },
        "kind": "exception",
        "type": "commit_already_has_stable_release",
      }
    `)
  })
})

describe('increments upon the previous stable release based on conventional commit analysis of commits since latter', () => {
  beforeEach(async () => {
    await ws.git
      .raw(['push', '-f', 'origin', '--delete', 'foobar'])
      .catch(() => null)
    await ws.git.checkoutLocalBranch('foobar')
    await ws.git.raw(['push', '-u', 'origin', 'foobar'])
  })

  afterEach(async () => {
    await ws.git.raw(['push', '-f', 'origin', '--delete', 'foobar'])
  })

  it('unless all commits in release are chore-like', async () => {
    await ws.git.addAnnotatedTag('0.1.0', '0.1.0')
    await gitCreateEmptyCommit(ws.git, 'chore: 1')
    await gitCreateEmptyCommit(ws.git, 'chore: 2')
    await ws.git.push()
    const result: any = await ws.dripip('stable --dry-run --trunk foobar')
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "context": Object {
            "commits": Array [
              "chore: 2",
              "chore: 1",
            ],
          },
          "summary": "The release you attempting only contains chore commits which means no release is needed.",
        },
        "kind": "exception",
        "type": "only_chore_like_changes",
      }
    `)
  })

  it('fix commits since last release', async () => {
    await ws.git.addAnnotatedTag('0.1.0', '0.1.0')
    await gitCreateEmptyCommit(ws.git, 'fix: 1')
    await gitCreateEmptyCommit(ws.git, 'fix: 2')
    await ws.git.push()
    const result: any = await ws.dripip('stable --dry-run --trunk foobar')
    result.data.commits.forEach((c: any) => {
      c.sha = '__sha__'
    })
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "commits": Array [
            Object {
              "message": "fix: 2",
              "nonReleaseTags": Array [],
              "releases": Object {
                "preview": null,
                "stable": null,
              },
              "sha": "__sha__",
            },
            Object {
              "message": "fix: 1",
              "nonReleaseTags": Array [],
              "releases": Object {
                "preview": null,
                "stable": null,
              },
              "sha": "__sha__",
            },
          ],
          "newVer": "0.1.1",
        },
        "kind": "ok",
        "type": "dry_run",
      }
    `)
  })

  it('commit mix including chore feat fix', async () => {
    await gitCreateEmptyCommit(ws.git, 'feat: 1')
    await gitCreateEmptyCommit(ws.git, 'fix: 1')
    await gitCreateEmptyCommit(ws.git, 'chore: 1')
    await gitCreateEmptyCommit(ws.git, 'feat: 2')
    await ws.git.push()
    const result: any = await ws.dripip('stable --dry-run --trunk foobar')
    result.data.commits.forEach((c: any) => {
      c.sha = '__sha__'
    })
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "commits": Array [
            Object {
              "message": "feat: 2",
              "nonReleaseTags": Array [],
              "releases": Object {
                "preview": null,
                "stable": null,
              },
              "sha": "__sha__",
            },
            Object {
              "message": "chore: 1",
              "nonReleaseTags": Array [],
              "releases": Object {
                "preview": null,
                "stable": null,
              },
              "sha": "__sha__",
            },
            Object {
              "message": "fix: 1",
              "nonReleaseTags": Array [],
              "releases": Object {
                "preview": null,
                "stable": null,
              },
              "sha": "__sha__",
            },
            Object {
              "message": "feat: 1",
              "nonReleaseTags": Array [],
              "releases": Object {
                "preview": null,
                "stable": null,
              },
              "sha": "__sha__",
            },
            Object {
              "message": "chore: add package.json",
              "nonReleaseTags": Array [],
              "releases": Object {
                "preview": null,
                "stable": null,
              },
              "sha": "__sha__",
            },
            Object {
              "message": "chore: who knows",
              "nonReleaseTags": Array [],
              "releases": Object {
                "preview": null,
                "stable": null,
              },
              "sha": "__sha__",
            },
            Object {
              "message": "Initial commit",
              "nonReleaseTags": Array [],
              "releases": Object {
                "preview": null,
                "stable": null,
              },
              "sha": "__sha__",
            },
          ],
          "newVer": "0.1.0",
        },
        "kind": "ok",
        "type": "dry_run",
      }
    `)
  })
})
