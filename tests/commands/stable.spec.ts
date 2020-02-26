// TODO test that context honours the base branch setting of the repo
import { gitCreateEmptyCommit } from '../../src/lib/git'

const ctx = createContext('stable')

async function setupPackageJson() {
  await ctx.fs.writeAsync('package.json', {
    name: 'foo',
    version: '0.0.0-ignoreme',
  })
}

describe('preflight requirements include that', () => {
  it('the branch is trunk', async () => {
    await ctx.git.checkoutLocalBranch('foobar')
    const result: any = await ctx.dripip('stable', { error: true })
    expect(result.failures).toMatchInlineSnapshot(`
      Array [
        Object {
          "code": "must_be_on_trunk",
          "details": Object {},
          "summary": "You must be on the trunk branch",
        },
        Object {
          "code": "branch_not_synced_with_remote",
          "details": Object {
            "syncStatus": "remote_needs_branch",
          },
          "summary": "Your branch must be synced with the remote",
        },
        Object {
          "code": "series_only_has_meaningless_commits",
          "details": Object {},
          "summary": "A stable release must have at least one semantic commit",
        },
      ]
    `)
  })

  // TODO need a flag like --queued-releases which permits releasing on
  // potentially not the latest commit of trunk. Think of a CI situation with
  // race-condition PR merges.
  it('the branch is synced with remote (needs push)', async () => {
    await gitCreateEmptyCommit(ctx.git, 'some work')
    const result: any = await ctx.dripip('stable', { error: true })
    expect(result.failures).toMatchInlineSnapshot(`
      Array [
        Object {
          "code": "branch_not_synced_with_remote",
          "details": Object {
            "syncStatus": "needs_push",
          },
          "summary": "Your branch must be synced with the remote",
        },
        Object {
          "code": "series_only_has_meaningless_commits",
          "details": Object {},
          "summary": "A stable release must have at least one semantic commit",
        },
      ]
    `)
  })

  it('the branch is synced with remote (needs pull)', async () => {
    await ctx.git.raw(['reset', '--hard', 'head~2']) // package.json + something on remote
    await setupPackageJson()
    const result: any = await ctx.dripip('stable', { error: true })
    expect(result.failures).toMatchInlineSnapshot(`
      Array [
        Object {
          "code": "branch_not_synced_with_remote",
          "details": Object {
            "syncStatus": "needs_pull",
          },
          "summary": "Your branch must be synced with the remote",
        },
        Object {
          "code": "series_only_has_meaningless_commits",
          "details": Object {},
          "summary": "A stable release must have at least one semantic commit",
        },
      ]
    `)
  })

  it('the branch is synced with remote (diverged)', async () => {
    await ctx.git.raw(['reset', '--hard', 'head~2']) // remove package.json + something on remote
    await setupPackageJson()
    await gitCreateEmptyCommit(ctx.git, 'some work')
    const result: any = await ctx.dripip('stable', { error: true })
    expect(result.failures).toMatchInlineSnapshot(`
      Array [
        Object {
          "code": "branch_not_synced_with_remote",
          "details": Object {
            "syncStatus": "diverged",
          },
          "summary": "Your branch must be synced with the remote",
        },
        Object {
          "code": "series_only_has_meaningless_commits",
          "details": Object {},
          "summary": "A stable release must have at least one semantic commit",
        },
      ]
    `)
  })

  it('check that the commit does not already have a stable release present', async () => {
    await ctx.git.raw(['reset', '--hard', 'head~1']) // package.json
    await setupPackageJson()
    await ctx.git.addTag('1.0.0')
    const result: any = await ctx.dripip('stable', { error: true })
    expect(result.failures).toMatchInlineSnapshot(`
      Array [
        Object {
          "code": "commit_already_has_stable_release",
          "details": Object {},
          "summary": "A stable release requires the commit to have no existing stable release",
        },
      ]
    `)
  })
})

