import { Series } from '../../utils/release'
import { casesHandled } from '../utils'
import { Changelog, empty } from './data'
import { Markdown, Terminal } from './renderers'

export function renderFromSeries(series: Series, options: RenderOptions): string {
  return render(fromSeries(series), options)
}

export type RenderOptions = {
  as: 'plain' | 'markdown'
}

/**
 * Render a changelog into a string using the chosen renderer (Markdown, Terminal, etc.).
 */
export function render(changelog: Changelog, opts: RenderOptions): string {
  if (opts.as === 'markdown') return Markdown.render(changelog)
  if (opts.as === 'plain') return Terminal.render(changelog)
  casesHandled(opts.as)
}

/**
 * Transform a series into a changelog.
 */
export function fromSeries(series: Series): Changelog {
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
