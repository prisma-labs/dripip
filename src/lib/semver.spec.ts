import * as Semver from './semver'

describe('parse', () => {
  it('0.0.1', () => {
    expect(Semver.parse('0.0.1')).toMatchSnapshot()
  })

  it('0.1.0', () => {
    expect(Semver.parse('0.1.0')).toMatchSnapshot()
  })

  it('1.0.0', () => {
    expect(Semver.parse('1.0.0')).toMatchSnapshot()
  })

  it('0.0.11', () => {
    expect(Semver.parse('0.0.11')).toMatchSnapshot()
  })

  it('0.11.0', () => {
    expect(Semver.parse('0.11.0')).toMatchSnapshot()
  })

  it('11.0.0', () => {
    expect(Semver.parse('11.0.0')).toMatchSnapshot()
  })

  describe('v-prefix', () => {
    it('v0.0.0', () => {
      expect(Semver.parse('v0.0.0')).toMatchSnapshot()
    })

    it('v0.0.0-a.1', () => {
      expect(Semver.parse('v0.0.0-a.1')).toMatchSnapshot()
    })
  })

  describe('pre-releases', () => {
    it('0.0.0-a.1', () => {
      expect(Semver.parse('0.0.0-a.1')).toMatchSnapshot()
    })
  })

  describe('rejects', () => {
    it.each([
      ['1'],
      [''],
      ['a.b.c'],
      ['0.0.0-'],
      ['0.0.0-1'],
      ['0.0.0-a'],
      ['0.0.0-a.a'],
    ])('%s', caze => {
      expect(Semver.parse(caze)).toBeNull()
    })
  })
})

describe('calcIncType', () => {
  it('"fix" bumps patch', () => {
    expect(Semver.calcIncType(['fix: 1'])).toEqual('patch')
  })

  it('"feat" bumps minor', () => {
    expect(Semver.calcIncType(['feat: 1'])).toEqual('minor')
  })

  it('"feature" bumps minor', () => {
    expect(Semver.calcIncType(['feat: 1'])).toEqual('minor')
  })

  it('presence of "BREAKING CHANGE" bumps major', () => {
    expect(
      Semver.calcIncType(['anything: 1\nBREAKING CHANGE\nfoobar'])
    ).toEqual('major')
  })

  it('an unknown change type bumps patch', () => {
    expect(Semver.calcIncType(['anything: 1'])).toEqual('patch')
  })

  it('patch-level changes ignored if already bumped past patch', () => {
    expect(Semver.calcIncType(['feat: 1', 'fix: 1'])).toEqual('minor')
    expect(Semver.calcIncType(['fix: 1', 'feat: 1'])).toEqual('minor')
  })

  it('feat-level changes ignored if already bumped past minor', () => {
    expect(Semver.calcIncType(['feat: 1', 'fix: 1\nBREAKING CHANGE'])).toEqual(
      'major'
    )
    expect(Semver.calcIncType(['fix: 1\nBREAKING CHANGE', 'feat: 1'])).toEqual(
      'major'
    )
  })

  it('chore-type commits are ignored', () => {
    expect(Semver.calcIncType(['chore: 1'])).toEqual(null)
    expect(Semver.calcIncType(['chore: 1', 'fix: 1'])).toEqual('patch')
    expect(Semver.calcIncType(['chore: 1', 'feat: 1'])).toEqual('minor')
    expect(Semver.calcIncType(['chore: 1\nBREAKING CHANGE\nfoobar'])).toEqual(
      null
    )
    expect(Semver.calcIncType(['chore: 1', 'fix: 1\nBREAKING CHANGE'])).toEqual(
      'major'
    )
  })

  it('invalid message formats cause the commit to be ignored', () => {
    expect(Semver.calcIncType(['unknown'])).toEqual(null)
    expect(Semver.calcIncType(['unknown', 'fix: 1'])).toEqual('patch')
    expect(Semver.calcIncType(['unknown', 'feat: 1'])).toEqual('minor')
    expect(Semver.calcIncType(['unknown\nBREAKING CHANGE\nfoobar'])).toEqual(
      null
    )
    expect(Semver.calcIncType(['unknown', 'fix: 1\nBREAKING CHANGE'])).toEqual(
      'major'
    )
  })
})

describe('incStable', () => {
  it('can bump patch', () => {
    expect(
      Semver.incStable('major', Semver.createStable(1, 1, 1))
    ).toMatchSnapshot()
  })
  it('can bump minor', () => {
    expect(
      Semver.incStable('minor', Semver.createStable(1, 1, 1))
    ).toMatchSnapshot()
  })
  it('can bump major', () => {
    expect(
      Semver.incStable('major', Semver.createStable(1, 1, 1))
    ).toMatchSnapshot()
  })
  it('propagates vprefix', () => {
    expect(
      Semver.incStable('major', Semver.createStable(1, 1, 1, { vprefix: true }))
    ).toMatchSnapshot()
  })
})

describe('stableToPreview', () => {
  it('turns stable-release version into a pre-release one', () => {
    expect(
      Semver.stableToPreview(Semver.createStable(1, 2, 3), 'foobar', 100)
    ).toMatchSnapshot()
  })
})
