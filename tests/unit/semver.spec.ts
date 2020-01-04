import * as Semver from '../../src/lib/semver'

describe('calcBumpType', () => {
  it('"fix" bumps patch', () => {
    expect(Semver.calcBumpType(['fix: 1'])).toEqual('patch')
  })

  it('"feat" bumps minor', () => {
    expect(Semver.calcBumpType(['feat: 1'])).toEqual('minor')
  })

  it('"feature" bumps minor', () => {
    expect(Semver.calcBumpType(['feat: 1'])).toEqual('minor')
  })

  it('presence of "BREAKING CHANGE" bumps major', () => {
    expect(
      Semver.calcBumpType(['anything: 1\nBREAKING CHANGE\nfoobar'])
    ).toEqual('major')
  })

  it('an unknown change type bumps patch', () => {
    expect(Semver.calcBumpType(['anything: 1'])).toEqual('patch')
  })

  it('patch-level changes ignored if already bumped past patch', () => {
    expect(Semver.calcBumpType(['feat: 1', 'fix: 1'])).toEqual('minor')
    expect(Semver.calcBumpType(['fix: 1', 'feat: 1'])).toEqual('minor')
  })

  it('feat-level changes ignored if already bumped past minor', () => {
    expect(Semver.calcBumpType(['feat: 1', 'fix: 1\nBREAKING CHANGE'])).toEqual(
      'major'
    )
    expect(Semver.calcBumpType(['fix: 1\nBREAKING CHANGE', 'feat: 1'])).toEqual(
      'major'
    )
  })

  it('chore-type commits are ignored', () => {
    expect(Semver.calcBumpType(['chore: 1'])).toEqual(null)
    expect(Semver.calcBumpType(['chore: 1', 'fix: 1'])).toEqual('patch')
    expect(Semver.calcBumpType(['chore: 1', 'feat: 1'])).toEqual('minor')
    expect(Semver.calcBumpType(['chore: 1\nBREAKING CHANGE\nfoobar'])).toEqual(
      null
    )
    expect(
      Semver.calcBumpType(['chore: 1', 'fix: 1\nBREAKING CHANGE'])
    ).toEqual('major')
  })

  it('invalid message formats cause the commit to be ignored', () => {
    expect(Semver.calcBumpType(['unknown'])).toEqual(null)
    expect(Semver.calcBumpType(['unknown', 'fix: 1'])).toEqual('patch')
    expect(Semver.calcBumpType(['unknown', 'feat: 1'])).toEqual('minor')
    expect(Semver.calcBumpType(['unknown\nBREAKING CHANGE\nfoobar'])).toEqual(
      null
    )
    expect(Semver.calcBumpType(['unknown', 'fix: 1\nBREAKING CHANGE'])).toEqual(
      'major'
    )
  })
})

describe('bumpVer', () => {
  it('can bump patch', () => {
    expect(Semver.bump('major', Semver.create(1, 1, 1)).version).toEqual(
      '2.0.0'
    )
  })
  it('can bump minor', () => {
    expect(Semver.bump('minor', Semver.create(1, 1, 1)).version).toEqual(
      '1.2.0'
    )
  })
  it('can bump major', () => {
    expect(Semver.bump('major', Semver.create(1, 1, 1)).version).toEqual(
      '2.0.0'
    )
  })
})
