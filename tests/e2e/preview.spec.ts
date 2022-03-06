import { createPreRelease, renderStyledVersion } from '../../src/lib/semver'
import * as TestContext from '../../tests/__lib/test-context'
import { createDripipRunner } from '../__lib/helpers'

const ctx = TestContext.compose(TestContext.all, (ctx) => {
  return {
    dripip: createDripipRunner(ctx.dir, ctx.pathRelativeToSource),
  }
})

beforeEach(async () => {
  ctx.fs.copy(ctx.fixture(`git`), ctx.fs.path(`.git`))
})

// todo --identifier flag
it.skip(`can publish a preview release`, async () => {
  const id = Date.now()
  const branchName = `e2e-preview-${id}`
  const preReleaseIdentifier = `ep${id}`
  await ctx.branch(branchName)
  await ctx.commit(`feat: past`)
  await ctx.tag(renderStyledVersion(createPreRelease(0, 0, 0, preReleaseIdentifier, 1)))
  await ctx.commit(`feat: foo`)
  await ctx.commit(`fix: bar`)
  await ctx.commit(`chore: qux`)
  const result = ctx.dripip(`preview --json --trunk ${id} --identifier ${preReleaseIdentifier}`)
})
