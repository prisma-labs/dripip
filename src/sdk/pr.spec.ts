import { fixture } from '../../tests/__providers__/fixture'
import { git } from '../../tests/__providers__/git'
import { runPullRequestRelease } from './pr'
import { konn, providers } from 'konn'

const ctx = konn()
  .useBeforeAll(providers.dir())
  .useBeforeAll(git())
  .beforeAll((ctx) => {
    return {
      runPullRequestRelease: () => {
        return runPullRequestRelease({
          cwd: ctx.fs.cwd(),
          json: true,
          dryRun: true,
          progress: false,
          readFromCIEnvironment: false,
        })
      },
    }
  })
  .useBeforeEach(fixture({ use: `git-repo-dripip-system-tests`, into: `.git` }))
  .done()

it(`preflight check that user is on branch with open pr`, async () => {
  await ctx.git.checkout({ ref: `no-open-pr` })
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

it(`makes a release for the current commit, updating pr dist tag, and version format`, async () => {
  await ctx.git.checkout({ ref: `open-pr` })
  const msg = await ctx.runPullRequestRelease()
  expect(msg).toMatchInlineSnapshot(`
    Object {
      "data": Object {
        "publishPlan": Object {
          "options": Object {
            "gitTag": "none",
          },
          "release": Object {
            "distTag": "pr.162",
            "version": "0.0.0-pr.162.1.1deb48e",
          },
        },
        "report": Object {
          "errors": Array [],
          "passes": Array [
            Object {
              "code": "npm_auth_not_setup",
              "details": Object {},
              "summary": "You must have npm auth setup to publish to the registry",
            },
            Object {
              "code": "pr_release_without_open_pr",
              "details": Object {},
              "summary": "Pull-Request releases are only supported on branches with _open_ pull-requests",
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