describe('increments upon the previous stable release based on conventional commit analysis of commits since latter', () => {
  beforeEach(async () => {
    await ctx.git
      .raw(['push', '-f', 'origin', '--delete', 'foobar'])
      .catch(() => null)
    await ctx.git.checkoutLocalBranch('foobar')
    await ctx.git.raw(['push', '-u', 'origin', 'foobar'])
  })

  afterEach(async () => {
    await ctx.git.raw(['push', '-f', 'origin', '--delete', 'foobar'])
  })

  it('unless all commits in release are chore-like', async () => {
    await ctx.git.addAnnotatedTag('0.1.0', '0.1.0')
    await gitCreateEmptyCommit(ctx.git, 'chore: 1')
    await gitCreateEmptyCommit(ctx.git, 'chore: 2')
    await ctx.git.push()
    const result: any = await ctx.dripip('stable --dry-run --trunk foobar')
    expect(result).toMatchInlineSnapshot(`
Object {
  "data": Object {
    "commits": Array [
      Object {
        "message": Object {
          "parsed": Object {
            "body": null,
            "breakingChange": null,
            "completesInitialDevelopment": false,
            "description": "2",
            "footers": Array [],
            "scope": null,
            "type": "chore",
            "typeKind": "chore",
          },
          "raw": "chore: 2",
        },
        "nonReleaseTags": Array [],
        "releases": Object {
          "preview": null,
          "stable": null,
        },
        "sha": "__dynamic_content__",
      },
      Object {
        "message": Object {
          "parsed": Object {
            "body": null,
            "breakingChange": null,
            "completesInitialDevelopment": false,
            "description": "1",
            "footers": Array [],
            "scope": null,
            "type": "chore",
            "typeKind": "chore",
          },
          "raw": "chore: 1",
        },
        "nonReleaseTags": Array [],
        "releases": Object {
          "preview": null,
          "stable": null,
        },
        "sha": "__dynamic_content__",
      },
    ],
    "release": "no_meaningful_change",
    "report": Object {
      "mustFailures": Array [
        Object {
          "code": "series_only_has_meaningless_commits",
          "details": Object {},
          "summary": "A stable release must have at least one semantic commit",
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
          "code": "branch_not_synced_with_remote",
          "details": Object {},
          "summary": "Your branch must be synced with the remote",
        },
        Object {
          "code": "commit_already_has_stable_release",
          "details": Object {},
          "summary": "A stable release requires the commit to have no existing stable release",
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

  it('fix commits since last release', async () => {
    await ctx.git.addAnnotatedTag('0.1.0', '0.1.0')
    await gitCreateEmptyCommit(ctx.git, 'fix: 1')
    await gitCreateEmptyCommit(ctx.git, 'fix: 2')
    await ctx.git.push()
    const result: any = await ctx.dripip('stable --dry-run --trunk foobar')
    result.data.commits.forEach((c: any) => {
      c.sha = '__sha__'
    })
    expect(result).toMatchInlineSnapshot(`
Object {
  "data": Object {
    "commits": Array [
      Object {
        "message": Object {
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
        "nonReleaseTags": Array [],
        "releases": Object {
          "preview": null,
          "stable": null,
        },
        "sha": "__sha__",
      },
      Object {
        "message": Object {
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
        "nonReleaseTags": Array [],
        "releases": Object {
          "preview": null,
          "stable": null,
        },
        "sha": "__sha__",
      },
    ],
    "release": Object {
      "bumpType": "patch",
      "version": Object {
        "major": 0,
        "minor": 1,
        "patch": 1,
        "version": "0.1.1",
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
          "code": "branch_not_synced_with_remote",
          "details": Object {},
          "summary": "Your branch must be synced with the remote",
        },
        Object {
          "code": "commit_already_has_stable_release",
          "details": Object {},
          "summary": "A stable release requires the commit to have no existing stable release",
        },
        Object {
          "code": "series_only_has_meaningless_commits",
          "details": Object {},
          "summary": "A stable release must have at least one semantic commit",
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

  it('commit mix including chore feat fix', async () => {
    await gitCreateEmptyCommit(ctx.git, 'feat: 1')
    await gitCreateEmptyCommit(ctx.git, 'fix: 1')
    await gitCreateEmptyCommit(ctx.git, 'chore: 1')
    await gitCreateEmptyCommit(ctx.git, 'feat: 2')
    await ctx.git.push()
    const result: any = await ctx.dripip('stable --dry-run --trunk foobar')
    result.data.commits.forEach((c: any) => {
      c.sha = '__sha__'
    })
    expect(result).toMatchInlineSnapshot(`
Object {
  "data": Object {
    "commits": Array [
      Object {
        "message": Object {
          "parsed": Object {
            "body": null,
            "breakingChange": null,
            "completesInitialDevelopment": false,
            "description": "2",
            "footers": Array [],
            "scope": null,
            "type": "feat",
            "typeKind": "feat",
          },
          "raw": "feat: 2",
        },
        "nonReleaseTags": Array [],
        "releases": Object {
          "preview": null,
          "stable": null,
        },
        "sha": "__sha__",
      },
      Object {
        "message": Object {
          "parsed": Object {
            "body": null,
            "breakingChange": null,
            "completesInitialDevelopment": false,
            "description": "1",
            "footers": Array [],
            "scope": null,
            "type": "chore",
            "typeKind": "chore",
          },
          "raw": "chore: 1",
        },
        "nonReleaseTags": Array [],
        "releases": Object {
          "preview": null,
          "stable": null,
        },
        "sha": "__sha__",
      },
      Object {
        "message": Object {
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
        "nonReleaseTags": Array [],
        "releases": Object {
          "preview": null,
          "stable": null,
        },
        "sha": "__sha__",
      },
      Object {
        "message": Object {
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
        "nonReleaseTags": Array [],
        "releases": Object {
          "preview": null,
          "stable": null,
        },
        "sha": "__sha__",
      },
      Object {
        "message": Object {
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
        "nonReleaseTags": Array [],
        "releases": Object {
          "preview": null,
          "stable": null,
        },
        "sha": "__sha__",
      },
      Object {
        "message": Object {
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
        "nonReleaseTags": Array [],
        "releases": Object {
          "preview": null,
          "stable": null,
        },
        "sha": "__sha__",
      },
      Object {
        "message": Object {
          "parsed": null,
          "raw": "Initial commit",
        },
        "nonReleaseTags": Array [],
        "releases": Object {
          "preview": null,
          "stable": null,
        },
        "sha": "__sha__",
      },
    ],
    "release": Object {
      "bumpType": "minor",
      "version": Object {
        "major": 0,
        "minor": 1,
        "patch": 0,
        "version": "0.1.0",
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
          "code": "branch_not_synced_with_remote",
          "details": Object {},
          "summary": "Your branch must be synced with the remote",
        },
        Object {
          "code": "commit_already_has_stable_release",
          "details": Object {},
          "summary": "A stable release requires the commit to have no existing stable release",
        },
        Object {
          "code": "series_only_has_meaningless_commits",
          "details": Object {},
          "summary": "A stable release must have at least one semantic commit",
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
})
