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
          log: () => {
            return git.log({ fs, dir })
          },
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
          branch: (params: { ref: string }) => {
            return git.branch({ fs, dir, checkout: true, ...params })
          },
          // https://github.com/isomorphic-git/isomorphic-git/issues/129#issuecomment-390884874
          hardReset: async (params: { ref: string; branch: string }) => {
            const { ref, branch } = params
            const re = /head~[0-9]+/
            const m = ref.match(re)
            if (!m) throw new Error(`Wrong ref ${ref}`)
            // guaranteed by regex match
            // eslint-disable-next-line
            const count = +m[1]!
            const commits = await git.log({ fs, dir, depth: count + 1 })
            const lastCommit = commits.pop()
            if (!lastCommit) throw new Error(`No commits were found.`)
            ctx.fs.write(dir + `/.git/refs/heads/${branch}`, lastCommit.oid)
            ctx.fs.remove(dir + `/.git/index`)
          },
        },
      }
    })
    .done()
