import { assertEquals, assertThrows } from "https://deno.land/std@0.221.0/assert/mod.ts";
import { RRegex, RRegexSet } from '../lib/esm.mjs'

Deno.test(`RRegex::toString`, () => {
  assertEquals(new RRegex('a').toString(), 'a')
})

Deno.test(`RRegex::isMatch`, () => {
  const regex = new RRegex('a')
  assertEquals(regex.isMatch('abc'), true)
  assertEquals(regex.isMatch('def'), false)

  const text = 'I categorically deny having triskaidekaphobia.';
  const re = new RRegex('\\b\\w{13}\\b')
  assertEquals(re.isMatch(text), true);
})

Deno.test(`RRegex::isMatchAt`, () => {
  const regex = new RRegex('a')
  assertEquals(regex.isMatchAt('ab', 0), true)
  assertEquals(regex.isMatchAt('ab', 1), false)
  assertEquals(regex.isMatchAt('ab', 1), false)
  assertEquals(regex.isMatchAt('ab', 100), false)
  assertEquals(regex.isMatchAt('aba', 0), true)
  assertEquals(regex.isMatchAt('aba', 1), true)
  assertEquals(regex.isMatchAt('aba', 2), true)
  assertEquals(regex.isMatchAt('aba', 3), false)
  assertEquals(regex.isMatchAt('aba', 100), false)
  assertEquals(regex.isMatchAt('def', 0), false)

  const text = 'I categorically deny having triskaidekaphobia.'
  const re = new RRegex('\\b\\w{13}\\b')
  assertEquals(re.isMatchAt(text, 1), true)
  assertEquals(re.isMatchAt(text, 5), false)
})

Deno.test(`RRegex::find`, () => {
  const regex = new RRegex('a')
  assertEquals(regex.find('abc'), { value: 'a', start: 0, end: 1 })
  assertEquals(regex.find('def'), undefined)

  const text = 'I categorically deny having triskaidekaphobia.'
  const re = new RRegex('\\b\\w{13}\\b')
  assertEquals(re.find(text), {
    value: 'categorically',
    start: 2,
    end: 15,
  })
})

Deno.test(`RRegex::findAt`, () => {
  const regex = new RRegex('a')
  assertEquals(regex.find('abc'), { value: 'a', start: 0, end: 1 })
  assertEquals(regex.findAt('abc', 1), undefined)
  assertEquals(regex.findAt('abc', 100), undefined)
  assertEquals(regex.find('def'), undefined)

  const text = 'I categorically deny having triskaidekaphobia.'
  const re = new RRegex('\\b\\w{13}\\b')
  assertEquals(re.findAt(text, 1), {
    value: 'categorically',
    start: 2,
    end: 15,
  })

  assertEquals(re.findAt(text, 5), undefined)
})

