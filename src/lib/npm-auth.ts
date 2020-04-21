import * as fs from 'fs-jetpack'
import * as os from 'os'
import * as path from 'path'
import { rootDebug } from './debug'
import { isGithubCIEnvironment } from './github-ci-environment'

const debug = rootDebug(__filename)

const TOKEN_ENV_VAR_NAME = 'NPM_TOKEN'
const npmrcFilePath = path.join(os.homedir(), '.npmrc')

/**
 * If in a CI environment and there is an NPM_TOKEN environment variable
 * then this function will setup an auth file that permits subsequent package
 * publishing commands.
 */
export function setupNPMAuthfileOnCI(): void {
  if (isGithubCIEnvironment() && process.env.NPM_TOKEN) {
    const authContent = `//registry.npmjs.org/:_authToken=${process.env[TOKEN_ENV_VAR_NAME]}`
    debug('writing or appending npm token to %s', npmrcFilePath)
    fs.append(npmrcFilePath, authContent)
  }
}

/**
 * Read the npmrc file or return null if not found.
 */
function getNpmrcFile(): null | string {
  return fs.read(npmrcFilePath) ?? null
}

type PassReason = 'npmrc_auth' | 'npm_token_env_var'

interface SetupPass {
  kind: 'pass'
  reason: PassReason
}

type FailReason = 'no_npmrc' | 'npmrc_missing_auth' | 'env_var_empty' | 'no_env_var'

interface SetupFail {
  kind: 'fail'
  reasons: FailReason[]
}

/**
 * Find out whether NPM auth is setup or not. Setup means dripip upon publishing
 * will have credentials in place to work with the registry. Being setup is
 * satisfied by any of:
 *
 * - A non-empty NPM_TOKEN environment variable set
 * - An npmrc file containing auth
 */
export function validateNPMAuthSetup(): SetupPass | SetupFail {
  const token = process.env[TOKEN_ENV_VAR_NAME] ?? null

  if (token) {
    return { kind: 'pass', reason: 'npm_token_env_var' }
  }

  const npmrc = getNpmrcFile()
  if (npmrc && npmrc.match(/_authToken=.+/)) {
    return { kind: 'pass', reason: 'npmrc_auth' }
  }

  const fail: SetupFail = { kind: 'fail', reasons: [] }

  if (npmrc === null) {
    fail.reasons.push('no_npmrc')
  } else {
    fail.reasons.push('npmrc_missing_auth')
  }

  if (token === null) {
    fail.reasons.push('no_env_var')
  } else {
    fail.reasons.push('env_var_empty')
  }

  return fail
}
