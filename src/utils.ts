import * as Git from "simple-git/promise"
import * as Semver from "semver"

// const emptyCommit = (git:Git.SimpleGit, options: string[]): Promise<Git.CommitSummary> => {
//   git.commit(["--allow-empty", "--message", "initial commit"])
// }

const getReleaseTagsAtCommit = (ref: string): Promise<Semver.SemVer[]> =>
  Git()
    .tag({ "--points-at": ref })
    .then(result =>
      result
        .trim()
        .split("\n")
        .map(tag => Semver.parse(tag))
        .filter((parsed): parsed is Semver.SemVer => parsed !== null)
    )

const indentBlock4 = (block: string): string => indentBlock(4, block)

const indentBlock = (size: number, block: string): string => {
  return block
    .split("\n")
    .map(
      line =>
        range(size)
          .map(constant(" "))
          .join("") + line
    )
    .join("\n")
}

const constant = <T>(x: T): (() => T) => {
  return function() {
    return x
  }
}

const range = (times: number): number[] => {
  const list: number[] = []
  while (list.length < times) {
    list.push(list.length + 1)
  }
  return list
}

export { getReleaseTagsAtCommit, indentBlock, indentBlock4 }
