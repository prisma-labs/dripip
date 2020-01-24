import { calcBumpType, parse } from './conventional-commit'

describe(calcBumpType.name, () => {
  it('"fix" bumps patch', () => {
    expect(calcBumpType(['fix: 1'])).toEqual('patch')
  })

  it('"feat" bumps minor', () => {
    expect(calcBumpType(['feat: 1'])).toEqual('minor')
  })

  it('"feature" bumps minor', () => {
    expect(calcBumpType(['feat: 1'])).toEqual('minor')
  })

  it('presence of "BREAKING CHANGE:" bumps major', () => {
    expect(calcBumpType(['anything: 1\n\nBREAKING CHANGE:\nfoobar'])).toEqual(
      'major'
    )
  })

  it('an unknown change type bumps patch', () => {
    expect(calcBumpType(['anything: 1'])).toEqual('patch')
  })

  it('patch-level changes ignored if already bumped past patch', () => {
    expect(calcBumpType(['feat: 1', 'fix: 1'])).toEqual('minor')
    expect(calcBumpType(['fix: 1', 'feat: 1'])).toEqual('minor')
  })

  it('feat-level changes ignored if already bumped past minor', () => {
    expect(calcBumpType(['feat: 1', 'fix: 1\n\nBREAKING CHANGE: foo'])).toEqual(
      'major'
    )
    expect(calcBumpType(['fix: 1\n\nBREAKING CHANGE: foo', 'feat: 1'])).toEqual(
      'major'
    )
  })

  it('chore-type commits are ignored', () => {
    expect(calcBumpType(['chore: 1'])).toEqual(null)
    expect(calcBumpType(['chore: 1', 'fix: 1'])).toEqual('patch')
    expect(calcBumpType(['chore: 1', 'feat: 1'])).toEqual('minor')
    expect(calcBumpType(['chore: 1\n\nBREAKING CHANGE: foo\nfoobar'])).toEqual(
      null
    )
    expect(
      calcBumpType(['chore: 1', 'fix: 1\n\nBREAKING CHANGE: foo'])
    ).toEqual('major')
  })

  it('invalid message formats cause the commit to be ignored', () => {
    expect(calcBumpType(['unknown'])).toEqual(null)
    expect(calcBumpType(['unknown', 'fix: 1'])).toEqual('patch')
    expect(calcBumpType(['unknown', 'feat: 1'])).toEqual('minor')
    expect(calcBumpType(['unknown\n\nBREAKING CHANGE: foo\nfoobar'])).toEqual(
      null
    )
    expect(calcBumpType(['unknown', 'fix: 1\n\nBREAKING CHANGE: foo'])).toEqual(
      'major'
    )
  })
})

describe(parse.name, () => {
  // prettier-ignore
  it.each([
    ['t: d', { type: 't', description: 'd', body: null, scope: null, footers: [], breakingChange: null }],
    ['tt: dd', { type: 'tt', description: 'dd', body: null, scope: null, footers: [], breakingChange: null }],
    ['t(s): d', { type: 't', description: 'd', body: null, scope: 's', footers: [], breakingChange: null }],
    ['t(ss): d', { type: 't', description: 'd', body: null, scope: 'ss', footers: [], breakingChange: null }],
    // body
    ['t: d\n\nb', { type: 't', description: 'd', body: 'b', scope: null, footers: [], breakingChange: null }],
    ['t: d\n\nbb\n1\n23', { type: 't', description: 'd', body: 'bb\n1\n23', scope: null, footers: [], breakingChange: null }],
    ['t: d\n\nb\n\nb f:1', { type: 't', description: 'd', body: 'b\n\nb f:1', scope: null, footers: [], breakingChange: null }],
    // footers
    ['t: d\n\nt1:1', { type: 't', description: 'd', body: null, scope: null, footers: [{ type:'t1', body:'1' }], breakingChange: null }],
    ['t: d\n\nb\n\nt1:1', { type: 't', description: 'd', body: 'b', scope: null, footers: [{ type:'t1', body:'1' }], breakingChange: null }],
    ['t: d\n\nt1-1_1:1', { type: 't', description: 'd', body: null, scope: null, footers: [{ type:'t1-1_1', body:'1' }], breakingChange: null }],
    ['t: d\n\nb\n\nt1:b1\n\nt2:b2', { type: 't', description: 'd', body: 'b', scope: null, footers: [{ type:'t1', body:'b1' }, { type: 't2', body: 'b2' }], breakingChange: null }],
    ['t: d\n\nb\n\nt1:b1\n\nb1\n\nt2-2:b2\n\nb2', { type: 't', description: 'd', body: 'b', scope: null, footers: [{ type:'t1', body:'b1\n\nb1' }, { type: 't2-2', body: 'b2\n\nb2' }], breakingChange: null }],
    // whitespace is trimmed
    ['t: d ', { type: 't', description: 'd', body: null, scope: null, footers: [], breakingChange: null }],
    [' t : d ', { type: 't', description: 'd', body: null, scope: null, footers: [], breakingChange: null }],
    [' t ( s ): d ', { type: 't', description: 'd', body: null, scope: 's', footers: [], breakingChange: null }],
    ['t: d\n\nb\n\n f  :  1 ', { type: 't', description: 'd', body: 'b', scope: null, footers: [{ type:'f', body:'1' }], breakingChange: null }],
    // we allow 0 or many spaces while cc-spec asks for exactly 1
    ['t:d', { type: 't', description: 'd', body: null, scope: null, footers: [], breakingChange: null }],
    ['t:  d', { type: 't', description: 'd', body: null, scope: null, footers: [], breakingChange: null }],
    // invalids
    ['a', null],
    ['a b', null],
    ['a() b', null],
    ['a(): b', null],
    ['a: b\nd', null],
    // breaking change
    ['t: d\n\nBREAKING CHANGE: foo', { type: 't', description: 'd', body: null, scope: null, footers: [], breakingChange: 'foo' }],
    ['t: d\n\nBREAKING-CHANGE: foo', { type: 't', description: 'd', body: null, scope: null, footers: [], breakingChange: 'foo' }],
    ['t: d\n\nb\n\nBREAKING CHANGE: foo', { type: 't', description: 'd', body: 'b', scope: null, footers: [], breakingChange: 'foo' }],
    ['t: d\n\nb\n\nBREAKING CHANGE: foo\n\nt1:t1', { type: 't', description: 'd', body: 'b', scope: null, footers: [{ type:'t1', body:'t1' }], breakingChange: 'foo' }],
    ['t: d\n\nb\n\nt1:t1\n\nBREAKING CHANGE: foo  ', { type: 't', description: 'd', body: 'b', scope: null, footers: [{ type:'t1', body:'t1' }], breakingChange: 'foo' }],
    ['t: d\n\nb\n\nt1:t1\n\nBREAKING-CHANGE: foo  ', { type: 't', description: 'd', body: 'b', scope: null, footers: [{ type:'t1', body:'t1' }], breakingChange: 'foo' }],
  ])(
    '%s',
    (given, expected) => {
      expect(parse(given)).toEqual(expected)
    }
  )
})
