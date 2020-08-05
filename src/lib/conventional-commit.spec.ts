import { calcBumpType, parse } from './conventional-commit'

describe(calcBumpType.name, () => {
  it('invalid message formats cause the commit to be ignored', () => {
    expect(calcBumpType(false, ['unknown'])).toEqual(null)
    expect(calcBumpType(false, ['unknown', 'fix: 1'])).toEqual('patch')
    expect(calcBumpType(false, ['unknown', 'feat: 1'])).toEqual('minor')
    expect(calcBumpType(false, ['unknown\n\nBREAKING CHANGE: foo\nfoobar'])).toEqual(null)
    expect(calcBumpType(false, ['unknown', 'fix: 1\n\nBREAKING CHANGE: foo'])).toEqual('major')
    expect(calcBumpType(false, ['unknown', 'fix!: 1\n\nBREAKING CHANGE: foo'])).toEqual('major')
    expect(calcBumpType(false, ['unknown', 'fix!: 1'])).toEqual('major')
  })

  describe('initial development', () => {
    it('BREAKING CHANGE bumps minor', () => {
      expect(calcBumpType(true, ['fix: 1', 'fix: 2\n\nBREAKING CHANGE: foobar'])).toEqual('minor')
    })
    it('initial development is completed by COMPLETES INITIAL DEVELOPMENT', () => {
      expect(calcBumpType(true, ['fix: 1\n\nCOMPLETES INITIAL DEVELOPMENT'])).toEqual('major')
    })
  })

  describe('post initial development', () => {
    it('COMPLETES INITIAL DEVELOPMENT is ignored', () => {
      expect(calcBumpType(false, ['fix: 1\n\nCOMPLETES INITIAL DEVELOPMENT'])).toEqual('patch')
    })

    it('"fix" bumps patch', () => {
      expect(calcBumpType(false, ['fix: 1'])).toEqual('patch')
    })

    it('"feat" bumps minor', () => {
      expect(calcBumpType(false, ['feat: 1'])).toEqual('minor')
    })

    it('"feature" bumps minor', () => {
      expect(calcBumpType(false, ['feat: 1'])).toEqual('minor')
    })

    it('presence of "BREAKING CHANGE:" bumps major', () => {
      expect(calcBumpType(false, ['anything: 1\n\nBREAKING CHANGE:\nfoobar'])).toEqual('major')
    })

    it('an unknown change type bumps patch', () => {
      expect(calcBumpType(false, ['anything: 1'])).toEqual('patch')
    })

    it('patch-level changes ignored if already bumped past patch', () => {
      expect(calcBumpType(false, ['feat: 1', 'fix: 1'])).toEqual('minor')
      expect(calcBumpType(false, ['fix: 1', 'feat: 1'])).toEqual('minor')
    })

    it('feat-level changes ignored if already bumped past minor', () => {
      expect(calcBumpType(false, ['feat: 1', 'fix: 1\n\nBREAKING CHANGE: foo'])).toEqual('major')
      expect(calcBumpType(false, ['fix: 1\n\nBREAKING CHANGE: foo', 'feat: 1'])).toEqual('major')
    })

    it('chore-type commits are ignored', () => {
      expect(calcBumpType(false, ['chore: 1'])).toEqual(null)
      expect(calcBumpType(false, ['chore: 1', 'fix: 1'])).toEqual('patch')
      expect(calcBumpType(false, ['chore: 1', 'feat: 1'])).toEqual('minor')
      expect(calcBumpType(false, ['chore: 1\n\nBREAKING CHANGE: foo\nfoobar'])).toEqual(null)
      expect(calcBumpType(false, ['chore: 1', 'fix: 1\n\nBREAKING CHANGE: foo'])).toEqual('major')
    })
  })
})

