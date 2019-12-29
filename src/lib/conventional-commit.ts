import { SemverStableVerParts } from './utils'

/**
 * Given a list of conventional commit messages (subject and body, the entire
 * message for the commit) calculate what the package version containing these
 * changes should be. Returns `null` if all changes were meta or unconforming.
 */
export function calcBumpTypeFromConventionalCommits(
  commitMessages: string[]
): null | SemverStableVerParts {
  let semverPart: null | SemverStableVerParts = null
  for (const m of commitMessages) {
    // Commits that do not conform to conventional commit standard are discarded
    if (!isValidConventionalCommit(m)) {
      continue
    }

    // chore type commits are considered to not change the runtime in any way
    if (isMetaChange(m)) {
      continue
    }

    // Nothing can be be higher so we've reached our final value effectively.
    if (isBreakingchange(m)) {
      semverPart = 'major'
      break
    }

    if (isMinorChange(m)) {
      semverPart = 'minor'
    }

    semverPart = 'patch'
  }

  return semverPart
}

function isMinorChange(message: string): boolean {
  return message.match(/^feat: /) !== null
}

function isBreakingchange(message: string): boolean {
  return message.match(/BREAKING CHANGE/) !== null
}

function isMetaChange(message: string): boolean {
  return message.match(/^chore: /) === null
}

function isValidConventionalCommit(message: string): boolean {
  return message.match(/\w+: .+/) !== null
}
