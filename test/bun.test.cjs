import { deepEqual, throws } from "node:assert"
import { test } from "bun:test"
import { RRegex, RRegexSet } from '../lib/commonjs.cjs'

test(`RRegex::toString`, () => {
  deepEqual(new RRegex('a').toString(), 'a')
})

test(`RRegex::isMatch`, () => {
  const regex = new RRegex('a')
  deepEqual(regex.isMatch('abc'), true)
  deepEqual(regex.isMatch('def'), false)

  const text = 'I categorically deny having triskaidekaphobia.';
  const re = new RRegex('\\b\\w{13}\\b')
  deepEqual(re.isMatch(text), true);
})

test(`RRegex::isMatchAt`, () => {
  const regex = new RRegex('a')
  deepEqual(regex.isMatchAt('ab', 0), true)
  deepEqual(regex.isMatchAt('ab', 1), false)
  deepEqual(regex.isMatchAt('ab', 1), false)
  deepEqual(regex.isMatchAt('ab', 100), false)
  deepEqual(regex.isMatchAt('aba', 0), true)
  deepEqual(regex.isMatchAt('aba', 1), true)
  deepEqual(regex.isMatchAt('aba', 2), true)
  deepEqual(regex.isMatchAt('aba', 3), false)
  deepEqual(regex.isMatchAt('aba', 100), false)
  deepEqual(regex.isMatchAt('def', 0), false)

  const text = 'I categorically deny having triskaidekaphobia.'
  const re = new RRegex('\\b\\w{13}\\b')
  deepEqual(re.isMatchAt(text, 1), true)
  deepEqual(re.isMatchAt(text, 5), false)
})

test(`RRegex::find`, () => {
  const regex = new RRegex('a')
  deepEqual(regex.find('abc'), { value: 'a', start: 0, end: 1 })
  deepEqual(regex.find('def'), undefined)

  const text = 'I categorically deny having triskaidekaphobia.'
  const re = new RRegex('\\b\\w{13}\\b')
  deepEqual(re.find(text), {
    value: 'categorically',
    start: 2,
    end: 15,
  })
})

test(`RRegex::findAt`, () => {
  const regex = new RRegex('a')
  deepEqual(regex.find('abc'), { value: 'a', start: 0, end: 1 })
  deepEqual(regex.findAt('abc', 1), undefined)
  deepEqual(regex.findAt('abc', 100), undefined)
  deepEqual(regex.find('def'), undefined)

  const text = 'I categorically deny having triskaidekaphobia.'
  const re = new RRegex('\\b\\w{13}\\b')
  deepEqual(re.findAt(text, 1), {
    value: 'categorically',
    start: 2,
    end: 15,
  })

  deepEqual(re.findAt(text, 5), undefined)
})

