import * as nodefs from 'fs'
import * as TestContext from '../../tests/__lib/test-context'
import { Input, runPreviewRelease } from './preview'

const fs = nodefs
const ctx = TestContext.compose(TestContext.all, (ctx) => {
  return {
    runPullRequestRelease(opts?: Partial<Input>) {
      return runPreviewRelease({
        cwd: ctx.dir,
        json: true,
        dryRun: true,
        progress: false,
        changelog: true,
        ...opts,
      })
    },
  }
})

let dir: string

beforeEach(() => {
  dir = ctx.dir
})

beforeEach(async () => {
  ctx.fs.copy(ctx.fixture('git/dripip-system-tests'), ctx.fs.path('.git'))
})

it('if build-num flag passed, the build number is forced to be it', async () => {
  await ctx.commit('fix: foo')
  await ctx.git.tag({ fs, dir, ref: '0.1.0' })
  await ctx.commit('feat: foo')
  expect(await ctx.runPullRequestRelease({ overrides: { buildNum: 2 } })).toMatchInlineSnapshot(`
    Object {
      "data": Object {
        "changelog": "#### Features

    - 2af8451 foo
    ",
        "commits": Array [
          Object {
            "parsed": Object {
              "body": null,
              "breakingChange": null,
              "completesInitialDevelopment": false,
              "description": "foo",
              "footers": Array [],
              "scope": null,
              "type": "feat",
              "typeKind": "feat",
            },
            "raw": "feat: foo",
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
          "errors": Array [],
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
          "stops": Array [],
        },
      },
      "kind": "ok",
      "type": "dry_run",
    }
  `)
})

it('if no stable release exists then pre-releases with just patch-affecting commits begin from stable version 0.0.1', async () => {
  await ctx.commit('fix: 1')
  expect(await ctx.runPullRequestRelease()).toMatchInlineSnapshot(`
    Object {
      "data": Object {
        "changelog": "#### Fixes

    - 4c0b042 1

    #### Chores

    - 2f963d3 who knows

    #### Unspecified Changes

    - ea795ea Initial commit
    ",
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
          "errors": Array [],
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
          "stops": Array [],
        },
      },
      "kind": "ok",
      "type": "dry_run",
    }
  `)
})

it('if no stable release exists then pre-releases with at least one minor-affecting commits begin from stable version 0.1.0', async () => {
  await ctx.commit('feat: 1')
  expect(await ctx.runPullRequestRelease()).toMatchInlineSnapshot(`
    Object {
      "data": Object {
        "changelog": "#### Features

    - 890f219 1

    #### Chores

    - 2f963d3 who knows

    #### Unspecified Changes

    - ea795ea Initial commit
    ",
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
          "errors": Array [],
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
          "stops": Array [],
        },
      },
      "kind": "ok",
      "type": "dry_run",
    }
  `)
})

describe('preflight checks', () => {
  it('must be on trunk', async () => {
    await ctx.git.branch({ fs, dir, checkout: true, ref: 'foo' })
    const result = await ctx.runPullRequestRelease()
    expect(result.data.report).toMatchInlineSnapshot(`
      Object {
        "errors": Array [
          Object {
            "code": "must_be_on_trunk",
            "details": Object {},
            "summary": "You must be on the trunk branch",
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
        "stops": Array [
          Object {
            "code": "series_only_has_meaningless_commits",
            "details": Object {},
            "summary": "A preview release must have at least one semantic commit",
          },
        ],
      }
    `)
  })

  it('no preview release already present', async () => {
    await ctx.commit('fix: thing')
    await ctx.git.tag({ fs, dir, ref: 'v1.2.3-next.1' })
    const result = await ctx.runPullRequestRelease()
    expect(result.data.report).toMatchInlineSnapshot(`
      Object {
        "errors": Array [
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
        ],
        "stops": Array [
          Object {
            "code": "series_only_has_meaningless_commits",
            "details": Object {},
            "summary": "A preview release must have at least one semantic commit",
          },
        ],
      }
    `)
  })

  it('no stable release already present', async () => {
    await ctx.commit('fix: thing')
    await ctx.git.tag({ fs, dir, ref: 'v1.2.3' })
    const result = await ctx.runPullRequestRelease()
    expect(result.data.report).toMatchInlineSnapshot(`
      Object {
        "errors": Array [
          Object {
            "code": "preview_on_commit_with_preview_and_or_stable",
            "details": Object {
              "subCode": "stable",
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
            "code": "series_only_has_meaningless_commits",
            "details": Object {},
            "summary": "A preview release must have at least one semantic commit",
          },
        ],
        "stops": Array [
          Object {
            "code": "series_empty",
            "details": Object {},
            "summary": "A preview release must have at least one commit since the last preview",
          },
        ],
      }
    `)
  })

  it('no stable AND preview release already present (shows graceful aggregate reporting of the cases)', async () => {
    await ctx.git.tag({ fs, dir, ref: 'v1.2.3' })
    await ctx.git.tag({ fs, dir, ref: 'v1.2.3-next.1' })
    const result = await ctx.runPullRequestRelease()
    expect(result.data.report).toMatchInlineSnapshot(`
      Object {
        "errors": Array [
          Object {
            "code": "preview_on_commit_with_preview_and_or_stable",
            "details": Object {
              "subCode": "preview_and_stable",
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
            "code": "series_only_has_meaningless_commits",
            "details": Object {},
            "summary": "A preview release must have at least one semantic commit",
          },
        ],
        "stops": Array [
          Object {
            "code": "series_empty",
            "details": Object {},
            "summary": "A preview release must have at least one commit since the last preview",
          },
        ],
      }
    `)
  })

  // TODO maybe... this is quite the edge-case and would charge all users a
  // latency fee wherein every stable preview release requires a pr check
  // anyways just to see if this super weird case is ocurring...
  it.todo('fails semantically if trunk and pr detected becuase that demands conflicting reactions')
})
