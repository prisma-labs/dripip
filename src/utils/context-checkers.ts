import { validateNPMAuthSetup } from '../lib/npm-auth'
import { Validator } from './context-guard'

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

export function npmAuthSetup(): Validator {
  return {
    code: 'npm_auth_not_setup',
    summary: 'You must have npm auth setup to publish to the registry',
    run() {
      const result = validateNPMAuthSetup()

      if (result.kind === 'pass') {
        return true
      } else {
        return { kind: 'fail', details: { reasons: result.reasons } }
      }
    },
  }
}