test(`RRegex::findAll`, () => {
  const regex = new RRegex('a')
  deepEqual(regex.findAll('abcabcabc'), [
    { value: 'a', start: 0, end: 1 },
    { value: 'a', start: 3, end: 4 },
    { value: 'a', start: 6, end: 7 },
  ])
  deepEqual(regex.findAll('def'), [])

  const text = 'Retroactively relinquishing remunerations is reprehensible.'
  const re = new RRegex('\\b\\w{13}\\b')
  deepEqual(re.findAll(text), [
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

test(`RRegex::replace`, () => {
  const regex = new RRegex('a')
  deepEqual(regex.replace('abcabcabc', 'z'), 'zbcabcabc')
  deepEqual(regex.replace('defdefdef', 'z'), 'defdefdef')

  {
    const re = new RRegex('[^01]+')
    deepEqual(re.replace('1078910', ''), '1010')
  }

  {
    const re = new RRegex('(?P<last>[^,\\s]+),\\s+(?P<first>\\S+)')
    const result = re.replace('Springsteen, Bruce', '$first $last')
    deepEqual(result, 'Bruce Springsteen')
  }

  {
    const re = new RRegex('(?P<first>\\w+)\\s+(?P<second>\\w+)')
    const result = re.replace("deep fried", "${first}_$second");
    deepEqual(result, 'deep_fried')
  }
})

test(`RRegex::replaceAll`, () => {
  const regex = new RRegex('a')
  deepEqual(regex.replaceAll('abcabcabc', 'z'), 'zbczbczbc')
  deepEqual(regex.replaceAll('defdefdef', 'z'), 'defdefdef')
})

test(`RRegex::replacen`, () => {
  const regex = new RRegex('a')
  deepEqual(regex.replacen('abcabcabc', 2, 'z'), 'zbczbcabc')
  deepEqual(regex.replacen('defdefdef', 2, 'z'), 'defdefdef')
})

test(`RRegex::split`, () => {
  const regex = new RRegex('a')
  deepEqual(regex.split('abcabcabc'), ['', 'bc', 'bc', 'bc'])
  deepEqual(regex.split('defdefdef'), ['defdefdef'])

  const re = new RRegex('[ \\t]+')
  const fields = re.split('a b \t  c\td    e');
  deepEqual(fields, ['a', 'b', 'c', 'd', 'e']);
})

test(`RRegex::splitn`, () => {
  const regex = new RRegex(',')
  deepEqual(regex.splitn('a,b,c', 0), [])
  deepEqual(regex.splitn('a,b,c', 1), ['a,b,c'])
  deepEqual(regex.splitn('a,b,c', 2), ['a', 'b,c'])
  deepEqual(regex.splitn('a,b,c', 3), ['a', 'b', 'c'])
  deepEqual(regex.splitn('a,b,c', 4), ['a', 'b', 'c'])
  deepEqual(regex.splitn('a,b,c', 5), ['a', 'b', 'c'])
  deepEqual(regex.splitn('abc', 0), [])
  deepEqual(regex.splitn('abc', 1), ['abc'])
  deepEqual(regex.splitn('abc', 2), ['abc'])
  deepEqual(regex.splitn('abc', 3), ['abc'])

  const re = new RRegex('\\W+')
  const fields = re.splitn('Hey! How are you?', 3)
  deepEqual(fields, ['Hey', 'How', 'are you?'])
})

test(`RRegex::shortestMatch`, () => {
  const regex = new RRegex('a')
  deepEqual(regex.shortestMatch('abcabcabc'), 1)
  deepEqual(regex.shortestMatch('bcabcabc'), 3)
  deepEqual(regex.shortestMatch('cabcabc'), 2)
  deepEqual(regex.shortestMatch('defdefdef'), undefined)

  const text = 'aaaaa'
  const pos = new RRegex('a+')
  deepEqual(pos.shortestMatch(text), 1)
})

test(`RRegex::shortestMatchAt`, () => {
  const regex = new RRegex('a')
  deepEqual(regex.shortestMatchAt('abcabca', 0), 1)
  deepEqual(regex.shortestMatchAt('abcabca', 1), 4)
  deepEqual(regex.shortestMatchAt('abcabca', 2), 4)
  deepEqual(regex.shortestMatchAt('abcabca', 3), 4)
  deepEqual(regex.shortestMatchAt('abcabca', 4), 7)
  deepEqual(regex.shortestMatchAt('abcabca', 5), 7)
  deepEqual(regex.shortestMatchAt('abcabca', 6), 7)
  deepEqual(regex.shortestMatchAt('abcabca', 7), undefined)
  deepEqual(regex.shortestMatchAt('abcabca', 100), undefined)
  deepEqual(regex.shortestMatchAt('defdefdef', 0), undefined)
  deepEqual(regex.shortestMatchAt('defdefdef', 1), undefined)
  deepEqual(regex.shortestMatchAt('defdefdef', 2), undefined)
})

test('regex_syntax::hir::Empty', () => {
  const regex = new RRegex('')
  deepEqual(regex.syntax(), {
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
  const regex = new RRegex('a')
  deepEqual(regex.syntax(), {
    "@name": "regex_syntax::hir::Hir",
    "@type": "struct",
    "kind": {
      "@name": "regex_syntax::hir::HirKind",
      "@type": "enum",
      "@variant": "Literal",
      "@values": [{
        "@name": "regex_syntax::hir::Literal",
        "@type": "enum",
        "@variant": "Unicode",
        "@values": ["a"]
      }]
    }
  })
})



test('regex_syntax -> Empty character class', () => {
  throws(() => new RRegex('[a&&b]'), /empty character classes are not allowed/)
})

test(`RRegexSet::isMatch`, () => {
  let set = new RRegexSet(['\\w+', '\\d+'])
  deepEqual(set.isMatch('foo'), true)
  deepEqual(set.isMatch('☃'), false)
})

test(`RRegexSet::matches`, () => {
  let set = new RRegexSet([
    '\\w+',
    '\\d+',
    '\\pL+',
    'foo',
    'bar',
    'barfoo',
    'foobar',
  ])
  deepEqual(set.matches('foobar'), [0, 2, 3, 4, 6])
})

test("Match -> UTF-8 (äöü)", () => {
  const re = new RRegex("ä")
  const m = re.find("äöü") // { start: 0, end: 2 }
  deepEqual("äöü".slice(m.start, m.end), "äö")

  const buff = new TextEncoder().encode("äöü")
  const slice = buff.slice(m.start, m.end)
  deepEqual(new TextDecoder().decode(slice), "ä")
})

test("Match -> Greek (αβγδ)", () => {
  const re = new RRegex("\\p{Greek}+");
  const hay = "Greek: αβγδ";
  const m = re.find(hay);
  deepEqual(m.start, 7);
  deepEqual(m.end, 15);
  deepEqual(m.value, "αβγδ");
})
