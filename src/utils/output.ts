import { format, inspect } from 'util'
import { Release } from '../lib/publish-package'
import { casesHandled } from '../lib/utils'
import { ValidationResult } from './context-guard'

type Ok<T extends string = string, D = Record<string, any>> = {
  kind: 'ok'
  type: T
  data: D
}

export type Exception<C = Record<string, any>> = {
  kind: 'exception'
  type: string
  data: {
    summary: string
    context: C
  }
}

type Message = Ok | Exception

/**
 * Passthrough to the underlying output mechanism.
 */
export function outputRaw(message: string): void {
  console.log(message)
}

type OutputOptions = {
  json: boolean
}

/**
 * This module encapsulates the various structures that dripip may output.
 * Precise data details stay local throughout the codebase but core concerns
 * like data envelop and serialization are encoded here.
 */

/**
 * Output Ok data to stdout. Use this to handle general output.
 */
export function outputOk(type: string, data: Record<string, any>): void {
  outputMessage(createOk(type, data))
}

/**
 * Outout Exception data to stdout. Unlike an error, exceptions are failure
 * scenarios that are known to be possible, and thus handled gracefully.
 *
 * @param identifier This is a meaningful exception slug like `no_permissions`.
 * Use this for to organize exeptions into a catalogue.
 *
 * @param summary Free form text that briefly explains what the exception
 * is, why it is happening, etc. Do not rely on rich context rendering here.
 * Instead prefer to put the data/variables at hand into the context object.
 *
 * @param context Arbitrary data that relates to the exception at hand.
 */
export function outputException(
  identifier: string,
  summary: string,
  opts: OutputOptions & { context: Record<string, any> }
): void {
  output(createException(identifier, { summary, context: opts.context }), {
    json: opts.json,
  })
}

export function output(message: Message, opts: OutputOptions): void {
  if (opts.json) {
    outputMessage(message)
  } else {
    if (message.kind === 'exception') {
      let s = ''
      s += `An exception occured: ${message.type}\n`
      s += `\n`
      s += message.data.summary
      if (message.data.context && Object.keys(message.data.context).length > 0) {
        s += `\n`
        s += format('%j', message.data.context)
      }
      outputRaw(s)
    } else if (message.kind === 'ok') {
      let s = ''
      s += inspect(message.data)
      // todo pretty printing
      outputRaw(s)
    } else {
      casesHandled(message)
    }
  }
}

/**
 * See output version docs.
 */
export function createOk<T extends string>(type: T, data: Record<string, any>): Ok<T> {
  return { kind: 'ok', type, data }
}

type DryRun = Ok<'dry_run'>

export function createDryRun(data: Record<string, any>): DryRun {
  return createOk('dry_run', data)
}

/**
 * See output version docs.
 */
export function createException(
  type: string,
  {
    summary,
    context,
  }: {
    summary: string
    context?: Record<string, any>
  }
): Exception {
  return {
    kind: 'exception',
    type,
    data: {
      summary,
      context: context ?? {},
    },
  }
}

export function createDidNotPublish(data: { reasons: ValidationResult[] }) {
  return createOk('did_not_publish', data)
}

export function createDidPublish(data: { release: Release }) {
  return createOk('did_publish', data)
}

/**
 * Output Message to stdout.
 */
export function outputMessage(msg: Message): void {
  outputJson(msg)
}

/**
 * Output JSON to stdout.
 */
export function outputJson(msg: object): void {
  process.stdout.write(JSON.stringify(msg))
}
