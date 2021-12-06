import { RRegex } from '../lib/commonjs'

describe(`RRegex`, () => {
  test(`toString`, () => {
    expect(new RRegex('a').toString()).toBe('a')
  })

  test(`isMatch`, () => {
    const regex = new RRegex('a')
    expect(regex.isMatch('abc')).toBe(true)
    expect(regex.isMatch('def')).toBe(false)

    const text = 'I categorically deny having triskaidekaphobia.';
    const re = new RRegex('\\b\\w{13}\\b')
    expect(re.isMatch(text)).toEqual(true);
  })

  test(`isMatchAt`, () => {
    const regex = new RRegex('a')
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

    const text = 'I categorically deny having triskaidekaphobia.'
    const re = new RRegex('\\b\\w{13}\\b')
    expect(re.isMatchAt(text, 1)).toBe(true)
    expect(re.isMatchAt(text, 5)).toBe(false)
  })

  test(`find`, () => {
    const regex = new RRegex('a')
    expect(regex.find('abc')).toEqual({ value: 'a', start: 0, end: 1 })
    expect(regex.find('def')).toBeUndefined()

    const text = 'I categorically deny having triskaidekaphobia.'
    const re = new RRegex('\\b\\w{13}\\b')
    expect(re.find(text)).toEqual({
      value: 'categorically',
      start: 2,
      end: 15,
    })
  })

  test(`findAt`, () => {
    const regex = new RRegex('a')
    expect(regex.find('abc')).toEqual({ value: 'a', start: 0, end: 1 })
    expect(regex.findAt('abc', 1)).toBeUndefined()
    expect(regex.findAt('abc', 100)).toBeUndefined()
    expect(regex.find('def')).toBeUndefined()

    const text = 'I categorically deny having triskaidekaphobia.'
    const re = new RRegex('\\b\\w{13}\\b')
    expect(re.findAt(text, 1)).toEqual({
      value: 'categorically',
      start: 2,
      end: 15,
    })

    expect(re.findAt(text, 5)).toEqual(undefined)
  })

  test(`findAll`, () => {
    const regex = new RRegex('a')
    expect(regex.findAll('abcabcabc')).toEqual([
      { value: 'a', start: 0, end: 1 },
      { value: 'a', start: 3, end: 4 },
      { value: 'a', start: 6, end: 7 },
    ])
    expect(regex.findAll('def')).toEqual([])

    const text = 'Retroactively relinquishing remunerations is reprehensible.'
    const re = new RRegex('\\b\\w{13}\\b')
    expect(re.findAll(text)).toEqual([
      {
        "end": 13,
        "start": 0,
        "value": "Retroactively",
      },
      {
        "end": 27,
        "start": 14,
        "value": "relinquishing",
      },
      {
        "end": 41,
        "start": 28,
        "value": "remunerations",
      },
      {
        "end": 58,
        "start": 45,
        "value": "reprehensible",
      },
    ])
  })

  test(`replace`, () => {
    const regex = new RRegex('a')
    expect(regex.replace('abcabcabc', 'z')).toEqual('zbcabcabc')
    expect(regex.replace('defdefdef', 'z')).toEqual('defdefdef')

    {
      const re = new RRegex('[^01]+')
      expect(re.replace('1078910', '')).toBe('1010')
    }

    {
      const re = new RRegex('(?P<last>[^,\\s]+),\\s+(?P<first>\\S+)')
      const result = re.replace('Springsteen, Bruce', '$first $last')
      expect(result).toEqual('Bruce Springsteen')
    }

    {
      const re = new RRegex('(?P<first>\\w+)\\s+(?P<second>\\w+)')
      const result = re.replace("deep fried", "${first}_$second");
      expect(result).toEqual('deep_fried')
    }
  })

  test(`replaceAll`, () => {
    const regex = new RRegex('a')
    expect(regex.replaceAll('abcabcabc', 'z')).toEqual('zbczbczbc')
    expect(regex.replaceAll('defdefdef', 'z')).toEqual('defdefdef')
  })

  test(`replacen`, () => {
    const regex = new RRegex('a')
    expect(regex.replacen('abcabcabc', 2, 'z')).toEqual('zbczbcabc')
    expect(regex.replacen('defdefdef', 2, 'z')).toEqual('defdefdef')
  })

  test(`split`, () => {
    const regex = new RRegex('a')
    expect(regex.split('abcabcabc')).toEqual(['', 'bc', 'bc', 'bc'])
    expect(regex.split('defdefdef')).toEqual(['defdefdef'])

    const re = new RRegex('[ \\t]+')
    const fields = re.split('a b \t  c\td    e');
    expect(fields).toEqual(['a', 'b', 'c', 'd', 'e']);
  })

  test(`splitn`, () => {
    const regex = new RRegex('a')
    expect(regex.splitn('abcabcabc', 0)).toEqual([])
    expect(regex.splitn('abcabcabc', 1)).toEqual(['abcabcabc'])
    expect(regex.splitn('abcabcabc', 2)).toEqual(['', 'bcabcabc'])
    expect(regex.splitn('abcabcabc', 3)).toEqual(['', 'bc', 'bcabc'])
    expect(regex.splitn('abcabcabc', 4)).toEqual(['', 'bc', 'bc', 'bc'])
    expect(regex.splitn('abcabcabc', 5)).toEqual(['', 'bc', 'bc', 'bc'])
    expect(regex.splitn('defdefdef', 2)).toEqual(['defdefdef'])

    const re = new RRegex('\\W+')
    const fields = re.splitn('Hey! How are you?', 3)
    expect(fields).toEqual(['Hey', 'How', 'are you?'])
  })

  test(`shortestMatch`, () => {
    const regex = new RRegex('a')
    expect(regex.shortestMatch('abcabcabc')).toEqual(1)
    expect(regex.shortestMatch('bcabcabc')).toEqual(3)
    expect(regex.shortestMatch('cabcabc')).toEqual(2)
    expect(regex.shortestMatch('defdefdef')).toBeUndefined()

    const text = 'aaaaa'
    const pos = new RRegex('a+')
    expect(pos.shortestMatch(text)).toBe(1)
  })

  test(`shortestMatchAt`, () => {
    const regex = new RRegex('a')
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
    const regex = new RRegex('a')
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
