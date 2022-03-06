import { fs } from './fs'
import { git } from '../../__providers__/git'
import { tmpDir } from './tmp-dir'

interface FixtureContribution {
  /**
   * Get the path to a fixture
   */
  fixture: (name: string) => string
}

export const all = compose(tmpDir, fs, git, fixture)
