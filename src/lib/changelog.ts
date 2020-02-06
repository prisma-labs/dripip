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

    // breaking changes are collected as a group in addition to by type.
    if (cp.breakingChange) {
      log.breaking.commits.push(c)
    }

    if (cp.typeKind === 'feat') {
      log.features.commits.push(c)
    } else if (cp.typeKind === 'fix') {
      log.fixes.commits.push(c)
    } else if (cp.typeKind === 'chore') {
      log.chores.commits.push(c)
    } else if (cp.typeKind === 'other') {
      log.improvements.commits.push(c)
    } else {
      casesHandled(cp.typeKind)
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
    'features',
    'fixes',
    'improvements',
    'chores',
  ]

  let doc = order
    .map(sectionName => {
      if (log[sectionName].commits.length === 0) return ''

      if (sectionName === 'breaking') {
        return (
          stripIndents`
            ${renderMarkdownSectionTitle(log[sectionName].label)}
  
            ${log[sectionName].commits
              .map(c => renderMarkdownSectionCommit(c, { breaking: false }))
              .join('\n')}
          ` + '\n'
        )
      }

      if (sectionName === 'improvements') {
        return (
          stripIndents`
            ${renderMarkdownSectionTitle(log[sectionName].label)}
  
            ${log[sectionName].commits
              .map(c => renderMarkdownSectionCommit(c, { type: true }))
              .join('\n')}
          ` + '\n'
        )
      }

      return (
        stripIndents`
          ${renderMarkdownSectionTitle(log[sectionName].label)}

          ${renderMarkdownSectionCommits(log[sectionName].commits)}
        ` + '\n'
      )
    })
    .join('\n')

  if (log.unspecified.commits.length) {
    doc += stripIndent`
      ${renderMarkdownSectionTitle(log.unspecified.label)}

      - ${log.unspecified.commits.join('\n- ')}
    `
  }

  return doc
}

function renderMarkdownSectionCommits(cs: Commit[]): string {
  return cs.map(c => renderMarkdownSectionCommit(c)).join('\n')
}

function renderMarkdownSectionTitle(title: string): string {
  return `#### ${title}`
}

function renderMarkdownSectionCommit(
  c: Commit,
  opts?: { type?: boolean; breaking?: boolean }
): string {
  const sha = c.sha.slice(0, 7)
  const type = opts?.type === true ? ' ' + c.message.parsed.type + ':' : ''
  const description = ' ' + c.message.parsed.description
  const breaking =
    opts?.breaking === false
      ? ''
      : c.message.parsed.breakingChange
      ? ' (breaking)'
      : ''
  return `- ${sha}${breaking}${type}${description}`
}
