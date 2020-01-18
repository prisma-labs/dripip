import { createWorkspace } from '../../__lib/helpers'
import { gitCreateEmptyCommit } from '../../../src/lib/git'

const ws = createWorkspace('preview')

describe('pr preview releases', () => {
  let instanceId: string
  let branchName: string

  beforeEach(async () => {
    instanceId = String(Math.random()).replace('0.', '')
    branchName = 'feat/foo-' + instanceId
    // https://github.com/steveukx/git-js/issues/14#issuecomment-45430322
    await ws.git.checkout(['-b', branchName])
    await gitCreateEmptyCommit(ws.git, 'some work on new branch')
    // await ws.git.addRemote(
    //   'origin',
    //   'https://github.com/prisma-labs/dripip-system-tests.git'
    // )
    await ws.git.raw(['push', '--set-upstream', 'origin', branchName])
  })

  it('treats release as a pr preview if circleci env vars signify there is a pr', async () => {
    process.env.CIRCLECI = 'true'
    process.env.CIRCLE_PULL_REQUEST = 'true'
    const result = await ws.dripip('preview --show-type')
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "reason": "ci_env_var",
          "type": "pr",
        },
        "kind": "ok",
        "type": "release_type",
      }
    `)
  })

  it('treats releases as a pr preview if on branch with open pr', async () => {
    try {
      await ws.octokit.pulls.create({
        head: branchName,
        base: 'master',
        owner: 'prisma-labs',
        repo: 'dripip-system-tests',
        title: `${instanceId} treats releases as a pr preview if on branch with open pr`,
      })
    } catch (e) {
      console.log(e)
    }
    const result = await ws.dripip('preview --show-type')
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

describe('stable preview releases', () => {
  it('treats release as stable preview if on trunk', async () => {
    const result = await ws.dripip('preview --show-type')
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "reason": "is_trunk",
          "type": "stable",
        },
        "kind": "ok",
        "type": "release_type",
      }
    `)
  })

  it('if no stable release exists then pre-releases with just patch-affecting commits begin from stable version 0.0.1', async () => {
    await gitCreateEmptyCommit(ws.git, 'fix: 1')
    const result = await ws.dripip('preview --dry-run')
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "bumpType": "patch",
          "commitsInRelease": Array [
            "fix: 1",
            "chore: add package.json",
            "chore: who knows",
            "Initial commit",
          ],
          "currentPreviewNumber": null,
          "currentStable": null,
          "currentVersion": null,
          "isFirstVer": true,
          "isFirstVerPreRelease": true,
          "isFirstVerStable": true,
          "nextPreviewNumber": 1,
          "nextStable": "0.0.1",
          "nextVersion": "0.0.1-next.1",
        },
        "kind": "ok",
        "type": "dry_run",
      }
    `)
  })

  it('if no stable release exists then pre-releases with at least one minor-affecting commits begin from stable version 0.1.0', async () => {
    await gitCreateEmptyCommit(ws.git, 'feat: 1')
    const result = await ws.dripip('preview --dry-run')
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "bumpType": "minor",
          "commitsInRelease": Array [
            "feat: 1",
            "chore: add package.json",
            "chore: who knows",
            "Initial commit",
          ],
          "currentPreviewNumber": null,
          "currentStable": null,
          "currentVersion": null,
          "isFirstVer": true,
          "isFirstVerPreRelease": true,
          "isFirstVerStable": true,
          "nextPreviewNumber": 1,
          "nextStable": "0.1.0",
          "nextVersion": "0.1.0-next.1",
        },
        "kind": "ok",
        "type": "dry_run",
      }
    `)
  })

  it('if patch-affecting and minor-affecting commits in release bump type is minor', async () => {
    await gitCreateEmptyCommit(ws.git, 'fix: 1')
    await gitCreateEmptyCommit(ws.git, 'feat: 1')
    const result = await ws.dripip('preview --dry-run')
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "bumpType": "minor",
          "commitsInRelease": Array [
            "feat: 1",
            "fix: 1",
            "chore: add package.json",
            "chore: who knows",
            "Initial commit",
          ],
          "currentPreviewNumber": null,
          "currentStable": null,
          "currentVersion": null,
          "isFirstVer": true,
          "isFirstVerPreRelease": true,
          "isFirstVerStable": true,
          "nextPreviewNumber": 1,
          "nextStable": "0.1.0",
          "nextVersion": "0.1.0-next.1",
        },
        "kind": "ok",
        "type": "dry_run",
      }
    `)
  })

  it('if patch-affecting and minor-affecting and breaking change commits in release bump type is major', async () => {
    await gitCreateEmptyCommit(ws.git, 'fix: 1')
    await gitCreateEmptyCommit(ws.git, 'feat: 1')
    await gitCreateEmptyCommit(
      ws.git,
      'feat: 2\nBREAKING CHANGE:\nblah blah blah'
    )
    const result = await ws.dripip('preview --dry-run')
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "bumpType": "major",
          "commitsInRelease": Array [
            "feat: 2
      BREAKING CHANGE:
      blah blah blah",
            "feat: 1",
            "fix: 1",
            "chore: add package.json",
            "chore: who knows",
            "Initial commit",
          ],
          "currentPreviewNumber": null,
          "currentStable": null,
          "currentVersion": null,
          "isFirstVer": true,
          "isFirstVerPreRelease": true,
          "isFirstVerStable": true,
          "nextPreviewNumber": 1,
          "nextStable": "1.0.0",
          "nextVersion": "1.0.0-next.1",
        },
        "kind": "ok",
        "type": "dry_run",
      }
    `)
  })

  it('pre-releases only consider commits since last stable', async () => {
    await gitCreateEmptyCommit(ws.git, 'fix: 1')
    await gitCreateEmptyCommit(ws.git, 'feat: 1')
    await ws.git.addAnnotatedTag('0.1.0', '0.1.0')
    await gitCreateEmptyCommit(ws.git, 'fix: 1')
    await gitCreateEmptyCommit(ws.git, 'fix: 2')
    const result = await ws.dripip('preview --dry-run')
    // note how the feat commit leading to 0.1.0 is ignored below otherwise we'd
    // see 0.2.0
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "bumpType": "patch",
          "commitsInRelease": Array [
            "fix: 2",
            "fix: 1",
          ],
          "currentPreviewNumber": null,
          "currentStable": "0.1.0",
          "currentVersion": "0.1.0",
          "isFirstVer": false,
          "isFirstVerPreRelease": true,
          "isFirstVerStable": false,
          "nextPreviewNumber": 1,
          "nextStable": "0.1.1",
          "nextVersion": "0.1.1-next.1",
        },
        "kind": "ok",
        "type": "dry_run",
      }
    `)
  })

  it('pre-releases increment from previous pre-release build number', async () => {
    await gitCreateEmptyCommit(ws.git, 'fix: 1')
    await ws.git.addAnnotatedTag('0.0.1-next.1', '0.0.1-next.1')
    await gitCreateEmptyCommit(ws.git, 'fix: 2')
    await gitCreateEmptyCommit(ws.git, 'fix: 3')
    const result = await ws.dripip('preview --dry-run')
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "bumpType": "patch",
          "commitsInRelease": Array [
            "fix: 3",
            "fix: 2",
          ],
          "currentPreviewNumber": 1,
          "currentStable": null,
          "currentVersion": "0.0.1-next.1",
          "isFirstVer": false,
          "isFirstVerPreRelease": false,
          "isFirstVerStable": true,
          "nextPreviewNumber": 2,
          "nextStable": "0.0.1",
          "nextVersion": "0.0.1-next.2",
        },
        "kind": "ok",
        "type": "dry_run",
      }
    `)
  })
})

