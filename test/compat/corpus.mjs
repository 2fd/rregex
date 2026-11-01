// Corpus for the differential compatibility test (test/compat/diff.mjs).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dataDir = resolve(import.meta.dirname, '../__data__');

/** Patterns that must compile. Grouped by the HIR feature they exercise. */
export const patterns = [
  // Empty / literals (unicode + bytes)
  '', 'a', 'abc', 'äöü', 'αβγδ', '🦀', 'a\\x00b', '\\u{10FFFF}', '(?i)k', '(?i)ß',
  '(?-u:abc)', '(?-u)\\x7F', '(?-u:a)(?u:é)',
  // Unicode classes
  '.', '(?s).', '\\w', '\\d', '\\s', '\\W', '\\pL', '\\p{Greek}+', '\\P{Greek}', '[a-z]', '[^a-z]',
  '[a&&b]', '[\\w--\\d]', 'a**', '[[:foo:]]', '[[:alpha:]]', '(?i)[a-c]', '[\\x{0}-\\x{10FFFF}]', '\\p{Emoji}',
  // Byte classes (ASCII-only `(?-u)` classes are valid in a `&str` regex)
  '(?-u)\\w', '(?-u)[a-z]', '(?-u)[\\x00-\\x7F]', '(?-u)\\d+', '(?-u)[[:space:]]', '(?-u)(?i)k',
  // Every `Look` variant
  '^', '$', '(?m)^', '(?m)$', '(?mR)^', '(?mR)$', '^$', '\\A', '\\z',
  '(?-u)\\b', '(?-u)\\B', '\\b', '\\B',
  '(?-u)\\b{start}', '(?-u)\\b{end}', '\\b{start}', '\\b{end}', '\\<', '\\>',
  '(?-u)\\b{start-half}', '(?-u)\\b{end-half}', '\\b{start-half}', '\\b{end-half}',
  '\\b\\w+\\b', '(?m)^\\w+$', '(?mR)^.+$',
  // Repetitions (with and without `max`, greedy and lazy)
  'a*', 'a+', 'a?', 'a*?', 'a+?', 'a??', 'a{3}', 'a{2,}', 'a{2,5}', 'a{0}', 'a{0,0}', 'a{2,5}?',
  '(?U)a+', '(?U)a+?', '(?:ab)+', '(?:a|b){1,3}', '\\w{1,}?', '(?:)*',
  // Captures (named, unnamed, nested, optional / non-participating)
  '(a)', '(a)(b)?', '(a)|(b)', '(?P<x>a)', '(?<y>b)', '(?P<x>a)|(?P<y>b)', '((a)(?<inner>b))',
  '(?<first>\\w)(\\w)(?:\\w)\\w(?<last>\\w)', '(?P<y>\\d{4})-(?P<m>\\d{2})-(?P<d>\\d{2})',
  "'(?P<title>[^']+)'\\s+\\((?P<year>\\d{4})\\)", '(?<e>)', '()', '(x)?(y)?(z)?', '(?<ü>.)',
  // Alternation / concat / misc
  'a|b', 'a|b|c', 'foo|bar|baz', 'a|', '|a', '(?:a|b)c', 'a(?:b|c)d', '\\w+@\\w+\\.\\w+',
  '[0-9]{3}-[0-9]{3}-[0-9]{4}', '[\\w.+-]+@[\\w.-]+\\.[\\w.-]+', '(?x) a b # comment',
  '\\p{Greek}+|\\d+|(?<w>\\w+)', '(?s)(.)(.)?', '(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9])\\.){3}',
];

/** Patterns that must fail to compile (error class and message must match). */
export const invalidPatterns = [
  '(', ')', '[', 'a{2,1}', '\\p{Foo}', '(?P<a>x)(?P<a>y)', '[z-a]', '*', '(?-u)[^\\x80-\\xFF]', '\\', '(?<1a>x)',
  '(?-u)\\xFF', '(?-u).', '(?-u)[^a]', 'a{4294967296}', '(?:\\w{100}){100}', '\\b{foo}', '(?z)a',
  '\\k<x>', '(?=a)', '(?<=a)b', 'a{,5}x\\', '\\p',
];

const big = readFileSync(resolve(dataDir, 'input-text.txt'), 'utf8');

/** Haystacks: unicode, bytes boundaries, CRLF, empty, lone surrogates, real text. */
export const haystacks = [
  '', 'a', 'abc', 'aaa', 'bbb', 'ab', 'abab', 'aaaaa', 'toady', 'foobar', 'xyz',
  'äöü', 'Greek: αβγδ', '🦀 crab 🦀', 'a\r\nb\nc\r\n', 'line one\nline two\r\nline three',
  '\u0000', 'ﬀ', 'é', 'Kelvin K and k', 'STRASSE straße', '\ud800 lone \udc00',
  'phone: 111-222-3333', "Not my favorite movie: 'Citizen Kane' (1941).",
  "'Citizen Kane' (1941), 'The Wizard of Oz' (1939), 'M' (1931).",
  '2024-01-31 and 1999-12-01', 'mail me at foo.bar+baz@example.com or x@y.z',
  'IP 192.168.0.1 and 10.0.0.255', 'a b \t  c\td    e', 'Hey! How are you?',
  big.slice(0, 4096),
];

/** Larger haystack used for `findAll` / `capturesAll` arrays. */
export const largeHaystack = big.slice(0, 200_000);
export const largePatterns = ['\\w+', '(?<w>\\w)(\\w)?', '\\b\\w{5}\\b', '\\s*', '\\p{Greek}+|\\d+'];

/** Out-of-range / non-integer starts; wasm-bindgen coerces them to u32. */
export const starts = (len) => [0, 1, 2, 3, Math.floor(len / 2), len - 1, len, len + 1, len + 100,
  -1, 1.5, NaN, 2 ** 32 - 1, 2 ** 32, 2 ** 53];

export const limits = [0, 1, 2, 3, 100];
export const replacements = ['', 'X', '$0', '$1', '${1}_', '$x', '$name', '$$', '[$first]'];

/** Inputs for `new RRegexSet(...)`, including non-string items. */
export const setInputs = [
  [], ['a'], ['\\w+', '\\d+'], ['\\w+', '\\d+', '\\pL+', 'foo', 'bar', 'barfoo', 'foobar'],
  ['a', '('], ['(', 'a'], ['a', 1], [1], [null], [undefined], ['a', {}], ['a', ['b']],
  ['a', true], [Symbol('s')], ['a', 1n], ['^', '$', '\\b'], ['(?-u)\\xFF'],
];
