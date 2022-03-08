import { provider } from 'konn'
import { Providers } from 'konn/providers'
import * as Path from 'path'

type Needs = Providers.Dir.Contributes

export const fixture = <Use extends `git-repo-dripip-system-tests` | `git-init`>(params: {
  use: Use
  /**
   * A relative path. The path will be relative to the CWD of the Konn Dir Provider.
   *
   * The path will be used as the directory to copy the fixture into.
   *
   * The directory will be created if it does not exist.
   *
   * The directory will be deleted if it already exists.
   */
  into: string
}) =>
  provider<Needs>()
    .name(`fixture`)
    .before((ctx) => {
      const fixturePath = Path.join(__dirname, `../__fixtures`, params.use)
      if (!ctx.fs.exists(fixturePath)) {
        throw new Error(`Fixture "${params.use}" is not located at ${fixturePath}.`)
      }
      const destinationDir = ctx.fs.path(params.into)
      ctx.fs.remove(ctx.fs.path(params.into))
      ctx.fs.copy(fixturePath, destinationDir, { overwrite: true })
    })
    .done()
