import { fs } from './fs'
import { git } from './git'
import { compose } from './test-context'
import { tmpDir } from './tmp-dir'
import * as path from 'path'

interface FixtureContribution {
  /**
   * Get the path to a fixture
   */
  fixture: (name: string) => string
}

export const fixture = (): FixtureContribution => {
  return {
    fixture(fixturePath) {
      return path.join(__dirname, `..`, `..`, `__fixtures`, fixturePath)
    },
  }
}

export const all = compose(tmpDir, fs, git, fixture)

export * from './fs'
export * from './git'
export * from './test-context'
export * from './tmp-dir'
