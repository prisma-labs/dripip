import * as fs from 'fs-jetpack'
import * as os from 'os'
import * as path from 'path'
import { debug } from './debug'
import { isGithubCIEnvironment } from './github-ci-environment'

const npmrcFilePath = path.join(os.homedir(), '.npmrc')

/**
 * If in a CI environment and and there is an NPM_TOKEN environment variable
 * then this function will setup an auth  file that permits subsequent package
 * publishing commands.
 */
export function setupNPMAuthfileOnCI(): void {
  if (isGithubCIEnvironment() && process.env.NPM_TOKEN) {
    const authContent = `//registry.npmjs.org/:_authToken=${process.env.NPM_TOKEN}`
    debug('writing or appending npm token to %s', npmrcFilePath)
    fs.append(npmrcFilePath, authContent)
  }
}
