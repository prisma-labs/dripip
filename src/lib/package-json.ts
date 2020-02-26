import * as fs from 'fs-jetpack'

type Json =
  | null
  | string
  | number
  | boolean
  | { [property: string]: Json }
  | Json[]

type JsonObject = { [property: string]: Json }

type PackageJsonUpdater = (
  packageJson: Record<string, any>
) => Record<string, any>

type PackageJson = {
  name: string
  version: string
}

export async function getPackageJson(): Promise<PackageJson> {
  const pj = await read(process.cwd())

  if (!pj) {
    throw new Error('Could not find pacakge.json')
  }

  return pj
}

/**
 * Read the package.json file.
 */
export async function read(cwd: string): Promise<undefined | PackageJson> {
  return fs.readAsync(fs.path(cwd, 'package.json'), 'json')

  // if (!packageJson) {
  //   throw new Error(
  //     `Looked for but could not find a package.json file at ${packageJsonPath}. This file is required for publishing to the npm registry.`
  //   )
  // }

  // if (typeof packageJson !== 'object') {
  //   throw new Error(
  //     `Found a package.json file at ${packageJsonPath} but it appears to be malformed. It did not parse into an object but rather: ${packageJson}`
  //   )
  // }
}

/**
 * Read the package.json file synchronously.
 */
export function readSync(cwd: string): undefined | PackageJson {
  return fs.read(fs.path(cwd, 'package.json'), 'json')
}

/**
 * Write the package.json file.
 */
export async function write(cwd: string, object: object): Promise<void> {
  return fs.writeAsync(fs.path(cwd, 'package.json'), object)
}

/**
 * Update the package.json located at cwd. The given updater function will
 * receive the parsed package contents and whatever is returned will be written
 * to disk.
 */
export async function update(
  cwd: string,
  updater: PackageJsonUpdater
): Promise<void> {
  const packageJson = await read(cwd)
  if (packageJson) {
    const packageJsonUpdated = await updater(packageJson)
    await fs.writeAsync(fs.path(cwd, 'package.json'), packageJsonUpdated)
  }
}

export function create(cwd?: string) {
  cwd = cwd ?? process.cwd()
  return {
    read: read.bind(null, cwd),
    readSync: readSync.bind(null, cwd),
    write: write.bind(null, cwd),
    update: update.bind(null, cwd),
  }
}

export type PJ = ReturnType<typeof create>
