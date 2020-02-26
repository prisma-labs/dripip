import * as fs from 'fs-jetpack'
import * as os from 'os'
import * as path from 'path'
import { debug } from './debug'
import { isGithubCIEnvironment } from './github-ci-environment'

const npmrcFilePath = path.join(os.homedir(), '.npmrc')

/**
 * If in a CI environment and there is no existing npmrc file present and there
 * is an NPM_TOKEN environment variable then this function will setup an auth
 * file that permits subsequent package publishing commands.
 */
export function setupNPMAuthfileOnCI(): void {
  if (isGithubCIEnvironment() && !npmAuthFileExists()) {
    const token = process.env.NPM_TOKEN
    const npmrcFileContent = `//registry.npmjs.org/:_authToken=${token}`
    debug('writing npm token to %s', npmrcFilePath)
    fs.write(npmrcFilePath, npmrcFileContent)
  }
}

export function npmAuthFileExists(): boolean {
  const is = fs.exists(npmrcFilePath) === false
  debug('npm file exists? %s', is)
  return is
}