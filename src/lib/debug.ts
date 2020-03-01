import createDebug from 'debug'

const dripipDebug = createDebug('dripip')

export function debug(formatter: any, ...args: any[]): void {
  return dripipDebug(formatter, ...args)
}

export function rootDebug(componentName: string) {
  return createDebug(`dripip:${componentName.replace(/\..*$/, '')}`)
}
