import { stripIndents } from 'common-tags'
import { Commit, shortSha } from '../../../utils/release'
import { Changelog } from '../data'

export function render(log: Changelog): string {
  const order: (keyof Omit<Changelog, 'unspecified'>)[] = [
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
