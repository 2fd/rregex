import { RRegex, RRegexSet } from '../lib/commonjs'

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

  test(`capturelength`, () => {
    const re1 = new RRegex("(?P<y>\\d{4})-(?P<m>\\d{2})-(?P<d>\\d{2})")
    expect(re1.captureLength()).toEqual(4)

    const re2 = new RRegex("foo")
    expect(re2.captureLength()).toEqual(1)

    const re3 = new RRegex("(foo)")
    expect(re3.captureLength()).toEqual(2)

    const re4 = new RRegex("(?<a>.(?<b>.))(.)(?:.)(?<c>.)")
    expect(re4.captureLength()).toEqual(5)

    const re5 = new RRegex("[a&&b]")
    expect(re5.captureLength()).toEqual(1)
  })

  test(`captureNames`, () => {
    const regex = new RRegex('(?P<y>\\d{4})-(?P<m>\\d{2})-(?P<d>\\d{2})')
    expect(regex.captureNames()).toEqual([
      "y",
      "m",
      "d",
    ])
  })

  test(`captures`, () => {
    const regex = new RRegex('(?P<y>\\d{4})-(?P<m>\\d{2})-(?P<d>\\d{2})')
    expect(regex.captures('')).toEqual(undefined)
    expect(regex.captures('2012-03-14')).toEqual({
      get: [
        { value: '2012-03-14', start: 0, end: 10 },
        { value: '2012', start: 0, end: 4 },
        { value: '03', start: 5, end: 7 },
        { value: '14', start: 8, end: 10 },
      ],
      name: {
        y: { value: '2012', start: 0, end: 4 },
        m: { value: '03', start: 5, end: 7 },
        d: { value: '14', start: 8, end: 10 },
      }
    })
  })

  test(`capturesAll`, () => {
    const regex = new RRegex('(?P<y>\\d{4})-(?P<m>\\d{2})-(?P<d>\\d{2})')
    expect(regex.capturesAll('')).toEqual([])
    expect(regex.capturesAll('2012-03-14')).toEqual([{
      get: [
        { value: '2012-03-14', start: 0, end: 10 },
        { value: '2012', start: 0, end: 4 },
        { value: '03', start: 5, end: 7 },
        { value: '14', start: 8, end: 10 },
      ],
      name: {
        y: { value: '2012', start: 0, end: 4 },
        m: { value: '03', start: 5, end: 7 },
        d: { value: '14', start: 8, end: 10 },
      }
    }])

    expect(regex.capturesAll('2012-03-14, 2013-01-01 and 2014-07-05')).toEqual([
      {
        get: [
          { value: '2012-03-14', start: 0, end: 10 },
          { value: '2012', start: 0, end: 4 },
          { value: '03', start: 5, end: 7 },
          { value: '14', start: 8, end: 10 },
        ],
        name: {
          y: { value: '2012', start: 0, end: 4 },
          m: { value: '03', start: 5, end: 7 },
          d: { value: '14', start: 8, end: 10 },
        }
      },
      {
        get: [
          { value: '2013-01-01', start: 12, end: 22 },
          { value: '2013', start: 12, end: 16 },
          { value: '01', start: 17, end: 19 },
          { value: '01', start: 20, end: 22 },
        ],
        name: {
          y: { value: '2013', start: 12, end: 16 },
          m: { value: '01', start: 17, end: 19 },
          d: { value: '01', start: 20, end: 22 },
        }
      },
      {
        get: [
          { value: '2014-07-05', start: 27, end: 37 },
          { value: '2014', start: 27, end: 31 },
          { value: '07', start: 32, end: 34 },
          { value: '05', start: 35, end: 37 },
        ],
        name: {
          y: { value: '2014', start: 27, end: 31 },
          m: { value: '07', start: 32, end: 34 },
          d: { value: '05', start: 35, end: 37 },
        }
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
    const regex = new RRegex(',')
    expect(regex.splitn('a,b,c', 0)).toEqual([])
    expect(regex.splitn('a,b,c', 1)).toEqual(['a,b,c'])
    expect(regex.splitn('a,b,c', 2)).toEqual(['a', 'b,c'])
    expect(regex.splitn('a,b,c', 3)).toEqual(['a', 'b', 'c'])
    expect(regex.splitn('a,b,c', 4)).toEqual(['a', 'b', 'c'])
    expect(regex.splitn('a,b,c', 5)).toEqual(['a', 'b', 'c'])
    expect(regex.splitn('abc', 0)).toEqual([])
    expect(regex.splitn('abc', 1)).toEqual(['abc'])
    expect(regex.splitn('abc', 2)).toEqual(['abc'])
    expect(regex.splitn('abc', 3)).toEqual(['abc'])

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

  describe(`syntax`, () => {
    test('regex_syntax::hir::Empty', () => {
      const regex = new RRegex('')
      expect(regex.syntax()).toEqual({
        "@name": "regex_syntax::hir::Hir",
        "@type": "struct",
        "kind": {
          "@name": "regex_syntax::hir::HirKind",
          "@type": "enum",
          "@variant": "Empty",
        }
      })
    })

    test('regex_syntax::hir::Literal', () => {
      const regex = new RRegex('abc')
      expect(regex.syntax()).toEqual({
        "@name": "regex_syntax::hir::Hir",
        "@type": "struct",
        "kind": {
          "@name": "regex_syntax::hir::HirKind",
          "@type": "enum",
          "@variant": "Literal",
          "@values": [{
            "@name": "regex_syntax::hir::Literal",
            "@type": "struct",
            "@values": [
              new Uint8Array([
                "a".charCodeAt(0),
                "b".charCodeAt(0),
                "c".charCodeAt(0),
              ])
            ]
          }]
        }
      })
    })

    test('regex_syntax::hir::Class', () => {
      const unicode = new RRegex('\\d')
      expect(unicode.syntax()).toEqual(
        {
          "@name": "regex_syntax::hir::Hir",
          "@type": "struct",
          "kind": {
            "@name": "regex_syntax::hir::HirKind",
            "@type": "enum",
            "@values": [
              {
                "@name": "regex_syntax::hir::Class",
                "@type": "enum",
                "@values": [
                  {
                    "@name": "regex_syntax::hir::ClassUnicode",
                    "@type": "struct",
                    "ranges": [
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "9",
                        "len": 10,
                        "start": "0",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "٩",
                        "len": 10,
                        "start": "٠",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "۹",
                        "len": 10,
                        "start": "۰",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "߉",
                        "len": 10,
                        "start": "߀",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "९",
                        "len": 10,
                        "start": "०",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "৯",
                        "len": 10,
                        "start": "০",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "੯",
                        "len": 10,
                        "start": "੦",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "૯",
                        "len": 10,
                        "start": "૦",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "୯",
                        "len": 10,
                        "start": "୦",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "௯",
                        "len": 10,
                        "start": "௦",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "౯",
                        "len": 10,
                        "start": "౦",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "೯",
                        "len": 10,
                        "start": "೦",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "൯",
                        "len": 10,
                        "start": "൦",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "෯",
                        "len": 10,
                        "start": "෦",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "๙",
                        "len": 10,
                        "start": "๐",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "໙",
                        "len": 10,
                        "start": "໐",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "༩",
                        "len": 10,
                        "start": "༠",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "၉",
                        "len": 10,
                        "start": "၀",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "႙",
                        "len": 10,
                        "start": "႐",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "៩",
                        "len": 10,
                        "start": "០",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "᠙",
                        "len": 10,
                        "start": "᠐",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "᥏",
                        "len": 10,
                        "start": "᥆",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "᧙",
                        "len": 10,
                        "start": "᧐",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "᪉",
                        "len": 10,
                        "start": "᪀",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "᪙",
                        "len": 10,
                        "start": "᪐",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "᭙",
                        "len": 10,
                        "start": "᭐",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "᮹",
                        "len": 10,
                        "start": "᮰",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "᱉",
                        "len": 10,
                        "start": "᱀",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "᱙",
                        "len": 10,
                        "start": "᱐",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "꘩",
                        "len": 10,
                        "start": "꘠",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "꣙",
                        "len": 10,
                        "start": "꣐",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "꤉",
                        "len": 10,
                        "start": "꤀",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "꧙",
                        "len": 10,
                        "start": "꧐",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "꧹",
                        "len": 10,
                        "start": "꧰",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "꩙",
                        "len": 10,
                        "start": "꩐",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "꯹",
                        "len": 10,
                        "start": "꯰",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "９",
                        "len": 10,
                        "start": "０",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "𐒩",
                        "len": 10,
                        "start": "𐒠",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "𐴹",
                        "len": 10,
                        "start": "𐴰",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "𑁯",
                        "len": 10,
                        "start": "𑁦",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "𑃹",
                        "len": 10,
                        "start": "𑃰",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "𑄿",
                        "len": 10,
                        "start": "𑄶",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "𑇙",
                        "len": 10,
                        "start": "𑇐",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "𑋹",
                        "len": 10,
                        "start": "𑋰",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "𑑙",
                        "len": 10,
                        "start": "𑑐",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "𑓙",
                        "len": 10,
                        "start": "𑓐",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "𑙙",
                        "len": 10,
                        "start": "𑙐",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "𑛉",
                        "len": 10,
                        "start": "𑛀",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "𑜹",
                        "len": 10,
                        "start": "𑜰",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "𑣩",
                        "len": 10,
                        "start": "𑣠",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "𑥙",
                        "len": 10,
                        "start": "𑥐",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "𑱙",
                        "len": 10,
                        "start": "𑱐",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "𑵙",
                        "len": 10,
                        "start": "𑵐",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "𑶩",
                        "len": 10,
                        "start": "𑶠",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "𑽙",
                        "len": 10,
                        "start": "𑽐",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "𖩩",
                        "len": 10,
                        "start": "𖩠",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "𖫉",
                        "len": 10,
                        "start": "𖫀",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "𖭙",
                        "len": 10,
                        "start": "𖭐",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "𝟿",
                        "len": 50,
                        "start": "𝟎",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "𞅉",
                        "len": 10,
                        "start": "𞅀",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "𞋹",
                        "len": 10,
                        "start": "𞋰",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "𞓹",
                        "len": 10,
                        "start": "𞓰",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "𞥙",
                        "len": 10,
                        "start": "𞥐",
                      },
                      {
                        "@name": "regex_syntax::hir::ClassUnicodeRange",
                        "@type": "struct",
                        "end": "🯹",
                        "len": 10,
                        "start": "🯰",
                      },
                    ],
                  },
                ],
                "@variant": "Unicode",
              },
            ],
            "@variant": "Class",
          },
        }
      )

      const bytes = new RRegex('(?-u)\\d')
      expect(bytes.syntax()).toEqual({
        "@name": "regex_syntax::hir::Hir",
        "@type": "struct",
        "kind": {
          "@name": "regex_syntax::hir::HirKind",
          "@type": "enum",
          "@variant": "Class",
          "@values": [
            {
              "@name": "regex_syntax::hir::Class",
              "@type": "enum",
              "@variant": "Bytes",
              "@values": [
                {
                  "@name": "regex_syntax::hir::ClassBytes",
                  "@type": "struct",
                  "ranges": [
                    {
                      "@name": "regex_syntax::hir::ClassBytesRange",
                      "@type": "struct",
                      "start": 48,
                      "end": 57,
                      "len": 10
                    }
                  ]
                }
              ]
            }
          ]
        }
      })
    })


    test('regex_syntax::hir::Look', () => {
      const regex = new RRegex('^$')
      expect(regex.syntax()).toEqual({
        "@name": "regex_syntax::hir::Hir",
        "@type": "struct",
        "kind": {
          "@name": "regex_syntax::hir::HirKind",
          "@type": "enum",
          "@variant": "Concat",
          "@values": [
            [
              {
                "@name": "regex_syntax::hir::Hir",
                "@type": "struct",
                "kind": {
                  "@name": "regex_syntax::hir::HirKind",
                  "@type": "enum",
                  "@variant": "Look",
                  "@values": [
                    {
                      "@name": "regex_syntax::hir::Look",
                      "@type": "enum",
                      "@variant": "Start",
                    }
                  ]
                }
              },
              {
                "@name": "regex_syntax::hir::Hir",
                "@type": "struct",
                "kind": {
                  "@name": "regex_syntax::hir::HirKind",
                  "@type": "enum",
                  "@variant": "Look",
                  "@values": [
                    {
                      "@name": "regex_syntax::hir::Look",
                      "@type": "enum",
                      "@variant": "End",
                    }
                  ]
                }
              }
            ]
          ]
        }
      })
    })

    test('regex_syntax::hir::Repetition', () => {
      const oneOrMore = new RRegex('a+')
      expect(oneOrMore.syntax()).toEqual({
        "@name": "regex_syntax::hir::Hir",
        "@type": "struct",
        "kind": {
          "@name": "regex_syntax::hir::HirKind",
          "@type": "enum",
          "@variant": "Repetition",
          "@values": [
            {
              "@name": "regex_syntax::hir::Repetition",
              "@type": "struct",
              "greedy": true,
              "min": 1,
              "max": undefined,
              "sub": {
                "@name": "regex_syntax::hir::Hir",
                "@type": "struct",
                "kind": {
                  "@name": "regex_syntax::hir::HirKind",
                  "@type": "enum",
                  "@variant": "Literal",
                  "@values": [{
                    "@name": "regex_syntax::hir::Literal",
                    "@type": "struct",
                    "@values": [
                      new Uint8Array(["a".charCodeAt(0)])
                    ]
                  }]
                }
              }
            }
          ]
        }
      })

      const betweenTwoAndFour = new RRegex('a{2,4}')
      expect(betweenTwoAndFour.syntax()).toEqual({
        "@name": "regex_syntax::hir::Hir",
        "@type": "struct",
        "kind": {
          "@name": "regex_syntax::hir::HirKind",
          "@type": "enum",
          "@variant": "Repetition",
          "@values": [
            {
              "@name": "regex_syntax::hir::Repetition",
              "@type": "struct",
              "greedy": true,
              "min": 2,
              "max": 4,
              "sub": {
                "@name": "regex_syntax::hir::Hir",
                "@type": "struct",
                "kind": {
                  "@name": "regex_syntax::hir::HirKind",
                  "@type": "enum",
                  "@variant": "Literal",
                  "@values": [{
                    "@name": "regex_syntax::hir::Literal",
                    "@type": "struct",
                    "@values": [
                      new Uint8Array(["a".charCodeAt(0)])
                    ]
                  }]
                }
              }
            }
          ]
        }
      })
    })

    test('regex_syntax::hir::Capture', () => {
      const regex = new RRegex('(?<test>a)')
      expect(regex.syntax()).toEqual({
        "@name": "regex_syntax::hir::Hir",
        "@type": "struct",
        "kind": {
          "@name": "regex_syntax::hir::HirKind",
          "@type": "enum",
          "@variant": "Capture",
          "@values": [
            {
              "@name": "regex_syntax::hir::Capture",
              "@type": "struct",
              "index": 1,
              "name": "test",
              "sub": {
                "@name": "regex_syntax::hir::Hir",
                "@type": "struct",
                "kind": {
                  "@name": "regex_syntax::hir::HirKind",
                  "@type": "enum",
                  "@variant": "Literal",
                  "@values": [{
                    "@name": "regex_syntax::hir::Literal",
                    "@type": "struct",
                    "@values": [
                      new Uint8Array(["a".charCodeAt(0)])
                    ]
                  }]
                }
              }
            }
          ]
        }
      })
    })
  })
})


describe(`RRegexSet`, () => {
  test(`isMatch`, () => {
    let set = new RRegexSet(['\\w+', '\\d+'])
    expect(set.isMatch('foo')).toBe(true)
    expect(set.isMatch('☃')).toBe(false)
  })

  test(`matches`, () => {
    let set = new RRegexSet([
      '\\w+',
      '\\d+',
      '\\pL+',
      'foo',
      'bar',
      'barfoo',
      'foobar',
    ])
    expect(set.matches('foobar')).toEqual([0, 2, 3, 4, 6])
  })
})
