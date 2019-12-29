import { assertAllCasesHandled } from './utils'
import { stripIndent } from 'common-tags'
import { format } from 'util'

type Ok<D = Record<string, any>> = {
  kind: 'ok'
  type: string
  data: D
}

type Exception<C = Record<string, any>> = {
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

/**
 * This module encapsulates the various structures that libre may output.
 * Precise data details stay local throughout the codebase but core concerns
 * like data envelop and serialization are encoded here.
 */

/**
 * Output Ok data to stdout. Use this to handle general output.
 */
export function outputOk(type: string, data: Record<string, any>): void {
  outputJson(createOk(type, data))
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
  context: Record<string, any>
): void {
  outputJson(createException(identifier, { summary, context }))
}

type OutputOptions = {
  json: boolean
}

export function output(message: Message, opts: OutputOptions): void {
  if (opts.json) {
    outputJson(message)
  } else {
    if (message.kind === 'exception') {
      let s = ''
      s += `An exception occured: ${message.type}\n`
      s += `\n`
      s += message.data.summary
      if (
        message.data.context &&
        Object.keys(message.data.context).length > 0
      ) {
        s += `\n`
        s += format('%j', message.data.context)
      }
      outputRaw(s)
    } else if (message.kind === 'ok') {
      let s = ''
      s += message.data
    } else {
      assertAllCasesHandled(message)
    }
  }
}

/**
 * See output version docs.
 */
export function createOk(type: string, data: Record<string, any>): Ok {
  return {
    kind: 'ok',
    type,
    data,
  }
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

/**
 * Output JSON to stdout.
 */
function outputJson(msg: Message): void {
  console.log(JSON.stringify(msg))
}
