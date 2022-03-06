import { TmpDirContribution } from './tmp-dir'
import * as nodefs from 'fs'
import isogit from 'isomorphic-git'

const fs = nodefs

export const git = (ctx: TmpDirContribution) => {
  const dir = ctx.dir
  const git = isogit

  return {
    git: isogit,
    commit(message: string) {
      return git.commit({ fs, dir, message, author: { name: `labs` } })
    },
    async tag(ref: string) {
      return git.annotatedTag({
        fs,
        dir,
        ref,
        message: ref,
        tagger: {
          name: `labs`,
        },
      })
    },
    branch(ref: string) {
      return git.branch({ fs, dir, checkout: true, ref })
    },
    // https://github.com/isomorphic-git/isomorphic-git/issues/129#issuecomment-390884874
    async hardReset({ dir, ref, branch }: { dir: string; ref: string; branch: string }) {
      const re = /^HEAD~([0-9]+)$/i
      const m = ref.match(re)
      if (m) {
        const count = +m[1]
        const commits = await git.log({ fs, dir, depth: count + 1 })
        const commit = commits.pop()!.oid
        return new Promise((resolve, reject) => {
          fs.writeFile(dir + `/.git/refs/heads/${branch}`, commit, (err) => {
            if (err) {
              return reject(err)
            }
            // clear the index (if any)
            fs.unlink(dir + `/.git/index`, (err) => {
              if (err) {
                return reject(err)
              }
              // checkout the branch into the working tree
              git.checkout({ dir, fs, ref: branch }).then(resolve)
            })
          })
        })
      }
      return Promise.reject(`Wrong ref ${ref}`)
    },
  }
}
