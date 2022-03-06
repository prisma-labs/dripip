import { Commit, shortSha } from '../../../utils/release'
import { Changelog } from '../data'
import * as Chaindown from 'chaindown'

export function render(log: Changelog): string {
  const order: (keyof Omit<Changelog, `unspecified`>)[] = [
    `breaking`,
    `features`,
    `fixes`,
    `improvements`,
    `chores`,
  ]

  const doc = Chaindown.create()

  order
    .filter((sectionName) => {
      return log[sectionName].commits.length > 0
    })
    .forEach((sectionName) => {
      if (sectionName === `breaking`) {
        doc
          .heading(4, log[sectionName].label)
          .list(log[sectionName].commits.map((c) => sectionCommit(c, { breaking: false })))
        return
      }

      if (sectionName === `improvements`) {
        doc
          .heading(4, log[sectionName].label)
          .list(log[sectionName].commits.map((c) => sectionCommit(c, { type: true })))
        return
      }

      doc.heading(4, log[sectionName].label).list(log[sectionName].commits.map((c) => sectionCommit(c)))
    })

  if (log.unspecified.commits.length) {
    doc
      .heading(4, log.unspecified.label)
      .list(log.unspecified.commits.map((c) => `${shortSha(c)} ${c.message.raw}`))
  }

  return doc.render({ level: 5 })
}

function sectionCommit(c: Commit, opts?: { type?: boolean; breaking?: boolean }): string {
  const sha = shortSha(c)
  const type = opts?.type === true ? ` ` + c.message.parsed!.type + `:` : ``
  const description = ` ` + c.message.parsed!.description
  const breaking = opts?.breaking === false ? `` : c.message.parsed!.breakingChange ? ` (breaking)` : ``
  return `${sha}${breaking}${type}${description}`
}
