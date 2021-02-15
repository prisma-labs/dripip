/**
 * This module deals with building changelogs from multiple series.
 */
import { Commit } from '../../utils/release'

export type Changelog = {
  /**
   * Any commit marked as breaking.
   */
  breaking: {
    label: string
    commits: Commit[]
  }
  /**
   * Feat type commits.
   */
  features: {
    label: string
    commits: Commit[]
  }
  /**
   * Fix type commits.
   */
  fixes: {
    label: string
    commits: Commit[]
  }
  /**
   * Any type other than feat fix and chore.
   */
  improvements: {
    label: string
    commits: Commit[]
  }
  /**
   * Commits that are intended to be ignored.
   */
  chores: {
    label: string
    commits: Commit[]
  }
  /**
   * Commit mistakes, non-conforming tools, who knows. Shouldn't happen but can.
   */
  unspecified: {
    label: string
    commits: Commit[]
  }
}

/**
 * Crate an empty changelog.
 */
export function empty(): Changelog {
  return {
    breaking: { commits: [], label: 'BREAKING CHANGES' },
    features: { commits: [], label: 'Features' },
    chores: { commits: [], label: 'Chores' },
    fixes: { commits: [], label: 'Fixes' },
    improvements: { commits: [], label: 'Improvements' },
    unspecified: { commits: [], label: 'Unspecified Changes' },
  }
}
