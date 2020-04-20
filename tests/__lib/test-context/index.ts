import * as path from 'path'

export * from './fs'
export * from './git'
export * from './test-context'
export * from './tmp-dir'

interface FixtureContribution {
  /**
   * Get the path to a fixture
   */
  fixture: (name: string) => string
}

export const fixture = (): FixtureContribution => {
  return {
    fixture(fixturePath) {
      return path.join(__dirname, '..', '..', '__fixtures', fixturePath)
    },
  }
}
