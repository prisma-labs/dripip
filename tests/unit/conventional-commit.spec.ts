import * as CC from '../../src/lib/conventional-commit'

describe('calcBumpType', () => {
  it('"fix" bumps patch', () => {
    expect(CC.calcBumpType(['fix: 1'])).toEqual('patch')
  })

  it('"feat" bumps minor', () => {
    expect(CC.calcBumpType(['feat: 1'])).toEqual('minor')
  })

  it('"feature" bumps minor', () => {
    expect(CC.calcBumpType(['feat: 1'])).toEqual('minor')
  })

  it('presence of "BREAKING CHANGE" bumps major', () => {
    expect(CC.calcBumpType(['anything: 1\nBREAKING CHANGE\nfoobar'])).toEqual(
      'major'
    )
  })

  it('an unknown change type bumps patch', () => {
    expect(CC.calcBumpType(['anything: 1'])).toEqual('patch')
  })

  it('patch-level changes ignored if already bumped past patch', () => {
    expect(CC.calcBumpType(['feat: 1', 'fix: 1'])).toEqual('minor')
    expect(CC.calcBumpType(['fix: 1', 'feat: 1'])).toEqual('minor')
  })

  it('feat-level changes ignored if already bumped past minor', () => {
    expect(CC.calcBumpType(['feat: 1', 'fix: 1\nBREAKING CHANGE'])).toEqual(
      'major'
    )
    expect(CC.calcBumpType(['fix: 1\nBREAKING CHANGE', 'feat: 1'])).toEqual(
      'major'
    )
  })

  it('chore-type commits are ignored', () => {
    expect(CC.calcBumpType(['chore: 1'])).toEqual(null)
    expect(CC.calcBumpType(['chore: 1', 'fix: 1'])).toEqual('patch')
    expect(CC.calcBumpType(['chore: 1', 'feat: 1'])).toEqual('minor')
    expect(CC.calcBumpType(['chore: 1\nBREAKING CHANGE\nfoobar'])).toEqual(null)
    expect(CC.calcBumpType(['chore: 1', 'fix: 1\nBREAKING CHANGE'])).toEqual(
      'major'
    )
  })

  it('invalid message formats cause the commit to be ignored', () => {
    expect(CC.calcBumpType(['unknown'])).toEqual(null)
    expect(CC.calcBumpType(['unknown', 'fix: 1'])).toEqual('patch')
    expect(CC.calcBumpType(['unknown', 'feat: 1'])).toEqual('minor')
    expect(CC.calcBumpType(['unknown\nBREAKING CHANGE\nfoobar'])).toEqual(null)
    expect(CC.calcBumpType(['unknown', 'fix: 1\nBREAKING CHANGE'])).toEqual(
      'major'
    )
  })
})
