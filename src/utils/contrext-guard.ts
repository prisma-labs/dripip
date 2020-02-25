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
    prefer(checker: Validator) {
      return api.check('prefer', checker)
    },
    must(checker: Validator) {
      return api.check('must', checker)
    },
    run() {
      return contextualizedCheckers.reduce((results, requirement) => {
        const resultSugar = requirement.validator.run(options.context)
        const result =
          typeof resultSugar === 'boolean'
            ? booleanResult(resultSugar)
            : resultSugar

        const group =
          result.kind === 'pass'
            ? results.passes
            : requirement.level === 'must'
            ? results.mustFailures
            : results.preferFailures

        group.push({
          details: result.details,
          summary: requirement.validator.summary,
          code: requirement.validator.code,
        })

        return results
      }, createDiagnostics())
    },
  }

  return api
}

/**
 *
 */
function createDiagnostics(): Report {
  return {
    preferFailures: [],
    mustFailures: [],
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
 *
 */
export function guard(input: EnforceInput): void {
  if (input.json) {
    // todo how to report warnings in json mode?

    // results.preferFailures
    //   .map(failure => {
    //     return failure.checker.summary
    //   })
    //   .forEach(console.warn)

    if (input.report.mustFailures.length) {
      throw new JSONCLIError({
        context: input.context,
        failures: input.report.mustFailures,
      })
    }
  } else {
    input.report.preferFailures
      .map(failure => {
        return failure.summary
      })
      .forEach(console.warn)

    if (input.report.mustFailures.length) {
      throw new PassthroughCLIError(
        input.report.mustFailures
          .map(failure => {
            return failure.summary
          })
          .join('\n - ')
      )
    }
  }
}

interface Requirement {
  validator: Validator
  level: 'prefer' | 'must'
}

interface ValidationResult {
  code: Validator['code']
  summary: string
  details: Record<string, unknown>
}

interface Report {
  mustFailures: ValidationResult[]
  preferFailures: ValidationResult[]
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
  code = 'JSONError'

  constructor(private errorString: string) {
    super('...todo...', { exit: 1 })
  }

  render(): string {
    return this.errorString
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
