import createDebug from 'debug'
import * as Path from 'path'

const dripipDebug = createDebug('dripip')

export function debug(formatter: any, ...args: any[]): void {
  return dripipDebug(formatter, ...args)
}

export function rootDebug(componentName: string) {
  return createDebug(`dripip:${Path.parse(componentName).name}`)
}