describe('preflight assertions', () => {
  function replaceSHA(result: any): any {
    result.data.context.sha = '__sha__'
    result.data.summary = result.data.summary.replace(
      /(commit is:\s*)[\w\d]+/g,
      '$1__sha__'
    )
    return result
  }

  // TODO maybe... this is quite the edge-case and would charge all users a
  // latency fee wherein every stable preview release requires a pr check
  // anyways just to see if this super weird case is ocurring...
  it.todo(
    'fails semantically if trunk and pr detected becuase that demands conflicting reactions'
  )

  it('fails semantically if not on trunk and branch has no open pr', async () => {
    await ws.git.checkoutLocalBranch('feat/foo')
    const result = await ws.dripip('preview --dry-run')
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "context": Object {},
          "summary": "Preview releases are only supported on trunk (master) branch or branches with _open_ pull-requests. If you want to make a preview release for this branch then open a pull-request for it.",
        },
        "kind": "exception",
        "type": "invalid_branch_for_pre_release",
      }
    `)
  })

  it('fails semantically if there is already a preview release present', async () => {
    await gitCreateEmptyCommit(ws.git, 'fix: thing')
    await ws.git.addTag('v1.2.3-next.1')
    const result: any = await ws.dripip('preview --dry-run')
    expect(replaceSHA(result)).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "context": Object {
            "otherTags": Array [],
            "preReleaseTag": "1.2.3-next.1",
            "sha": "__sha__",
          },
          "summary": "You cannot make a preview release for this commit because a preview release was already made.",
        },
        "kind": "exception",
        "type": "invalid_pre_release_case",
      }
    `)
  })

  it('fails semantically if there is already a stable release present', async () => {
    await gitCreateEmptyCommit(ws.git, 'fix: thing')
    await ws.git.addTag('v1.2.3')
    const result: any = await ws.dripip('preview --dry-run')
    expect(replaceSHA(result)).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "context": Object {
            "otherTags": Array [],
            "sha": "__sha__",
            "stableReleaseTag": "1.2.3",
          },
          "summary": "You cannot make a preview release for this commit because a stable release was already made.",
        },
        "kind": "exception",
        "type": "invalid_pre_release_case",
      }
    `)
  })

  it('fails semantically if there is a stable AND preview release', async () => {
    await ws.git.addTag('v1.2.3')
    await ws.git.addTag('v1.2.3-next.1')
    const result: any = await ws.dripip('preview --dry-run')
    expect(replaceSHA(result)).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "context": Object {
            "otherTags": Array [],
            "preReleaseTag": "1.2.3-next.1",
            "sha": "__sha__",
            "stableReleaseTag": "1.2.3",
          },
          "summary": "You cannot make a preview release for this commit because stable and preview releases were already made",
        },
        "kind": "exception",
        "type": "invalid_pre_release_case",
      }
    `)
  })

  it('renders other tags found if any', async () => {
    await ws.git.addTag('v1.2.3')
    await ws.git.addTag('v1.2.3-next.1')
    await ws.git.addTag('foo')
    await ws.git.addTag('bar')
    const result: any = await ws.dripip('preview --dry-run')
    expect(replaceSHA(result)).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "context": Object {
            "otherTags": Array [
              "foo",
              "bar",
            ],
            "preReleaseTag": "1.2.3-next.1",
            "sha": "__sha__",
            "stableReleaseTag": "1.2.3",
          },
          "summary": "You cannot make a preview release for this commit because stable and preview releases were already made",
        },
        "kind": "exception",
        "type": "invalid_pre_release_case",
      }
    `)
  })

  it('does not include non-release tags', async () => {
    await ws.git.addTag('foobar')
    const result = await ws.dripip('preview --show-type --dry-run')
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "reason": "is_trunk",
          "type": "stable",
        },
        "kind": "ok",
        "type": "release_type",
      }
    `)
  })
})
