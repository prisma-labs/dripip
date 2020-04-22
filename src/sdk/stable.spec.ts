// TODO test that context honours the base branch setting of the repo

// async function setupPackageJson() {
//   await ctx.fs.writeAsync('package.json', {
//     name: 'foo',
//     version: '0.0.0-ignoreme',
//   })
// }

import * as nodefs from 'fs'
import * as TestContext from '../../tests/__lib/test-context'
import { Options, runStableRelease } from './stable'

const fs = nodefs
const ctx = TestContext.compose(TestContext.all, (ctx) => {
  return {
    runStableRelease(opts?: Partial<Options>) {
      return runStableRelease({
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
  ctx.fs.copy(ctx.fixture('git'), ctx.fs.path('.git'))
})

describe('preflight requirements include that', () => {
  it('the branch is trunk', async () => {
    await ctx.git.branch({ fs, dir, checkout: true, ref: 'foo' })
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
  it('the branch is synced with remote (needs push)', async () => {
    await ctx.commit('some work')
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

  it('the branch is synced with remote (needs pull)', async () => {
    await ctx.hardReset({ dir, ref: 'head~1', branch: 'master' })
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

  it('the branch is synced with remote (diverged)', async () => {
    await ctx.hardReset({ dir, ref: 'head~1', branch: 'master' })
    await ctx.commit('foo')
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

  it('check that the commit does not already have a stable release present', async () => {
    await ctx.git.tag({ fs, dir, ref: '1.0.0' })
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
