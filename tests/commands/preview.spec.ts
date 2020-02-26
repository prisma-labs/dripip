import {
  createFeatCommit,
  createFixCommit,
  gitCreateEmptyCommit,
} from '../../src/lib/git'

const ctx = createContext('preview')

it('if build-num flag passed, the build number is forced to be it', async () => {
  createFixCommit(ctx.git)
  await ctx.git.addTag('0.1.0')
  createFeatCommit(ctx.git)
  const result = await ctx.dripip('preview --build-num 2 --dry-run')
  expect(result).toMatchInlineSnapshot(`
    Object {
      "data": Object {
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
        "release": Object {
          "bumpType": "minor",
          "version": Object {
            "major": 0,
            "minor": 2,
            "patch": 0,
            "preRelease": Object {
              "buildNum": 2,
              "identifier": "next",
            },
            "version": "0.2.0-next.2",
            "vprefix": false,
          },
        },
        "report": Object {
          "mustFailures": Array [],
          "passes": Array [
            Object {
              "code": "npm_auth_not_setup",
              "details": Object {},
              "summary": "You must have npm auth setup to publish to the registrty",
            },
            Object {
              "code": "must_be_on_trunk",
              "details": Object {},
              "summary": "You must be on the trunk branch",
            },
            Object {
              "code": "preview_on_commit_with_preview_and_or_stable",
              "details": Object {},
              "summary": "A preview release requires the commit to have no existing stable or preview release.",
            },
            Object {
              "code": "series_empty",
              "details": Object {},
              "summary": "A preview release must have at least one commit since the last preview",
            },
            Object {
              "code": "series_only_has_meaningless_commits",
              "details": Object {},
              "summary": "A preview release must have at least one semantic commit",
            },
          ],
          "preferFailures": Array [],
        },
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
        "release": Object {
          "bumpType": "patch",
          "version": Object {
            "major": 0,
            "minor": 0,
            "patch": 1,
            "preRelease": Object {
              "buildNum": 1,
              "identifier": "next",
            },
            "version": "0.0.1-next.1",
            "vprefix": false,
          },
        },
        "report": Object {
          "mustFailures": Array [],
          "passes": Array [
            Object {
              "code": "npm_auth_not_setup",
              "details": Object {},
              "summary": "You must have npm auth setup to publish to the registrty",
            },
            Object {
              "code": "must_be_on_trunk",
              "details": Object {},
              "summary": "You must be on the trunk branch",
            },
            Object {
              "code": "preview_on_commit_with_preview_and_or_stable",
              "details": Object {},
              "summary": "A preview release requires the commit to have no existing stable or preview release.",
            },
            Object {
              "code": "series_empty",
              "details": Object {},
              "summary": "A preview release must have at least one commit since the last preview",
            },
            Object {
              "code": "series_only_has_meaningless_commits",
              "details": Object {},
              "summary": "A preview release must have at least one semantic commit",
            },
          ],
          "preferFailures": Array [],
        },
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
        "release": Object {
          "bumpType": "minor",
          "version": Object {
            "major": 0,
            "minor": 1,
            "patch": 0,
            "preRelease": Object {
              "buildNum": 1,
              "identifier": "next",
            },
            "version": "0.1.0-next.1",
            "vprefix": false,
          },
        },
        "report": Object {
          "mustFailures": Array [],
          "passes": Array [
            Object {
              "code": "npm_auth_not_setup",
              "details": Object {},
              "summary": "You must have npm auth setup to publish to the registrty",
            },
            Object {
              "code": "must_be_on_trunk",
              "details": Object {},
              "summary": "You must be on the trunk branch",
            },
            Object {
              "code": "preview_on_commit_with_preview_and_or_stable",
              "details": Object {},
              "summary": "A preview release requires the commit to have no existing stable or preview release.",
            },
            Object {
              "code": "series_empty",
              "details": Object {},
              "summary": "A preview release must have at least one commit since the last preview",
            },
            Object {
              "code": "series_only_has_meaningless_commits",
              "details": Object {},
              "summary": "A preview release must have at least one semantic commit",
            },
          ],
          "preferFailures": Array [],
        },
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
        "release": Object {
          "bumpType": "minor",
          "version": Object {
            "major": 0,
            "minor": 1,
            "patch": 0,
            "preRelease": Object {
              "buildNum": 1,
              "identifier": "next",
            },
            "version": "0.1.0-next.1",
            "vprefix": false,
          },
        },
        "report": Object {
          "mustFailures": Array [],
          "passes": Array [
            Object {
              "code": "npm_auth_not_setup",
              "details": Object {},
              "summary": "You must have npm auth setup to publish to the registrty",
            },
            Object {
              "code": "must_be_on_trunk",
              "details": Object {},
              "summary": "You must be on the trunk branch",
            },
            Object {
              "code": "preview_on_commit_with_preview_and_or_stable",
              "details": Object {},
              "summary": "A preview release requires the commit to have no existing stable or preview release.",
            },
            Object {
              "code": "series_empty",
              "details": Object {},
              "summary": "A preview release must have at least one commit since the last preview",
            },
            Object {
              "code": "series_only_has_meaningless_commits",
              "details": Object {},
              "summary": "A preview release must have at least one semantic commit",
            },
          ],
          "preferFailures": Array [],
        },
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
        "release": Object {
          "bumpType": "minor",
          "version": Object {
            "major": 0,
            "minor": 1,
            "patch": 0,
            "preRelease": Object {
              "buildNum": 1,
              "identifier": "next",
            },
            "version": "0.1.0-next.1",
            "vprefix": false,
          },
        },
        "report": Object {
          "mustFailures": Array [],
          "passes": Array [
            Object {
              "code": "npm_auth_not_setup",
              "details": Object {},
              "summary": "You must have npm auth setup to publish to the registrty",
            },
            Object {
              "code": "must_be_on_trunk",
              "details": Object {},
              "summary": "You must be on the trunk branch",
            },
            Object {
              "code": "preview_on_commit_with_preview_and_or_stable",
              "details": Object {},
              "summary": "A preview release requires the commit to have no existing stable or preview release.",
            },
            Object {
              "code": "series_empty",
              "details": Object {},
              "summary": "A preview release must have at least one commit since the last preview",
            },
            Object {
              "code": "series_only_has_meaningless_commits",
              "details": Object {},
              "summary": "A preview release must have at least one semantic commit",
            },
          ],
          "preferFailures": Array [],
        },
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
        "release": Object {
          "bumpType": "patch",
          "version": Object {
            "major": 0,
            "minor": 1,
            "patch": 1,
            "preRelease": Object {
              "buildNum": 1,
              "identifier": "next",
            },
            "version": "0.1.1-next.1",
            "vprefix": false,
          },
        },
        "report": Object {
          "mustFailures": Array [],
          "passes": Array [
            Object {
              "code": "npm_auth_not_setup",
              "details": Object {},
              "summary": "You must have npm auth setup to publish to the registrty",
            },
            Object {
              "code": "must_be_on_trunk",
              "details": Object {},
              "summary": "You must be on the trunk branch",
            },
            Object {
              "code": "preview_on_commit_with_preview_and_or_stable",
              "details": Object {},
              "summary": "A preview release requires the commit to have no existing stable or preview release.",
            },
            Object {
              "code": "series_empty",
              "details": Object {},
              "summary": "A preview release must have at least one commit since the last preview",
            },
            Object {
              "code": "series_only_has_meaningless_commits",
              "details": Object {},
              "summary": "A preview release must have at least one semantic commit",
            },
          ],
          "preferFailures": Array [],
        },
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
        "release": Object {
          "bumpType": "patch",
          "version": Object {
            "major": 0,
            "minor": 0,
            "patch": 1,
            "preRelease": Object {
              "buildNum": 2,
              "identifier": "next",
            },
            "version": "0.0.1-next.2",
            "vprefix": false,
          },
        },
        "report": Object {
          "mustFailures": Array [],
          "passes": Array [
            Object {
              "code": "npm_auth_not_setup",
              "details": Object {},
              "summary": "You must have npm auth setup to publish to the registrty",
            },
            Object {
              "code": "must_be_on_trunk",
              "details": Object {},
              "summary": "You must be on the trunk branch",
            },
            Object {
              "code": "preview_on_commit_with_preview_and_or_stable",
              "details": Object {},
              "summary": "A preview release requires the commit to have no existing stable or preview release.",
            },
            Object {
              "code": "series_empty",
              "details": Object {},
              "summary": "A preview release must have at least one commit since the last preview",
            },
            Object {
              "code": "series_only_has_meaningless_commits",
              "details": Object {},
              "summary": "A preview release must have at least one semantic commit",
            },
          ],
          "preferFailures": Array [],
        },
      },
      "kind": "ok",
      "type": "dry_run",
    }
  `)
})

