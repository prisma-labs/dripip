import * as TestContext from '../../tests/__lib/test-context'
import { Options, runPreviewRelease } from './preview'

const ctx = TestContext.compose(TestContext.all, (ctx) => {
  return {
    runPullRequestRelease(opts?: Partial<Options>) {
      return runPreviewRelease({
        cwd: ctx.dir,
        json: true,
        dryRun: true,
        progress: false,
        changelog: true,
        ...opts,
      }).then((result) => {
        if (result.data?.changelog) {
          result.data.changelog = result.data.changelog.replace(/- [a-z0-9]{7}/, '__sha__')
        }
        return result
      })
    },
  }
})

beforeEach(async () => {
  ctx.fs.copy(ctx.fixture('git'), ctx.fs.path('.git'))
})

it('if build-num flag passed, the build number is forced to be it', async () => {
  await ctx.commit('fix: foo')
  await ctx.tag('0.1.0')
  await ctx.commit('feat: foo')
  expect(await ctx.runPullRequestRelease({ overrides: { buildNum: 2 } })).toMatchInlineSnapshot(`
    Object {
      "data": Object {
        "changelog": "#### Features

    __sha__ foo
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

describe('preflight checks', () => {
  it('no preview release already present', async () => {
    await ctx.commit('fix: thing')
    await ctx.tag('v1.2.3-next.1')
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
    await ctx.tag('v1.2.3')
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
    await ctx.tag('v1.2.3')
    await ctx.tag('v1.2.3-next.1')
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
  // anyway just to see if this super weird case is ocurring...
  it.todo('fails semantically if trunk and pr detected because that demands conflicting reactions')
})
