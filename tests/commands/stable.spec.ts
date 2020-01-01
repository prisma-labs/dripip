import { createWorkspace } from '../__lib/helpers'
import { gitCreateEmptyCommit, gitInitRepo } from '../../src/lib/git'

const ws = createWorkspace('stable')

describe('preflight requirements include that', () => {
  beforeEach(async () => {
    await ws.git.raw(['reset', '--hard', 'head~1']) // package json change
  })
  it('the branch is trunk', async () => {
    await ws.git.checkoutLocalBranch('foobar')
    const result: any = await ws.libre('stable')
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
    const result: any = await ws.libre('stable')
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
    await ws.git.raw(['reset', '--hard', 'head~1']) // something on remote
    const result: any = await ws.libre('stable')
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
    await ws.git.raw(['reset', '--hard', 'head~1']) // remove something on remote
    await gitCreateEmptyCommit(ws.git, 'some work')
    const result: any = await ws.libre('stable')
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
    await ws.git.addTag('1.0.0')
    const result: any = await ws.libre('stable')
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