describe(parse.name, () => {
  // prettier-ignore
  it.each([
    // type, description
    ['t: d', { type: 't', description: 'd', body: null, scope: null, footers: [], breakingChange: null , completesInitialDevelopment: false, typeKind: 'other' }],
    ['tt: dd', { type: 'tt', description: 'dd', body: null, scope: null, footers: [], breakingChange: null , completesInitialDevelopment: false, typeKind: 'other' }],
    // scope
    ['t(s): d', { type: 't', description: 'd', body: null, scope: 's', footers: [], breakingChange: null , completesInitialDevelopment: false, typeKind: 'other' }],
    ['t(ss): d', { type: 't', description: 'd', body: null, scope: 'ss', footers: [], breakingChange: null , completesInitialDevelopment: false, typeKind: 'other' }],
    // body
    ['t: d\n\nb', { type: 't', description: 'd', body: 'b', scope: null, footers: [], breakingChange: null , completesInitialDevelopment: false, typeKind: 'other' }],
    ['t: d\n\nbb\n1\n23', { type: 't', description: 'd', body: 'bb\n1\n23', scope: null, footers: [], breakingChange: null , completesInitialDevelopment: false, typeKind: 'other' }],
    ['t: d\n\nb\n\nb f:1', { type: 't', description: 'd', body: 'b\n\nb f:1', scope: null, footers: [], breakingChange: null , completesInitialDevelopment: false, typeKind: 'other' }],
    // footers
    ['t: d\n\nt1:1', { type: 't', description: 'd', body: null, scope: null, footers: [{ type:'t1', body:'1' }], breakingChange: null , completesInitialDevelopment: false, typeKind: 'other' }],
    ['t: d\n\nt1:\n\n1', { type: 't', description: 'd', body: null, scope: null, footers: [{ type:'t1', body:'1' }], breakingChange: null , completesInitialDevelopment: false, typeKind: 'other' }],
    ['t: d\n\nb\n\nt1:1', { type: 't', description: 'd', body: 'b', scope: null, footers: [{ type:'t1', body:'1' }], breakingChange: null , completesInitialDevelopment: false, typeKind: 'other' }],
    ['t: d\n\nt1-1_1:1', { type: 't', description: 'd', body: null, scope: null, footers: [{ type:'t1-1_1', body:'1' }], breakingChange: null , completesInitialDevelopment: false, typeKind: 'other' }],
    ['t: d\n\nb\n\nt1:b1\n\nt2:b2', { type: 't', description: 'd', body: 'b', scope: null, footers: [{ type:'t1', body:'b1' }, { type: 't2', body: 'b2' }], breakingChange: null , completesInitialDevelopment: false, typeKind: 'other' }],
    ['t: d\n\nb\n\nt1:b1\n\nb1\n\nt2-2:b2\n\nb2', { type: 't', description: 'd', body: 'b', scope: null, footers: [{ type:'t1', body:'b1\n\nb1' }, { type: 't2-2', body: 'b2\n\nb2' }], breakingChange: null , completesInitialDevelopment: false, typeKind: 'other' }],
    // whitespace is trimmed
    ['t: d ', { type: 't', description: 'd', body: null, scope: null, footers: [], breakingChange: null , completesInitialDevelopment: false, typeKind: 'other' }],
    [' t : d ', { type: 't', description: 'd', body: null, scope: null, footers: [], breakingChange: null , completesInitialDevelopment: false, typeKind: 'other' }],
    [' t ( s ): d ', { type: 't', description: 'd', body: null, scope: 's', footers: [], breakingChange: null , completesInitialDevelopment: false, typeKind: 'other' }],
    ['t: d\n\nb\n\n f  :  1 ', { type: 't', description: 'd', body: 'b', scope: null, footers: [{ type:'f', body:'1' }], breakingChange: null , completesInitialDevelopment: false, typeKind: 'other' }],
    // we allow 0 or many spaces while cc-spec asks for exactly 1
    ['t:d', { type: 't', description: 'd', body: null, scope: null, footers: [], breakingChange: null , completesInitialDevelopment: false, typeKind: 'other' }],
    ['t:  d', { type: 't', description: 'd', body: null, scope: null, footers: [], breakingChange: null , completesInitialDevelopment: false, typeKind: 'other' }],
    // invalids
    ['a', null],
    ['a b', null],
    ['a() b', null],
    ['a(): b', null],
    // spec invalid but we tolerate it: single line feed instead of two
    ['t: d\nb', { type: 't', description: 'd', body: 'b', scope: null, footers: [], breakingChange: null , completesInitialDevelopment: false, typeKind: 'other' }],
    // breaking change
    ['t: d\n\nBREAKING CHANGE: foo', { type: 't', description: 'd', body: null, scope: null, footers: [], breakingChange: 'foo' , completesInitialDevelopment: false, typeKind: 'other' }],
    ['t: d\n\nBREAKING-CHANGE:\n\nfoo\n\nbar ', { type: 't', description: 'd', body: null, scope: null, footers: [], breakingChange: 'foo\n\nbar' , completesInitialDevelopment: false, typeKind: 'other' }],
    ['t: d\n\nb\n\nBREAKING CHANGE: foo', { type: 't', description: 'd', body: 'b', scope: null, footers: [], breakingChange: 'foo' , completesInitialDevelopment: false, typeKind: 'other' }],
    ['t: d\n\nb\n\nBREAKING CHANGE: foo\n\nt1:t1', { type: 't', description: 'd', body: 'b', scope: null, footers: [{ type:'t1', body:'t1' }], breakingChange: 'foo' , completesInitialDevelopment: false, typeKind: 'other' }],
    ['t: d\n\nb\n\nt1:t1\n\nBREAKING CHANGE: foo  ', { type: 't', description: 'd', body: 'b', scope: null, footers: [{ type:'t1', body:'t1' }], breakingChange: 'foo' , completesInitialDevelopment: false, typeKind: 'other' }],
    // completing initial development
    // a spec extension https://github.com/conventional-commits/conventionalcommits.org/pull/214
    ['t: d\n\nCOMPLETES INITIAL DEVELOPMENT', { type: 't', description: 'd', body: null, scope: null, footers: [], breakingChange: null, completesInitialDevelopment: true, typeKind: 'other' }],
    ['t: d\n\nCOMPLETES-INITIAL-DEVELOPMENT', { type: 't', description: 'd', body: null, scope: null, footers: [], breakingChange: null, completesInitialDevelopment: true, typeKind: 'other' }],
    ['t: d\n\nb\n\nCOMPLETES-INITIAL-DEVELOPMENT', { type: 't', description: 'd', body: 'b', scope: null, footers: [], breakingChange: null, completesInitialDevelopment: true, typeKind: 'other' }],
    ['t: d\n\nb\n\nt1:b1\n\nCOMPLETES-INITIAL-DEVELOPMENT\n\nt2:b2', { type: 't', description: 'd', body: 'b', scope: null, footers: [{ type:'t1', body:'b1' },{ type:'t2', body:'b2' }], breakingChange: null , completesInitialDevelopment: true, typeKind: 'other' }],
    ['t: d\n\nb\n\nCOMPLETES-INITIAL-DEVELOPMENT\n\nBREAKING CHANGE:\n\nfoo', { type: 't', description: 'd', body: 'b', scope: null, footers: [], breakingChange: 'foo', completesInitialDevelopment: true, typeKind: 'other' }],
    // not completing initial development
    ['t: d\n\n  COMPLETES INITIAL DEVELOPMENT', { type: 't', description: 'd', body: 'COMPLETES INITIAL DEVELOPMENT', scope: null, footers: [], breakingChange: null, completesInitialDevelopment: false, typeKind: 'other' }],
    ['t: d\n\n"COMPLETES INITIAL DEVELOPMENT"', { type: 't', description: 'd', body: '"COMPLETES INITIAL DEVELOPMENT"', scope: null, footers: [], breakingChange: null, completesInitialDevelopment: false, typeKind: 'other' }],
    // windows newlines
    ['t: d\r\n\r\nt1:b1', { type: 't', description: 'd', body: null, scope: null, footers: [{ type:'t1', body:'b1' }], breakingChange: null , completesInitialDevelopment: false, typeKind: 'other' }],
    ['t: d\r\n\r\nt1:\r\n\r\nb1', { type: 't', description: 'd', body: null, scope: null, footers: [{ type:'t1', body:'b1' }], breakingChange: null , completesInitialDevelopment: false, typeKind: 'other' }],
    // todo these tests show that we do not accurately retain windows newlines
    ['t: d\r\n\r\nt1:\r\n\r\nb1\r\n\r\nb1', { type: 't', description: 'd', body: null, scope: null, footers: [{ type:'t1', body:'b1\n\nb1' }], breakingChange: null , completesInitialDevelopment: false, typeKind: 'other' }],
    ['t: d\r\n\r\nt1:\r\n\r\nb1\r\n\r\n\r\nb1', { type: 't', description: 'd', body: null, scope: null, footers: [{ type:'t1', body:'b1\n\n\r\nb1' }], breakingChange: null , completesInitialDevelopment: false, typeKind: 'other' }],
  ])(
    '%s',
    (given, expected) => {
      expect(parse(given)).toEqual(expected)
    }
  )
})
