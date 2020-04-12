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
    it.each([['1'], [''], ['a.b.c'], ['0.0.0-'], ['0.0.0-1'], ['0.0.0-a'], ['0.0.0-a.a']])('%s', (caze) => {
      expect(Semver.parse(caze)).toBeNull()
    })
  })
})

describe('incStable', () => {
  it('can bump patch', () => {
    expect(Semver.incStable('major', Semver.createStable(1, 1, 1))).toMatchSnapshot()
  })
  it('can bump minor', () => {
    expect(Semver.incStable('minor', Semver.createStable(1, 1, 1))).toMatchSnapshot()
  })
  it('can bump major', () => {
    expect(Semver.incStable('major', Semver.createStable(1, 1, 1))).toMatchSnapshot()
  })
  it('propagates vprefix', () => {
    expect(Semver.incStable('major', Semver.createStable(1, 1, 1, { vprefix: true }))).toMatchSnapshot()
  })
})

describe('stableToPreview', () => {
  it('turns stable-release version into a pre-release one', () => {
    expect(Semver.stableToPreview(Semver.createStable(1, 2, 3), 'foobar', 100)).toMatchSnapshot()
  })
})
