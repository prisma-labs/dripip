import { spawnSync } from 'child_process'
import { rootDebug } from '../lib/debug'
import { numericAscending } from '../lib/utils'

const debug = rootDebug(__filename)

/**
 * Get the pr release version for the given commit. A search is made through the
 * package's versions for this pr/commit combination. Returns `null` if no
 * release version can be found.
 */
export function getPullRequestReleaseVersionForLocation(input: {
  packageName: string
  prNum: number
  sha: string
}): null | string {
  const shortSHA = input.sha.slice(0, 7)
  const versions = getPackageVersions(input.packageName)
  const pattern = new RegExp(`0\\.0\\.0-pr\\.${input.prNum}\\.\\d+\\.${shortSHA}`)
  debug('looking for version matching pattern %O', pattern)
  const version = versions.find((v) => v.match(pattern) !== null) ?? null
  return version
}

/**
 * Get the next build num for a pre-release series.
 *
 * The pre-release series is the group versions published matching the given prefix.
 *
 * The build num is assumed to be digits immediately following the prefix up to
 * the end of the version or up to the next `.`.
 *
 * If a version matches prefix but then not the pattern described above then it
 * is discarded.
 *
 * If no versions are found with given prefix then 1 is returned.
 *
 * If versions are found, then the greatest build number is incremented by 1 and
 * then returned.
 */
export function getNextPreReleaseBuildNum(packageName: string, prefix: string): number {
  const versions = getPackageVersions(packageName)
  const nextBuildNum = getNextPreReleaseBuildNumFromVersions(prefix, versions)
  return nextBuildNum
}

/**
 * Pure helper for getting next build num of a pre-release series.
 */
function getNextPreReleaseBuildNumFromVersions(prefix: string, versions: string[]): number {
  const filteredSorted = versions
    .filter((v) => v.startsWith(prefix))
    .map((v) => {
      const match = v.slice(prefix.length).match(/^(\d+)$|^(\d+)\./)
      if (match === null) return null
      if (match[1] !== undefined) return match[1]
      if (match[2] !== undefined) return match[2]
      // never
    })
    .filter((v) => v !== null)
    .map((v) => Number(v))
    .sort(numericAscending)

  if (filteredSorted.length === 0) return 1
  return filteredSorted.pop()! + 1
}

// // todo put into unit test
// const vs = [
//   '0.0.0-pr.30.1.1079baa',
//   '0.0.0-pr.30.2.1c2e772',
//   '0.0.0-pr.30.5.3a9ec9f',
//   '0.0.0-pr.30.3.6f29f57',
//   '0.0.0-pr.30.46.ee27408',
//   '0.2.0',
//   '0.2.7',
//   '0.2.8-next.1',
//   '0.2.8',
//   '0.2.9-next.2',
//   '0.2.9',
//   '0.3.0',
//   '0.3.1',
//   '0.3.2',
//   '0.4.0',
//   '0.5.0',
//   '0.6.0-next.1',
//   '0.6.0-next.2',
//   '0.6.0',
//   '0.6.1-next.1',
//   '0.6.1-next.2',
//   '0.6.1',
// ]

// // getNextPreReleaseBuildNumFromVersions('0.0.0-pr.30.', vs) //?

// '1.1079baa'.match(/^(\d+)$|^(\d+)\./) //?
// '1079'.match(/^(\d+)$|^(\d+)\./) //?
// '1079baa'.match(/^(\d+)$|^(\d+)\./) //?

/**
 * Get all versions ever released for the given package, including pre-releases.
 */
function getPackageVersions(packageName: string): string[] {
  // todo do http request instead of cli spawn for perf
  const result = spawnSync('npm', ['show', packageName, 'versions', '--json'])
  if (result.error) throw result.error
  return JSON.parse(result.stdout)
}
