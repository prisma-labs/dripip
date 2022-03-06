import * as nodeFs from 'fs'
import isomorphicGit from 'isomorphic-git'
import { provider } from 'konn'
import { Providers } from 'konn/providers'

type Needs = Providers.Dir.Contributes

export const git = () =>
  provider<Needs>()
    .name(`git`)
    .before((ctx) => {
      const fs = nodeFs
      const dir = ctx.fs.cwd()
      const git = isomorphicGit

      return {
        git: {
          isomorphic: git,
          checkout: (params: { ref: string }) => {
            return git.checkout({ fs, dir, ...params })
          },
          commit: (message: string) => {
            return git.commit({ fs, dir, message, author: { name: `labs` } })
          },
          tag: (ref: string) => {
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
          branch: (ref: string) => {
            return git.branch({ fs, dir, checkout: true, ref })
          },
          // https://github.com/isomorphic-git/isomorphic-git/issues/129#issuecomment-390884874
          hardReset: async ({ dir, ref, branch }: { dir: string; ref: string; branch: string }) => {
            const re = /^HEAD~([0-9]+)$/i
            const m = ref.match(re)
            if (m) {
              // guaranteed by regex match
              // eslint-disable-next-line
              const count = +m[1]!
              const commits = await git.log({ fs, dir, depth: count + 1 })
              const lastCommit = commits.pop()
              if (!lastCommit) throw new Error(`No commits were found.`)
              return new Promise((resolve, reject) => {
                fs.writeFile(dir + `/.git/refs/heads/${branch}`, lastCommit.oid, (err) => {
                  if (err) {
                    return reject(err)
                  }
                  // clear the index (if any)
                  fs.unlink(dir + `/.git/index`, (err) => {
                    if (err) {
                      return reject(err)
                    }
                    // checkout the branch into the working tree
                    git.checkout({ dir, fs, ref: branch }).then(resolve).catch(reject)
                  })
                })
              })
            }
            return Promise.reject(`Wrong ref ${ref}`)
          },
        },
      }
    })
    .done()
