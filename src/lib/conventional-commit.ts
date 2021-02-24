import * as Semver from './semver'

/**
 * Given a list of conventional commit messages (subject and body, the entire
 * message for the commit) calculate what the package version containing these
 * changes should be. Returns `null` if all changes were meta or unconforming.
 */
export function calcBumpType(
  isInitialDevelopment: boolean,
  commitMessages: string[]
): null | Semver.MajMinPat {
  let semverPart: null | Semver.MajMinPat = null
  for (const m of commitMessages) {
    const cc = parse(m)

    // Commits that do not conform to conventional commit standard are discarded
    if (!cc) continue

    // Completing initial development is a spec extension
    // https://github.com/conventional-commits/conventionalcommits.org/pull/214
    if (isInitialDevelopment && cc.completesInitialDevelopment) return 'major'

    if (isMetaChange(cc)) {
      // chore type commits are considered to not change the runtime in any way
      continue
    }

    // Nothing can be be higher so we've reached our final value effectively.
    if (cc.breakingChange) {
      // during initial development breaking changes are permitted without
      // having to bump the major.
      semverPart = isInitialDevelopment ? 'minor' : 'major'
      break
    }

    // If already at minor continue, now looking only for major changes
    if (semverPart === 'minor') {
      continue
    }

    if (isMinorChange(cc)) {
      semverPart = 'minor'
      // during initial development breaking changes are permitted without
      // having to bump the major. Therefore, we know we won't get a bumpType
      // higher than this, can short-circuit.
      if (isInitialDevelopment) break
      else continue
    }

    semverPart = 'patch'
  }

  return semverPart
}

function isMinorChange(conventionalCommit: ConventionalCommit): boolean {
  return ['feat', 'feature'].includes(conventionalCommit.type)
}

function isMetaChange(conventionalCommit: ConventionalCommit): boolean {
  return ['chore'].includes(conventionalCommit.type)
}

type Kind = 'feat' | 'fix' | 'chore' | 'other'

export type ConventionalCommit = {
  typeKind: Kind
  type: string
  scope: null | string
  description: string
  body: null | string
  breakingChange: null | string
  footers: { type: string; body: string }[]
  completesInitialDevelopment: boolean
}

const pattern = /^([^:\r\n(!]+)(?:\(([^\r\n()]+)\))?(!)?:\s*([^\r\n]+)[\n\r]*(.*)$/s

export function parse(message: string): null | ConventionalCommit {
  const result = message.match(pattern)
  if (!result) return null
  const [, type, scope, breakingChangeMarker, description, rest] = result

  let completesInitialDevelopment = false
  let breakingChange = breakingChangeMarker === undefined ? null : 'No Explanation'
  let body = null
  let footers: ConventionalCommit['footers'] = []

  if (rest) {
    const rawFooters: string[] = []

    let currFooter = -1
    let currSection = 'body'
    for (const para of rest.split(/(?:\r?\n){2}/)) {
      if (para.match(/^COMPLETES[-\s]INITIAL[-\s]DEVELOPMENT\s*/)) {
        completesInitialDevelopment = true
      } else if (para.match(/^\s*BREAKING[-\s]CHANGE\s*:\s*.*/)) {
        currSection = 'breaking_change'
        breakingChange = (breakingChange ?? '') + '\n\n' + para.replace(/^BREAKING[-\s]CHANGE\s*:/, '')
      } else if (para.match(/^\s*[\w-]+\s*:.*/)) {
        currSection = 'footers'
        rawFooters.push(para)
        currFooter++
      } else if (currSection === 'body') {
        body = (body ?? '') + '\n\n' + para
      } else if (currSection === 'breaking_change') {
        breakingChange = (breakingChange ?? '') + '\n\n' + para
      } else {
        rawFooters[currFooter] += '\n\n' + para
      }
    }

    footers = rawFooters.map((f) => {
      const [, type, body] = f.trim().split(/^\s*([\w-]+)\s*:/)
      return {
        type: type.trim(),
        body: body.trim(),
      }
    })
  }

  const typeTrimmed = type.trim()

  return {
    typeKind: getKind(typeTrimmed),
    type: typeTrimmed,
    scope: scope?.trim() ?? null,
    description: description.trim(),
    body: body?.trim() ?? null,
    footers: footers ?? [],
    breakingChange: breakingChange?.trim() ?? null,
    completesInitialDevelopment,
  }
}

function getKind(s: string): Kind {
  if (s === 'feat') return 'feat'
  if (s === 'fix') return 'fix'
  if (s === 'chore') return 'chore'
  return 'other'
}
