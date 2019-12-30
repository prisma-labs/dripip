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

function validatePackageJson() {}

/**
 * Update the package.json located at cwd. The given updater function will
 * receive the parsed package contents and whatever is returned will be written
 * to disk.
 */
export async function update(updater: PackageJsonUpdater): Promise<void> {
  const packageJson: undefined | JsonObject = await fs.readAsync(
    'package.json',
    'json'
  )
  if (packageJson) {
    const packageJsonUpdated = await updater(packageJson)
    await fs.writeAsync('package.json', packageJsonUpdated)
  }
}
