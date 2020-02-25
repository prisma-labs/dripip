import { Validator } from './contrext-guard'

export function isTrunk(): Validator {
  return {
    code: 'must_be_on_trunk',
    summary: 'You must be on the trunk branch',
    run(ctx) {
      return ctx.currentBranch.isTrunk
    },
  }
}

export function branchSynced(): Validator {
  return {
    code: 'branch_not_synced_with_remote',
    summary: 'Your branch must be synced with the remote',
    run(ctx) {
      if (ctx.currentBranch.syncStatus === 'synced') {
        return true
      } else {
        return {
          kind: 'fail',
          details: {
            syncStatus: ctx.currentBranch.syncStatus,
          },
        }
      }
    },
  }
}