describe('preflight checks', () => {
  it('must be on trunk', async () => {
    await ctx.git.checkoutLocalBranch('feat/foo')
    const result: any = await ctx.dripip('preview --dry-run')
    expect(result.data.report).toMatchInlineSnapshot(`
      Object {
        "mustFailures": Array [
          Object {
            "code": "must_be_on_trunk",
            "details": Object {},
            "summary": "You must be on the trunk branch",
          },
          Object {
            "code": "series_only_has_meaningless_commits",
            "details": Object {},
            "summary": "A preview release must have at least one semantic commit",
          },
        ],
        "passes": Array [
          Object {
            "code": "npm_auth_not_setup",
            "details": Object {},
            "summary": "You must have npm auth setup to publish to the registrty",
          },
          Object {
            "code": "preview_on_commit_with_preview_and_or_stable",
            "details": Object {},
            "summary": "A preview release requires the commit to have no existing stable or preview release.",
          },
          Object {
            "code": "series_empty",
            "details": Object {},
            "summary": "A preview release must have at least one commit since the last preview",
          },
        ],
        "preferFailures": Array [],
      }
    `)
  })

  it('no preview release already present', async () => {
    await gitCreateEmptyCommit(ctx.git, 'fix: thing')
    await ctx.git.addTag('v1.2.3-next.1')
    const result: any = await ctx.dripip('preview --dry-run')
    expect(result.data.report).toMatchInlineSnapshot(`
      Object {
        "mustFailures": Array [
          Object {
            "code": "preview_on_commit_with_preview_and_or_stable",
            "details": Object {
              "subCode": "preview",
            },
            "summary": "A preview release requires the commit to have no existing stable or preview release.",
          },
        ],
        "passes": Array [
          Object {
            "code": "npm_auth_not_setup",
            "details": Object {},
            "summary": "You must have npm auth setup to publish to the registrty",
          },
          Object {
            "code": "must_be_on_trunk",
            "details": Object {},
            "summary": "You must be on the trunk branch",
          },
          Object {
            "code": "series_empty",
            "details": Object {},
            "summary": "A preview release must have at least one commit since the last preview",
          },
          Object {
            "code": "series_only_has_meaningless_commits",
            "details": Object {},
            "summary": "A preview release must have at least one semantic commit",
          },
        ],
        "preferFailures": Array [],
      }
    `)
  })

  it('no stable release already present', async () => {
    await gitCreateEmptyCommit(ctx.git, 'fix: thing')
    await ctx.git.addTag('v1.2.3')
    const result: any = await ctx.dripip('preview --dry-run')
    expect(result.data.report).toMatchInlineSnapshot(`
      Object {
        "mustFailures": Array [
          Object {
            "code": "preview_on_commit_with_preview_and_or_stable",
            "details": Object {
              "subCode": "stable",
            },
            "summary": "A preview release requires the commit to have no existing stable or preview release.",
          },
          Object {
            "code": "series_empty",
            "details": Object {},
            "summary": "A preview release must have at least one commit since the last preview",
          },
        ],
        "passes": Array [
          Object {
            "code": "npm_auth_not_setup",
            "details": Object {},
            "summary": "You must have npm auth setup to publish to the registrty",
          },
          Object {
            "code": "must_be_on_trunk",
            "details": Object {},
            "summary": "You must be on the trunk branch",
          },
          Object {
            "code": "series_only_has_meaningless_commits",
            "details": Object {},
            "summary": "A preview release must have at least one semantic commit",
          },
        ],
        "preferFailures": Array [],
      }
    `)
  })

  it('no stable AND preview release already present (shows graceful aggregate reporting of the cases)', async () => {
    await ctx.git.addTag('v1.2.3')
    await ctx.git.addTag('v1.2.3-next.1')
    const result: any = await ctx.dripip('preview --dry-run')
    expect(result.data.report).toMatchInlineSnapshot(`
      Object {
        "mustFailures": Array [
          Object {
            "code": "preview_on_commit_with_preview_and_or_stable",
            "details": Object {
              "subCode": "preview_and_stable",
            },
            "summary": "A preview release requires the commit to have no existing stable or preview release.",
          },
          Object {
            "code": "series_empty",
            "details": Object {},
            "summary": "A preview release must have at least one commit since the last preview",
          },
        ],
        "passes": Array [
          Object {
            "code": "npm_auth_not_setup",
            "details": Object {},
            "summary": "You must have npm auth setup to publish to the registrty",
          },
          Object {
            "code": "must_be_on_trunk",
            "details": Object {},
            "summary": "You must be on the trunk branch",
          },
          Object {
            "code": "series_only_has_meaningless_commits",
            "details": Object {},
            "summary": "A preview release must have at least one semantic commit",
          },
        ],
        "preferFailures": Array [],
      }
    `)
  })

  // TODO maybe... this is quite the edge-case and would charge all users a
  // latency fee wherein every stable preview release requires a pr check
  // anyways just to see if this super weird case is ocurring...
  it.todo(
    'fails semantically if trunk and pr detected becuase that demands conflicting reactions'
  )
})
