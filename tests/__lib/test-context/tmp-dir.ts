import * as NodeFS from 'fs'
import * as fs from 'fs-jetpack'
import * as OS from 'os'
import * as Path from 'path'

export interface TmpDirContribution {
  dir: string
}

export const tmpDir = (): TmpDirContribution => {
  const tmpDir = getTmpDir()
  fs.dir(tmpDir)
  return { dir: tmpDir }
}

/**
 * Return the path to a temporary directory on the machine. This works around a
 * limitation in Node wherein a symlink is returned on macOS for `os.tmpdir`.
 */
export function getTmpDir(prefix: string = '') {
  const tmpDirPath = NodeFS.realpathSync(OS.tmpdir())
  const id = Math.random().toString().slice(2)
  const dirName = [prefix, id].filter((x) => x).join('-')

  // https://github.com/nodejs/node/issues/11422
  const tmpDir = Path.join(tmpDirPath, dirName)

  return tmpDir
}
