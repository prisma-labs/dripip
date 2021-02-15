// TODO the gitlog permits cases that aren't valid under these tests. Namely
// that it can be an arbitrary git log. However buildSeries works on the
// assumption that the latest stable and all subsequent commits has been
// fetched.

import * as Git from '../lib/git'
import * as Rel from './release'

describe('buildSeries', () => {
  it('one breaking change commit makes the series breaking', () => {
    expect(gitlog(n, breaking, p).hasBreakingChange).toEqual(true)
  })
  it('tracks if is initial development', () => {
    expect(gitlog(p).isInitialDevelopment).toEqual(true)
  })
  it('tracks if is not initial development', () => {
    expect(gitlog(s, p).isInitialDevelopment).toEqual(false)
  })
  it('<empty>', () => {
    expect(() => gitlog()).toThrowErrorMatchingSnapshot()
  })
  it('none', () => {
    expect(gitlog(n)).toMatchSnapshot()
  })
  it('none preview', () => {
    expect(gitlog(n, p)).toMatchSnapshot()
  })
  it('preview none none preview', () => {
    expect(gitlog(p, n, n, p)).toMatchSnapshot()
  })
  it('stable none', () => {
    expect(gitlog(s, n)).toMatchSnapshot()
  })
  it('stable none none preview none', () => {
    expect(gitlog(s, n, n, p, n)).toMatchSnapshot()
  })
  it('stable none none preview preview preview none preview', () => {
    expect(gitlog(s, n, n, p, p, p, n, p)).toMatchSnapshot()
  })
})

//
// Helpers
//

type RawLogEntryValues = [string, string, string]

let pNum: number
let sMaj: number
let noneCounter: number

beforeEach(() => {
  pNum = 0
  noneCounter = 1
  sMaj = 0
})

/**
 * breaking change commit
 */
function breaking(): RawLogEntryValues {
  const ver = `${sMaj}.0.0-next.${pNum}`
  return ['sha', `tag: ${ver}`, `foo: bar\n\nBREAKING CHANGE: foo`]
}

/**
 * preview-released commit
 */
function p(): RawLogEntryValues {
  pNum++
  const ver = `${sMaj}.0.0-next.${pNum}`
  return ['sha', `tag: ${ver}`, `foo @ ${ver}`]
}

/**
 * stable-released commit
 */
function s(): RawLogEntryValues {
  sMaj++
  pNum = 0
  const ver = `${sMaj}.0.0`
  return ['sha', `tag: ${ver}`, `foo @ ${ver}`]
}

/**
 * unreleased commit
 */
function n(): RawLogEntryValues {
  return ['sha', '', `fix: thing ${noneCounter++}`]
}

function gitlog(...actions: (() => RawLogEntryValues)[]): Rel.Series {
  const log = Git.parseRawLog(Git.serializeLog(actions.map((f) => f()))).map(Git.parseLogRefs)
  const pstable = actions[0] === s ? (log.pop() as Git.LogEntry) : null
  return Rel.buildSeries([pstable, log])
}
