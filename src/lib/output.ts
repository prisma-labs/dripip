/**
 * This module encapsulates the various structures that libre may output.
 * Precise data details stay local throughout the codebase but core concerns
 * like data envelop and serialization are encoded here.
 */

/**
 * Output Ok data to stdout. Use this to handle general output.
 */
export function outputOk(data: Record<string, any>): void {
  outputJson(createOk(data))
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
  outputJson(createException(identifier, summary, context))
}

/**
 * See output version docs.
 */
function createOk(data: Record<string, any>) {
  return {
    data,
    type: 'ok',
  }
}

/**
 * See output version docs.
 */
function createException(
  identifier: string,
  description: string,
  context: Record<string, any>
): Record<string, any> {
  return {
    type: 'exception',
    data: {
      identifier,
      description,
      context,
    },
  }
}

/**
 * Output JSON to stdout.
 */
function outputJson(object: Record<string, any>): void {
  console.log(JSON.stringify(object))
}
