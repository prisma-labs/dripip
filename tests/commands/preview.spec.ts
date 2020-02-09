import {
  createFeatCommit,
  createFixCommit,
  gitCreateEmptyCommit,
} from '../../src/lib/git'

const ctx = createContext('preview')

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

describe('stable preview releases', () => {
  it('treats release as stable preview if on trunk', async () => {
    const result = await ctx.dripip('preview --show-type')
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

  it('if build-num flag passed, the build number is forced to be it', async () => {
    createFixCommit(ctx.git)
    await ctx.git.addTag('0.1.0')
    createFeatCommit(ctx.git)
    const result = await ctx.dripip('preview --build-num 2 --dry-run')
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "bumpType": "minor",
          "commits": Array [
            Object {
              "parsed": Object {
                "body": null,
                "breakingChange": null,
                "completesInitialDevelopment": false,
                "description": "ti ti ti",
                "footers": Array [],
                "scope": null,
                "type": "feat",
                "typeKind": "feat",
              },
              "raw": "feat: ti ti ti",
            },
          ],
          "version": "0.2.0-next.2",
        },
        "kind": "ok",
        "type": "dry_run",
      }
    `)
  })

  it('if no stable release exists then pre-releases with just patch-affecting commits begin from stable version 0.0.1', async () => {
    await gitCreateEmptyCommit(ctx.git, 'fix: 1')
    const result = await ctx.dripip('preview --dry-run')
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "bumpType": "patch",
          "commits": Array [
            Object {
              "parsed": Object {
                "body": null,
                "breakingChange": null,
                "completesInitialDevelopment": false,
                "description": "1",
                "footers": Array [],
                "scope": null,
                "type": "fix",
                "typeKind": "fix",
              },
              "raw": "fix: 1",
            },
            Object {
              "parsed": Object {
                "body": null,
                "breakingChange": null,
                "completesInitialDevelopment": false,
                "description": "add package.json",
                "footers": Array [],
                "scope": null,
                "type": "chore",
                "typeKind": "chore",
              },
              "raw": "chore: add package.json",
            },
            Object {
              "parsed": Object {
                "body": null,
                "breakingChange": null,
                "completesInitialDevelopment": false,
                "description": "who knows",
                "footers": Array [],
                "scope": null,
                "type": "chore",
                "typeKind": "chore",
              },
              "raw": "chore: who knows",
            },
            Object {
              "parsed": null,
              "raw": "Initial commit",
            },
          ],
          "version": "0.0.1-next.1",
        },
        "kind": "ok",
        "type": "dry_run",
      }
    `)
  })

  it('if no stable release exists then pre-releases with at least one minor-affecting commits begin from stable version 0.1.0', async () => {
    await gitCreateEmptyCommit(ctx.git, 'feat: 1')
    const result = await ctx.dripip('preview --dry-run')
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "bumpType": "minor",
          "commits": Array [
            Object {
              "parsed": Object {
                "body": null,
                "breakingChange": null,
                "completesInitialDevelopment": false,
                "description": "1",
                "footers": Array [],
                "scope": null,
                "type": "feat",
                "typeKind": "feat",
              },
              "raw": "feat: 1",
            },
            Object {
              "parsed": Object {
                "body": null,
                "breakingChange": null,
                "completesInitialDevelopment": false,
                "description": "add package.json",
                "footers": Array [],
                "scope": null,
                "type": "chore",
                "typeKind": "chore",
              },
              "raw": "chore: add package.json",
            },
            Object {
              "parsed": Object {
                "body": null,
                "breakingChange": null,
                "completesInitialDevelopment": false,
                "description": "who knows",
                "footers": Array [],
                "scope": null,
                "type": "chore",
                "typeKind": "chore",
              },
              "raw": "chore: who knows",
            },
            Object {
              "parsed": null,
              "raw": "Initial commit",
            },
          ],
          "version": "0.1.0-next.1",
        },
        "kind": "ok",
        "type": "dry_run",
      }
    `)
  })

  it('if patch-affecting and minor-affecting commits in release bump type is minor', async () => {
    await gitCreateEmptyCommit(ctx.git, 'fix: 1')
    await gitCreateEmptyCommit(ctx.git, 'feat: 1')
    const result = await ctx.dripip('preview --dry-run')
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "bumpType": "minor",
          "commits": Array [
            Object {
              "parsed": Object {
                "body": null,
                "breakingChange": null,
                "completesInitialDevelopment": false,
                "description": "1",
                "footers": Array [],
                "scope": null,
                "type": "feat",
                "typeKind": "feat",
              },
              "raw": "feat: 1",
            },
            Object {
              "parsed": Object {
                "body": null,
                "breakingChange": null,
                "completesInitialDevelopment": false,
                "description": "1",
                "footers": Array [],
                "scope": null,
                "type": "fix",
                "typeKind": "fix",
              },
              "raw": "fix: 1",
            },
            Object {
              "parsed": Object {
                "body": null,
                "breakingChange": null,
                "completesInitialDevelopment": false,
                "description": "add package.json",
                "footers": Array [],
                "scope": null,
                "type": "chore",
                "typeKind": "chore",
              },
              "raw": "chore: add package.json",
            },
            Object {
              "parsed": Object {
                "body": null,
                "breakingChange": null,
                "completesInitialDevelopment": false,
                "description": "who knows",
                "footers": Array [],
                "scope": null,
                "type": "chore",
                "typeKind": "chore",
              },
              "raw": "chore: who knows",
            },
            Object {
              "parsed": null,
              "raw": "Initial commit",
            },
          ],
          "version": "0.1.0-next.1",
        },
        "kind": "ok",
        "type": "dry_run",
      }
    `)
  })

  it('if patch-affecting and minor-affecting and breaking change commits in release bump type is major', async () => {
    await gitCreateEmptyCommit(ctx.git, 'fix: 1')
    await gitCreateEmptyCommit(ctx.git, 'feat: 1')
    await gitCreateEmptyCommit(
      ctx.git,
      'feat: 2\n\nBREAKING CHANGE:\nblah blah blah'
    )
    const result = await ctx.dripip('preview --dry-run')
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "bumpType": "minor",
          "commits": Array [
            Object {
              "parsed": Object {
                "body": null,
                "breakingChange": "blah blah blah",
                "completesInitialDevelopment": false,
                "description": "2",
                "footers": Array [],
                "scope": null,
                "type": "feat",
                "typeKind": "feat",
              },
              "raw": "feat: 2

      BREAKING CHANGE:
      blah blah blah",
            },
            Object {
              "parsed": Object {
                "body": null,
                "breakingChange": null,
                "completesInitialDevelopment": false,
                "description": "1",
                "footers": Array [],
                "scope": null,
                "type": "feat",
                "typeKind": "feat",
              },
              "raw": "feat: 1",
            },
            Object {
              "parsed": Object {
                "body": null,
                "breakingChange": null,
                "completesInitialDevelopment": false,
                "description": "1",
                "footers": Array [],
                "scope": null,
                "type": "fix",
                "typeKind": "fix",
              },
              "raw": "fix: 1",
            },
            Object {
              "parsed": Object {
                "body": null,
                "breakingChange": null,
                "completesInitialDevelopment": false,
                "description": "add package.json",
                "footers": Array [],
                "scope": null,
                "type": "chore",
                "typeKind": "chore",
              },
              "raw": "chore: add package.json",
            },
            Object {
              "parsed": Object {
                "body": null,
                "breakingChange": null,
                "completesInitialDevelopment": false,
                "description": "who knows",
                "footers": Array [],
                "scope": null,
                "type": "chore",
                "typeKind": "chore",
              },
              "raw": "chore: who knows",
            },
            Object {
              "parsed": null,
              "raw": "Initial commit",
            },
          ],
          "version": "0.1.0-next.1",
        },
        "kind": "ok",
        "type": "dry_run",
      }
    `)
  })

  it('pre-releases only consider commits since last stable', async () => {
    await gitCreateEmptyCommit(ctx.git, 'fix: 1')
    await gitCreateEmptyCommit(ctx.git, 'feat: 1')
    await ctx.git.addAnnotatedTag('0.1.0', '0.1.0')
    await gitCreateEmptyCommit(ctx.git, 'fix: 1')
    await gitCreateEmptyCommit(ctx.git, 'fix: 2')
    const result = await ctx.dripip('preview --dry-run')
    // note how the feat commit leading to 0.1.0 is ignored below otherwise we'd
    // see 0.2.0
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "bumpType": "patch",
          "commits": Array [
            Object {
              "parsed": Object {
                "body": null,
                "breakingChange": null,
                "completesInitialDevelopment": false,
                "description": "2",
                "footers": Array [],
                "scope": null,
                "type": "fix",
                "typeKind": "fix",
              },
              "raw": "fix: 2",
            },
            Object {
              "parsed": Object {
                "body": null,
                "breakingChange": null,
                "completesInitialDevelopment": false,
                "description": "1",
                "footers": Array [],
                "scope": null,
                "type": "fix",
                "typeKind": "fix",
              },
              "raw": "fix: 1",
            },
          ],
          "version": "0.1.1-next.1",
        },
        "kind": "ok",
        "type": "dry_run",
      }
    `)
  })

  it('pre-releases increment from previous pre-release build number', async () => {
    await gitCreateEmptyCommit(ctx.git, 'fix: 1')
    await ctx.git.addAnnotatedTag('0.0.1-next.1', '0.0.1-next.1')
    await gitCreateEmptyCommit(ctx.git, 'fix: 2')
    await gitCreateEmptyCommit(ctx.git, 'fix: 3')
    const result = await ctx.dripip('preview --dry-run')
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "bumpType": "patch",
          "commits": Array [
            Object {
              "parsed": Object {
                "body": null,
                "breakingChange": null,
                "completesInitialDevelopment": false,
                "description": "3",
                "footers": Array [],
                "scope": null,
                "type": "fix",
                "typeKind": "fix",
              },
              "raw": "fix: 3",
            },
            Object {
              "parsed": Object {
                "body": null,
                "breakingChange": null,
                "completesInitialDevelopment": false,
                "description": "2",
                "footers": Array [],
                "scope": null,
                "type": "fix",
                "typeKind": "fix",
              },
              "raw": "fix: 2",
            },
          ],
          "version": "0.0.1-next.2",
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
    await ctx.git.checkoutLocalBranch('feat/foo')
    const result = await ctx.dripip('preview --dry-run')
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
    await gitCreateEmptyCommit(ctx.git, 'fix: thing')
    await ctx.git.addTag('v1.2.3-next.1')
    const result: any = await ctx.dripip('preview --dry-run')
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
    await gitCreateEmptyCommit(ctx.git, 'fix: thing')
    await ctx.git.addTag('v1.2.3')
    const result: any = await ctx.dripip('preview --dry-run')
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
    await ctx.git.addTag('v1.2.3')
    await ctx.git.addTag('v1.2.3-next.1')
    const result: any = await ctx.dripip('preview --dry-run')
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
    await ctx.git.addTag('v1.2.3')
    await ctx.git.addTag('v1.2.3-next.1')
    await ctx.git.addTag('foo')
    await ctx.git.addTag('bar')
    const result: any = await ctx.dripip('preview --dry-run')
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
    await ctx.git.addTag('foobar')
    const result = await ctx.dripip('preview --show-type --dry-run')
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
