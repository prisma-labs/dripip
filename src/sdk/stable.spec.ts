// TODO test that context honors the base branch setting of the repo

// async function setupPackageJson() {
//   await ctx.fs.writeAsync('package.json', {
//     name: 'foo',
//     version: '0.0.0-ignoreme',
//   })
// }

import { fixture } from '../../tests/__providers__/fixture'
import { git } from '../../tests/__providers__/git'
import { Options, runStableRelease } from './stable'
import { konn, providers } from 'konn'

const ctx = konn()
  .useBeforeAll(providers.dir())
  .useBeforeAll(git())
  .beforeAll((ctx) => {
    return {
      runStableRelease: (opts?: Partial<Options>) => {
        return runStableRelease({
          cwd: ctx.fs.cwd(),
          json: true,
          dryRun: true,
          progress: false,
          changelog: true,
          ...opts,
        })
      },
    }
  })
  .useBeforeEach(fixture({ use: `git-repo-dripip-system-tests`, into: `.git` }))
  .done()

describe(`preflight requirements include that`, () => {
  it(`the branch is trunk`, async () => {
    await ctx.git.commit(`feat: foo`)
    await ctx.git.branch({ ref: `foo` })
    const result = await ctx.runStableRelease()
    // todo doesn't make sense to show both of these errors at once,
    // only check for sync once on-trunk established
    expect(result.data.report.errors).toMatchInlineSnapshot(`
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
      ]
    `)
  })

  // TODO need a flag like --queued-releases which permits releasing on
  // potentially not the latest commit of trunk. Think of a CI situation with
  // race-condition PR merges.
  it(`the branch is synced with remote (needs push)`, async () => {
    await ctx.git.commit(`some work`)
    const result = await ctx.runStableRelease()
    expect(result.data.report.errors).toMatchInlineSnapshot(`
      Array [
        Object {
          "code": "branch_not_synced_with_remote",
          "details": Object {
            "syncStatus": "not_synced",
          },
          "summary": "Your branch must be synced with the remote",
        },
      ]
    `)
  })

  it(`the branch is synced with remote (needs pull)`, async () => {
    await ctx.git.hardReset({ ref: `head~1`, branch: `main` })
    const result = await ctx.runStableRelease()
    expect(result.data.report.errors).toMatchInlineSnapshot(`
      Array [
        Object {
          "code": "branch_not_synced_with_remote",
          "details": Object {
            "syncStatus": "not_synced",
          },
          "summary": "Your branch must be synced with the remote",
        },
      ]
    `)
  })

  it(`the branch is synced with remote (diverged)`, async () => {
    await ctx.git.hardReset({ ref: `head~1`, branch: `main` })
    await ctx.git.commit(`foo`)
    const result = await ctx.runStableRelease()
    expect(result.data.report.errors).toMatchInlineSnapshot(`
      Array [
        Object {
          "code": "branch_not_synced_with_remote",
          "details": Object {
            "syncStatus": "not_synced",
          },
          "summary": "Your branch must be synced with the remote",
        },
      ]
    `)
  })

  it(`check that the commit does not already have a stable release present`, async () => {
    await ctx.git.commit(`fix: 1`)
    await ctx.git.tag(`1.0.0`)
    const result = await ctx.runStableRelease()
    expect(result.data.report.stops).toMatchInlineSnapshot(`
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
