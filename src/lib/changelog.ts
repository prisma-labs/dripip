/**
 * This module deals with building changelogs from serieses.
 */
import Chalk from 'chalk'
import { stripIndents } from 'common-tags'
import { Commit, Series, shortSha } from '../utils/release'
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
    commits: Commit[]
  }
}

export function empty(): ChangeLog {
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
  const log = empty()

  for (const c of series.commitsInNextStable) {
    if (c.message.parsed === null) {
      log.unspecified.commits.push(c)
      continue
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

export function renderChangelog(series: Series, opts: { as: 'plain' | 'markdown' }): string {
  if (opts.as === 'markdown') return Markdown.render(organize(series))
  if (opts.as === 'plain') return Plain.render(organize(series))
  casesHandled(opts.as)
}

namespace Plain {
  export function render(log: ChangeLog): string {
    const order: (keyof Omit<ChangeLog, 'unspecified'>)[] = [
      'breaking',
      'features',
      'fixes',
      'improvements',
      'chores',
    ]

    const doc = order
      .filter((sectionName) => {
        return log[sectionName].commits.length > 0
      })
      .map((sectionName) => {
        if (sectionName === 'breaking') {
          return (
            sectionTitle(log[sectionName].label) +
            '\n\n' +
            sectionCommits(log[sectionName].commits, { breaking: false }) +
            '\n'
          )
        }

        if (sectionName === 'improvements') {
          return (
            sectionTitle(log[sectionName].label) +
            '\n\n' +
            sectionCommits(log[sectionName].commits, { type: true }) +
            '\n'
          )
        }

        return sectionTitle(log[sectionName].label) + '\n\n' + sectionCommits(log[sectionName].commits) + '\n'
      })

    if (log.unspecified.commits.length) {
      doc.push(
        sectionTitle(log.unspecified.label) +
          '\n\n' +
          '  ' +
          log.unspecified.commits.map((c) => `${Chalk.gray(shortSha(c))} ${c.message.raw}`).join('\n  ') +
          '\n'
      )
    }

    return doc.join('\n')
  }

  function sectionCommits(cs: Commit[], opts?: CommitRenderOpts): string {
    return cs.map((c) => sectionCommit(c, opts)).join('\n')
  }

  function sectionTitle(title: string): string {
    return Chalk.magenta(title)
  }

  type CommitRenderOpts = { type?: boolean; breaking?: boolean }

  function sectionCommit(c: Commit, opts?: CommitRenderOpts): string {
    const sha = Chalk.gray(shortSha(c))
    const type = opts?.type === true ? ' ' + c.message.parsed!.type + ':' : ''
    const description = ' ' + c.message.parsed!.description
    const breaking =
      opts?.breaking === false ? '' : c.message.parsed!.breakingChange ? Chalk.red(' (breaking)') : ''
    return `  ${sha}${breaking}${type}${description}`
  }
}

namespace Markdown {
  export function render(log: ChangeLog): string {
    const order: (keyof Omit<ChangeLog, 'unspecified'>)[] = [
      'breaking',
      'features',
      'fixes',
      'improvements',
      'chores',
    ]

    const doc = order
      .filter((sectionName) => {
        return log[sectionName].commits.length > 0
      })
      .map((sectionName) => {
        if (sectionName === 'breaking') {
          return (
            stripIndents`
            ${sectionTitle(log[sectionName].label)}
  
            ${log[sectionName].commits.map((c) => sectionCommit(c, { breaking: false })).join('\n')}
          ` + '\n'
          )
        }

        if (sectionName === 'improvements') {
          return (
            stripIndents`
            ${sectionTitle(log[sectionName].label)}
  
            ${log[sectionName].commits.map((c) => sectionCommit(c, { type: true })).join('\n')}
          ` + '\n'
          )
        }

        return (
          stripIndents`
          ${sectionTitle(log[sectionName].label)}

          ${sectionCommits(log[sectionName].commits)}
        ` + '\n'
        )
      })

    if (log.unspecified.commits.length) {
      doc.push(
        stripIndents`
        ${sectionTitle(log.unspecified.label)}

        - ${log.unspecified.commits.map((c) => `${shortSha(c)} ${c.message.raw}`).join('\n- ')}
      ` + '\n'
      )
    }

    return doc.join('\n')
  }
  function sectionCommits(cs: Commit[]): string {
    return cs.map((c) => sectionCommit(c)).join('\n')
  }

  function sectionTitle(title: string): string {
    return `#### ${title}`
  }

  function sectionCommit(c: Commit, opts?: { type?: boolean; breaking?: boolean }): string {
    const sha = shortSha(c)
    const type = opts?.type === true ? ' ' + c.message.parsed!.type + ':' : ''
    const description = ' ' + c.message.parsed!.description
    const breaking = opts?.breaking === false ? '' : c.message.parsed!.breakingChange ? ' (breaking)' : ''
    return `- ${sha}${breaking}${type}${description}`
  }
}