Deno.test(`RRegex::findAll`, () => {
  const regex = new RRegex('a')
  assertEquals(regex.findAll('abcabcabc'), [
    { value: 'a', start: 0, end: 1 },
    { value: 'a', start: 3, end: 4 },
    { value: 'a', start: 6, end: 7 },
  ])
  assertEquals(regex.findAll('def'), [])

  const text = 'Retroactively relinquishing remunerations is reprehensible.'
  const re = new RRegex('\\b\\w{13}\\b')
  assertEquals(re.findAll(text), [
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

Deno.test(`RRegex::replace`, () => {
  const regex = new RRegex('a')
  assertEquals(regex.replace('abcabcabc', 'z'), 'zbcabcabc')
  assertEquals(regex.replace('defdefdef', 'z'), 'defdefdef')

  {
    const re = new RRegex('[^01]+')
    assertEquals(re.replace('1078910', ''), '1010')
  }

  {
    const re = new RRegex('(?P<last>[^,\\s]+),\\s+(?P<first>\\S+)')
    const result = re.replace('Springsteen, Bruce', '$first $last')
    assertEquals(result, 'Bruce Springsteen')
  }

  {
    const re = new RRegex('(?P<first>\\w+)\\s+(?P<second>\\w+)')
    const result = re.replace("deep fried", "${first}_$second");
    assertEquals(result, 'deep_fried')
  }
})

Deno.test(`RRegex::replaceAll`, () => {
  const regex = new RRegex('a')
  assertEquals(regex.replaceAll('abcabcabc', 'z'), 'zbczbczbc')
  assertEquals(regex.replaceAll('defdefdef', 'z'), 'defdefdef')
})

Deno.test(`RRegex::replacen`, () => {
  const regex = new RRegex('a')
  assertEquals(regex.replacen('abcabcabc', 2, 'z'), 'zbczbcabc')
  assertEquals(regex.replacen('defdefdef', 2, 'z'), 'defdefdef')
})

Deno.test(`RRegex::split`, () => {
  const regex = new RRegex('a')
  assertEquals(regex.split('abcabcabc'), ['', 'bc', 'bc', 'bc'])
  assertEquals(regex.split('defdefdef'), ['defdefdef'])

  const re = new RRegex('[ \\t]+')
  const fields = re.split('a b \t  c\td    e');
  assertEquals(fields, ['a', 'b', 'c', 'd', 'e']);
})

Deno.test(`RRegex::splitn`, () => {
  const regex = new RRegex(',')
  assertEquals(regex.splitn('a,b,c', 0), [])
  assertEquals(regex.splitn('a,b,c', 1), ['a,b,c'])
  assertEquals(regex.splitn('a,b,c', 2), ['a', 'b,c'])
  assertEquals(regex.splitn('a,b,c', 3), ['a', 'b', 'c'])
  assertEquals(regex.splitn('a,b,c', 4), ['a', 'b', 'c', ''])
  assertEquals(regex.splitn('a,b,c', 5), ['a', 'b', 'c'])
  assertEquals(regex.splitn('abc', 0), [])
  assertEquals(regex.splitn('abc', 1), ['abc'])
  assertEquals(regex.splitn('abc', 2), ['abc', ''])
  assertEquals(regex.splitn('abc', 3), ['abc'])

  const re = new RRegex('\\W+')
  const fields = re.splitn('Hey! How are you?', 3)
  assertEquals(fields, ['Hey', 'How', 'are you?'])
})

Deno.test(`RRegex::shortestMatch`, () => {
  const regex = new RRegex('a')
  assertEquals(regex.shortestMatch('abcabcabc'), 1)
  assertEquals(regex.shortestMatch('bcabcabc'), 3)
  assertEquals(regex.shortestMatch('cabcabc'), 2)
  assertEquals(regex.shortestMatch('defdefdef'), undefined)

  const text = 'aaaaa'
  const pos = new RRegex('a+')
  assertEquals(pos.shortestMatch(text), 1)
})

Deno.test(`RRegex::shortestMatchAt`, () => {
  const regex = new RRegex('a')
  assertEquals(regex.shortestMatchAt('abcabca', 0), 1)
  assertEquals(regex.shortestMatchAt('abcabca', 1), 4)
  assertEquals(regex.shortestMatchAt('abcabca', 2), 4)
  assertEquals(regex.shortestMatchAt('abcabca', 3), 4)
  assertEquals(regex.shortestMatchAt('abcabca', 4), 7)
  assertEquals(regex.shortestMatchAt('abcabca', 5), 7)
  assertEquals(regex.shortestMatchAt('abcabca', 6), 7)
  assertEquals(regex.shortestMatchAt('abcabca', 7), undefined)
  assertEquals(regex.shortestMatchAt('abcabca', 100), undefined)
  assertEquals(regex.shortestMatchAt('defdefdef', 0), undefined)
  assertEquals(regex.shortestMatchAt('defdefdef', 1), undefined)
  assertEquals(regex.shortestMatchAt('defdefdef', 2), undefined)
})

Deno.test('regex_syntax::hir::Empty', () => {
  const regex = new RRegex('')
  assertEquals(regex.syntax(), {
    "@name": "regex_syntax::hir::Hir",
    "@type": "struct",
    "kind": {
      "@name": "regex_syntax::hir::HirKind",
      "@type": "enum",
      "@variant": "Empty",
    }
  })
})

Deno.test('regex_syntax::hir::Literal', () => {
  const regex = new RRegex('a')
  assertEquals(regex.syntax(), {
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



Deno.test('regex_syntax -> Empty character class', () => {
  assertThrows(() => new RRegex('[a&&b]'), Error, 'empty character classes are not allowed')
})

Deno.test(`RRegexSet::isMatch`, () => {
  let set = new RRegexSet(['\\w+', '\\d+'])
  assertEquals(set.isMatch('foo'), true)
  assertEquals(set.isMatch('☃'), false)
})

Deno.test(`RRegexSet::matches`, () => {
  let set = new RRegexSet([
    '\\w+',
    '\\d+',
    '\\pL+',
    'foo',
    'bar',
    'barfoo',
    'foobar',
  ])
  assertEquals(set.matches('foobar'), [0, 2, 3, 4, 6])
})

Deno.test("Match -> UTF-8 (äöü)", () => {
  const re = new RRegex("ä")
  const m = re.find("äöü") // { start: 0, end: 2 }
  assertEquals("äöü".slice(m.start, m.end), "äö")

  const buff = new TextEncoder().encode("äöü")
  const slice = buff.slice(m.start, m.end)
  assertEquals(new TextDecoder().decode(slice), "ä")
})

Deno.test("Match -> Greek (αβγδ)", () => {
  const re = new RRegex("\\p{Greek}+");
  const hay = "Greek: αβγδ";
  const m = re.find(hay);
  assertEquals(m.start, 7);
  assertEquals(m.end, 15);
  assertEquals(m.value, "αβγδ");
})
