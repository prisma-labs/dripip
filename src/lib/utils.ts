import { inspect } from 'util'

export function dump(arg: unknown): void {
  console.error(inspect(arg, { depth: 30 }))
}
/**
 * Indent a string that spans multiple lines.
 */
export function indentBlock(size: number, block: string): string {
  return block
    .split('\n')
    .map((line) => range(size).map(constant(' ')).join('') + line)
    .join('\n')
}

export const indentBlock4 = indentBlock.bind(null, 4)

/**
 * Create a function that will only ever return the given value when called.
 */
export const constant = <T>(x: T): (() => T) => {
  return function () {
    return x
  }
}

/**
 * Create a range of integers.
 */
const range = (times: number): number[] => {
  const list: number[] = []
  while (list.length < times) {
    list.push(list.length + 1)
  }
  return list
}

// type IndexableKeyTypes = string | number | symbol

// type Indexable<T = unknown> = Record<string | number, T>

// type JustIndexableTypes<T> = T extends IndexableKeyTypes ? T : never

// type KeysMatching<Rec, Keys> = NonNullable<
//   {
//     [RecKey in keyof Rec]: Rec[RecKey] extends Keys ? RecKey : never
//   }[keyof Rec]
// >

// export type GroupBy<T extends Indexable, K extends IndexableKeys<T>> = {
//   [KV in JustIndexableTypes<T[K]>]?: Array<T extends Record<K, KV> ? T : never>
// }

// type IndexableKeys<Rec> = KeysMatching<Rec, IndexableKeyTypes>

// export function groupByProp<
//   Obj extends Indexable,
//   KeyName extends IndexableKeys<Obj>
// >(xs: Obj[], keyName: KeyName): GroupBy<Obj, KeyName> {
//   type KeyValue = JustIndexableTypes<Obj[KeyName]>
//   const seed = {} as GroupBy<Obj, KeyName>

//   return xs.reduce((groupings, x) => {
//     const groupName = x[keyName] as KeyValue

//     if (groupings[groupName] === undefined) {
//       groupings[groupName] = []
//     }

//     // We know the group will exist, given above initializer.
//     groupings[groupName]!.push(
//       x as Obj extends Record<KeyName, KeyValue> ? Obj : never
//     )

//     return groupings
//   }, seed)
// }

/**
 * Use this to make assertion at end of if-else chain that all members of a
 * union have been accounted for.
 */
export function casesHandled(x: never): never {
  throw new Error(`A case was not handled for value: ${x}`)
}

/**
 * Determine if the given array or object is empty.
 */
export function isEmpty(x: {} | unknown[]): boolean {
  return Array.isArray(x) ? x.length === 0 : Object.keys(x).length > 0
}

/**
 * Pause in time for given milliseconds.
 */
export function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 1000)
  })
}

/**
 * Like Array.findIndex but working backwards from end of array.
 */
export function findIndexFromEnd<T>(xs: T[], f: (x: T) => boolean): number {
  for (let index = xs.length - 1; index > -1; index--) {
    if (f(xs[index])) return index
  }
  return -1
}

/**
 * Get the last element of an array.
 */
export function last<T>(xs: T[]): null | T {
  if (xs.length === 0) return null
  return xs[xs.length - 1]
}

export function numericAscending(n1: number, n2: number): -1 | 0 | 1 {
  if (n1 < n2) return -1
  if (n1 > n2) return 1
  return 0
}
