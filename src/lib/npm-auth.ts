import * as fs from 'fs-jetpack'
import * as os from 'os'
import * as path from 'path'
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
    fs.write(npmrcFilePath, npmrcFileContent)
  }
}

export function npmAuthFileExists(): boolean {
  return fs.exists(npmrcFilePath) === false
}
