import { RRegExp } from '../lib/commonjs'

describe(`RRegExp`, () => {
  test(`toString`, () => {
    expect(new RRegExp('a').toString()).toBe('a')
  })

  test(`isMatch`, () => {
    const regex = new RRegExp('a')
    expect(regex.isMatch('abc')).toBe(true)
    expect(regex.isMatch('def')).toBe(false)
  })

  test(`isMatchAt`, () => {
    const regex = new RRegExp('a')
    expect(regex.isMatchAt('ab', 0)).toBe(true)
    expect(regex.isMatchAt('ab', 1)).toBe(false)
    expect(regex.isMatchAt('ab', 1)).toBe(false)
    expect(regex.isMatchAt('ab', 100)).toBe(false)
    expect(regex.isMatchAt('aba', 0)).toBe(true)
    expect(regex.isMatchAt('aba', 1)).toBe(true)
    expect(regex.isMatchAt('aba', 2)).toBe(true)
    expect(regex.isMatchAt('aba', 3)).toBe(false)
    expect(regex.isMatchAt('aba', 100)).toBe(false)
    expect(regex.isMatchAt('def', 0)).toBe(false)
  })

  test(`find`, () => {
    const regex = new RRegExp('a')
    expect(regex.find('abc')).toEqual({ value: 'a', start: 0, end: 1 })
    expect(regex.find('def')).toBeUndefined()
  })

  test(`findAt`, () => {
    const regex = new RRegExp('a')
    expect(regex.find('abc')).toEqual({ value: 'a', start: 0, end: 1 })
    expect(regex.findAt('abc', 1)).toBeUndefined()
    expect(regex.findAt('abc', 100)).toBeUndefined()
    expect(regex.find('def')).toBeUndefined()
  })

  test(`findAll`, () => {
    const regex = new RRegExp('a')
    expect(regex.findAll('abcabcabc')).toEqual([
      { value: 'a', start: 0, end: 1 },
      { value: 'a', start: 3, end: 4 },
      { value: 'a', start: 6, end: 7 },
    ])
    expect(regex.findAll('def')).toEqual([])
  })

  test(`replace`, () => {
    const regex = new RRegExp('a')
    expect(regex.replace('abcabcabc', 'z')).toEqual('zbcabcabc')
    expect(regex.replace('defdefdef', 'z')).toEqual('defdefdef')
  })

  test(`replaceAll`, () => {
    const regex = new RRegExp('a')
    expect(regex.replaceAll('abcabcabc', 'z')).toEqual('zbczbczbc')
    expect(regex.replaceAll('defdefdef', 'z')).toEqual('defdefdef')
  })

  test(`replacen`, () => {
    const regex = new RRegExp('a')
    expect(regex.replacen('abcabcabc', 2, 'z')).toEqual('zbczbcabc')
    expect(regex.replacen('defdefdef', 2, 'z')).toEqual('defdefdef')
  })

  test(`split`, () => {
    const regex = new RRegExp('a')
    expect(regex.split('abcabcabc')).toEqual(['', 'bc', 'bc', 'bc'])
    expect(regex.split('defdefdef')).toEqual(['defdefdef'])
  })

  test(`splitn`, () => {
    const regex = new RRegExp('a')
    expect(regex.splitn('abcabcabc', 0)).toEqual([])
    expect(regex.splitn('abcabcabc', 1)).toEqual(['abcabcabc'])
    expect(regex.splitn('abcabcabc', 2)).toEqual(['', 'bcabcabc'])
    expect(regex.splitn('abcabcabc', 3)).toEqual(['', 'bc', 'bcabc'])
    expect(regex.splitn('abcabcabc', 4)).toEqual(['', 'bc', 'bc', 'bc'])
    expect(regex.splitn('abcabcabc', 5)).toEqual(['', 'bc', 'bc', 'bc'])
    expect(regex.splitn('defdefdef', 2)).toEqual(['defdefdef'])
  })

  test(`shortestMatch`, () => {
    const regex = new RRegExp('a')
    expect(regex.shortestMatch('abcabcabc')).toEqual(1)
    expect(regex.shortestMatch('bcabcabc')).toEqual(3)
    expect(regex.shortestMatch('cabcabc')).toEqual(2)
    expect(regex.shortestMatch('defdefdef')).toBeUndefined()
  })

  test(`shortestMatchAt`, () => {
    const regex = new RRegExp('a')
    expect(regex.shortestMatchAt('abcabca', 0)).toEqual(1)
    expect(regex.shortestMatchAt('abcabca', 1)).toEqual(4)
    expect(regex.shortestMatchAt('abcabca', 2)).toEqual(4)
    expect(regex.shortestMatchAt('abcabca', 3)).toEqual(4)
    expect(regex.shortestMatchAt('abcabca', 4)).toEqual(7)
    expect(regex.shortestMatchAt('abcabca', 5)).toEqual(7)
    expect(regex.shortestMatchAt('abcabca', 6)).toEqual(7)
    expect(regex.shortestMatchAt('abcabca', 7)).toBeUndefined()
    expect(regex.shortestMatchAt('abcabca', 100)).toBeUndefined()
    expect(regex.shortestMatchAt('defdefdef', 0)).toBeUndefined()
    expect(regex.shortestMatchAt('defdefdef', 1)).toBeUndefined()
    expect(regex.shortestMatchAt('defdefdef', 2)).toBeUndefined()
  })

  test(`syntax`, () => {
    const regex = new RRegExp('a')
    expect(regex.syntax()).toEqual({
      "@name": "regex_syntax::hir::Hir",
      "@type": "struct",
      "kind": {
        "@name": "regex_syntax::hir::HirKind",
        "@type": "enum",
        "@variant": "Literal",
        "value": {
          "@name": "regex_syntax::hir::Literal",
          "@type": "enum",
          "@variant": "Unicode",
          "value": "a"
        }
      }
    })
  })
})
