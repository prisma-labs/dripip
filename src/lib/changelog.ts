/**
 * This module deals with building changelogs from a serieses.
 */
import { stripIndent, stripIndents } from 'common-tags'
import { Commit, Series } from '../utils/release'
import { casesHandled } from './utils'

type ChangeLog = {
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
    commits: string[]
  }
}

function emptyChangelog(): ChangeLog {
  return {
    breaking: { commits: [], label: 'BREAKING CHANGES' },
    features: { commits: [], label: 'Features' },
    chores: { commits: [], label: 'Chores' },
    fixes: { commits: [], label: 'Fixes' },
    improvements: { commits: [], label: 'Improvements' },
    unspecified: { commits: [], label: 'Unspecified Changes' },
  }
}

function organize(series: Series): ChangeLog {
  const log = emptyChangelog()

  for (const c of series.commitsInNextStable) {
    if (c.message.parsed === null) {
      log.unspecified.commits.push(c.message.raw)
    }
    const cp = c.message.parsed
    if (cp.kind === 'feat') {
      log.features.commits.push(c)
    } else if (cp.kind === 'fix') {
      log.fixes.commits.push(c)
    } else if (cp.kind === 'chore') {
      log.chores.commits.push(c)
    } else if (cp.kind === 'other') {
      log.improvements.commits.push(c)
    } else {
      casesHandled(cp.kind)
    }
  }

  return log
}

export function render(
  series: Series,
  opts: { type: 'plain' | 'markdown' }
): string {
  if (opts.type === 'markdown') return renderMarkdown(organize(series))
  if (opts.type === 'plain') return '' // todo
  casesHandled(opts.type)
}

function renderMarkdown(log: ChangeLog): string {
  const order: (keyof Omit<ChangeLog, 'unspecified'>)[] = [
    'breaking',
    'chores',
    'features',
    'fixes',
    'improvements',
  ]

  let doc = order
    .map(sectionName => {
      if (log[sectionName].commits.length === 0) return ''

      return (
        stripIndents`
          #### ${log[sectionName].label}

          ${renderMarkdownCommitSection(log[sectionName].commits)}
        ` + '\n'
      )
    })
    .join('\n')

  if (log.unspecified.commits.length) {
    doc += stripIndent`
      #### ${log.unspecified.label}

      - ${log.unspecified.commits.join('\n- ')}
    `
  }

  return doc
}

function renderMarkdownCommitSection(cs: Commit[]): string {
  return cs
    .map(c => {
      return `- ${c.sha.slice(0, 7)} ${c.message.parsed.description}`
    })
    .join('\n')
}
