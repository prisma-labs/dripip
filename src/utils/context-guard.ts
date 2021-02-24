import { CLIError } from '@oclif/errors'
import * as Context from './context'

type Options = {
  context: Context.Context
}

/**
 *
 * @example
 *
 * ```ts
 * guard(ctx)
 *   .must(isTrunk())
 *   .check(flags.upToDate ? 'must' : 'prefer', upToDate())
 *
 * if (flags.npmPublish) {
 *   guard.must(publishRights())
 * }
 *
 * guard.run()
 * ```
 */
export function check(options: Options) {
  const contextualizedCheckers: Requirement[] = []

  const api = {
    check(level: Requirement['level'], validator: Validator) {
      contextualizedCheckers.push({ level, validator })
      return api
    },
    stopUnless(checker: Validator) {
      return api.check('prefer', checker)
    },
    errorUnless(checker: Validator) {
      return api.check('must', checker)
    },
    run() {
      return contextualizedCheckers.reduce((results, requirement) => {
        const resultSugar = requirement.validator.run(options.context)
        const result = typeof resultSugar === 'boolean' ? booleanResult(resultSugar) : resultSugar

        const group =
          result.kind === 'pass'
            ? results.passes
            : requirement.level === 'must'
            ? results.errors
            : results.stops

        group.push({
          details: result.details,
          summary: requirement.validator.summary,
          code: requirement.validator.code,
        })

        return results
      }, createReport())
    },
  }

  return api
}

/**
 *
 */
function createReport(): Report {
  return {
    stops: [],
    errors: [],
    passes: [],
  }
}

/**
 *
 */
interface EnforceInput {
  context: Context.Context
  report: Report
  json?: boolean
}

/**
 * Enforce the result of a report. Throws errors/stop-signal that will halt the
 * CLI if needed.
 */
export function guard(input: EnforceInput): void {
  if (input.report.errors.length) {
    if (input.json) {
      if (input.report.errors.length) {
        throw new JSONCLIError({
          context: input.context,
          failures: input.report.errors,
        })
      }
    } else {
      throw new PassthroughCLIError(
        input.report.errors
          .map((failure) => {
            return failure.summary
          })
          .join('\n - ')
      )
    }
  }

  if (input.report.stops.length) {
    throw new CLIStop({ reasons: input.report.stops, json: input.json })
  }
}

interface Requirement {
  validator: Validator
  level: 'prefer' | 'must'
}

export interface ValidationResult {
  code: Validator['code']
  summary: string
  details: Record<string, unknown>
}

interface Report {
  errors: ValidationResult[]
  stops: ValidationResult[]
  passes: ValidationResult[]
}

//
// Errors for halting CLI process
//

export class JSONCLIError extends CLIError {
  oclif!: { exit: number }
  code = 'JSONError'

  constructor(private errorObject: object) {
    super('...todo...', { exit: 1 })
  }

  render(): string {
    return JSON.stringify(this.errorObject)
  }
}

export class PassthroughCLIError extends CLIError {
  oclif!: { exit: number }
  code = 'PassthroughError'

  constructor(private errorString: string) {
    super('...todo...', { exit: 1 })
  }

  render(): string {
    return this.errorString
  }
}

export class CLIStop extends CLIError {
  oclif!: { exit: number }
  code = 'Stop'

  constructor(private input: { reasons: ValidationResult[]; json?: boolean }) {
    super('...todo...', { exit: 0 })
  }

  render(): string {
    if (this.input.json) {
      return JSON.stringify({ reasons: this.input.reasons })
    } else {
      return 'Nothing to do:\n\n' + this.input.reasons.map((r) => r.summary).join('\n -')
    }
  }
}

//
// Base Either-like & validator types
//

export interface Validator {
  code: string
  summary: string
  run(ctx: Context.Context): Pass | Fail | boolean
}

interface Pass {
  kind: 'pass'
  details: Record<string, unknown>
}

interface Fail {
  kind: 'fail'
  details: Record<string, unknown>
}

export type Result = Pass | Fail

export function booleanResult(bool: boolean): Result {
  return bool ? { kind: 'pass', details: {} } : { kind: 'fail', details: {} }
}
