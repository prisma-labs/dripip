import * as nodefs from 'fs'
import * as TestContext from '../../tests/__lib/test-context'
import { runPullRequestRelease } from './pr'

const fs = nodefs
const ctx = TestContext.compose(TestContext.all, (ctx) => {
  return {
    runPullRequestRelease() {
      return runPullRequestRelease({
        cwd: ctx.dir,
        json: true,
        dryRun: true,
        progress: false,
        readFromCIEnvironment: false,
      })
    },
  }
})

beforeEach(async () => {
  ctx.fs.copy(ctx.fixture('git'), ctx.fs.path('.git'))
})

it('preflight check that user is on branch with open pr', async () => {
  await ctx.git.checkout({ fs, dir: ctx.dir, ref: 'no-open-pr' })
  const msg = await ctx.runPullRequestRelease()
  expect(msg).toMatchInlineSnapshot(`
    Object {
      "data": Object {
        "release": null,
        "report": Object {
          "errors": Array [
            Object {
              "code": "pr_release_without_open_pr",
              "details": Object {},
              "summary": "Pull-Request releases are only supported on branches with _open_ pull-requests",
            },
          ],
          "passes": Array [
            Object {
              "code": "npm_auth_not_setup",
              "details": Object {},
              "summary": "You must have npm auth setup to publish to the registry",
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

it('makes a release for the current commit, updating pr dist tag, and version format', async () => {
  await ctx.git.checkout({ fs, dir: ctx.dir, ref: 'open-pr' })
  const msg = await ctx.runPullRequestRelease()
  expect(msg).toMatchInlineSnapshot(`
    Object {
      "data": Object {
        "release": null,
        "report": Object {
          "errors": Array [
            Object {
              "code": "pr_release_without_open_pr",
              "details": Object {},
              "summary": "Pull-Request releases are only supported on branches with _open_ pull-requests",
            },
          ],
          "passes": Array [
            Object {
              "code": "npm_auth_not_setup",
              "details": Object {},
              "summary": "You must have npm auth setup to publish to the registry",
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
