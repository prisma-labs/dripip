import { TmpDirContribution } from './tmp-dir'
import * as FS from 'fs-jetpack'
import { FSJetpack } from 'fs-jetpack/types'

export interface FsContribution {
  fs: FSJetpack
}

export const fs = (ctx: TmpDirContribution): FsContribution => {
  return {
    fs: FS.cwd(ctx.dir),
  }
}
