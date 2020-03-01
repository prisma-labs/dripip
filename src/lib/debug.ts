import createDebug from 'debug'
import * as Path from 'path'

export function rootDebug(componentName?: string) {
  let name = 'dripip'
  if (componentName) {
    name += `:${Path.parse(componentName).name}`
  }
  return createDebug(name)
}
