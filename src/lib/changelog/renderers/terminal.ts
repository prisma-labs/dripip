import { Commit, shortSha } from '../../../utils/release'
import { Changelog } from '../data'
import Chalk from 'chalk'

export function render(log: Changelog): string {
  const order: (keyof Omit<Changelog, `unspecified`>)[] = [
    `breaking`,
    `features`,
    `fixes`,
    `improvements`,
    `chores`,
  ]

  const doc = order
    .filter((sectionName) => {
      return log[sectionName].commits.length > 0
    })
    .map((sectionName) => {
      if (sectionName === `breaking`) {
        return (
          sectionTitle(log[sectionName].label) +
          `\n\n` +
          sectionCommits(log[sectionName].commits, { breaking: false }) +
          `\n`
        )
      }

      if (sectionName === `improvements`) {
        return (
          sectionTitle(log[sectionName].label) +
          `\n\n` +
          sectionCommits(log[sectionName].commits, { type: true }) +
          `\n`
        )
      }

      return sectionTitle(log[sectionName].label) + `\n\n` + sectionCommits(log[sectionName].commits) + `\n`
    })

  if (log.unspecified.commits.length) {
    doc.push(
      sectionTitle(log.unspecified.label) +
        `\n\n` +
        `  ` +
        log.unspecified.commits.map((c) => `${Chalk.gray(shortSha(c))} ${c.message.raw}`).join(`\n  `) +
        `\n`
    )
  }

  return doc.join(`\n`)
}

function sectionCommits(cs: Commit[], opts?: CommitRenderOpts): string {
  return cs.map((c) => sectionCommit(c, opts)).join(`\n`)
}

function sectionTitle(title: string): string {
  return Chalk.magenta(title)
}

type CommitRenderOpts = { type?: boolean; breaking?: boolean }

function sectionCommit(c: Commit, opts?: CommitRenderOpts): string {
  const sha = Chalk.gray(shortSha(c))
  const type = opts?.type === true ? ` ` + c.message.parsed!.type + `:` : ``
  const description = ` ` + c.message.parsed!.description
  const breaking =
    opts?.breaking === false ? `` : c.message.parsed!.breakingChange ? Chalk.red(` (breaking)`) : ``
  return `  ${sha}${breaking}${type}${description}`
}
