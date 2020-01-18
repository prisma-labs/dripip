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

/**
 * Read the package.json file.
 */
export async function read(): Promise<undefined | PackageJson> {
  return fs.readAsync('package.json', 'json')

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
export function readSync(): undefined | PackageJson {
  return fs.read('package.json', 'json')
}

/**
 * Write the package.json file.
 */
export async function write(object: object): Promise<void> {
  return fs.writeAsync('package.json', object)
}

/**
 * Update the package.json located at cwd. The given updater function will
 * receive the parsed package contents and whatever is returned will be written
 * to disk.
 */
export async function update(updater: PackageJsonUpdater): Promise<void> {
  const packageJson = await read()
  if (packageJson) {
    const packageJsonUpdated = await updater(packageJson)
    await fs.writeAsync('package.json', packageJsonUpdated)
  }
}
