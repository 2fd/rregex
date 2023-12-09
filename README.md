# rregex

A WebAssembly build of [Rust Regex](https://docs.rs/regex/latest/regex/) for Javascript

> Note: this project is not intended to be used in production jet

- [Why Rust Regex](#why-rust-regex)
- [Install](#install)
- [API](#api)
  - [`isMatch(text: string): boolean`](#ismatchtext-string-boolean)
  - [`isMatchAt(text: string, limit: number): boolean`](#ismatchattext-string-limit-number-boolean)
  - [`find(text: string): Match | undefined;`](#findtext-string-match--undefined)
  - [`findAt(text: string): Match | undefined;`](#findattext-string-match--undefined)
  - [`findAll(text: string): Match[];`](#findalltext-string-match)
  - [`capturesLength(): number;`](#captureslength-number) (since 1.8)
  - [`captureNames(): string[];`](#capturenames-string) (since 1.8)
  - [`captures(text: string): Captures | undefined;`](#capturestext-string-captures--undefined) (since 1.8)
  - [`capturesAll(text: string): Captures[];`](#capturesalltext-string-captures) (since 1.8)
  - [`replace(text: string, rep: string): string;`](#replacetext-string-rep-string-string)
  - [`replaceAll(text: string, rep: string): string;`](#replacealltext-string-rep-string-string)
  - [`replacen(text: string, limit: number, rep: string): string;`](#replacentext-string-limit-number-rep-string-string)
  - [`split(text: string): string[];`](#splittext-string-string)
  - [`splitn(text: string, limit: number): string[];`](#splitntext-string-limit-number-string)
  - [`shortestMatch(text: string): number | undefined;`](#shortestmatchtext-string-number--undefined)
  - [`shortestMatchAt(text: string, limit: number): number | undefined;`](#shortestmatchattext-string-limit-number-number--undefined)
- [Known Issues](#known-issues)

## Why Rust Regex

Rust has a powerful Regex library with a lot of features that don't exists en the standard `Regex` object

[See the official documentation](https://docs.rs/regex/latest/regex/#syntax) for more detail

## Install

```bash
npm install rregex
```

## API

Similar to the native `Regex` object you can create a new `RRegex` instance using a string.

```typescript
import { RRegex } from "rregex";
const re = new RRegex("^d{4}-d{2}-d{2}$");
assert.equal(re.isMatch("2014-01-01"), true);
```

> Note: It doesn't take a second parameter because fags are part of the syntax ([See Documentation](https://docs.rs/regex/latest/regex/#grouping-and-flags))

### `isMatch(text: string): boolean;`

Returns true if and only if there is a match for the regex in the string given.

```typescript
const text = "I categorically deny having triskaidekaphobia.";
const re = new RRegex("\\b\\w{13}\\b");
expect(re.isMatch(text)).toEqual(true);
```

[See Documentation for `is_match`](https://docs.rs/regex/latest/regex/struct.Regex.html#method.is_match)

### `isMatchAt(text: string, limit: number): boolean;`

Returns the same as is_match, but starts the search at the given offset.

 [See Documentation for `is_match_at`](https://docs.rs/regex/latest/regex/struct.Regex.html#method.is_match_at)

```typescript
const text = "I categorically deny having triskaidekaphobia.";
const re = new RRegex("\\b\\w{13}\\b");
expect(re.isMatchAt(text, 1)).toBe(true);
expect(re.isMatchAt(text, 5)).toBe(false);
```

### `find(text: string): Match | undefined;`

Returns the start and end byte range of the leftmost-first match in `text`. If no match exists, then `undefined` is returned.

```typescript
const text = "I categorically deny having triskaidekaphobia.";
const re = new RRegex("\\b\\w{13}\\b");
expect(re.find(text)).toEqual({
  value: "categorically",
  start: 2,
  end: 15,
});
```

[See Documentation for `find`](https://docs.rs/regex/latest/regex/struct.Regex.html#method.find)

### `findAt(text: string): Match | undefined;`

Returns the same as find, but starts the search at the given offset.

```typescript
const text = "I categorically deny having triskaidekaphobia.";
const re = new RRegex("\\b\\w{13}\\b");
expect(re.findAt(text, 1)).toEqual({
  value: "categorically",
  start: 2,
  end: 15,
});

expect(re.findAt(text, 5)).toEqual(undefined);
```

([See Documentation for `find_at`](https://docs.rs/regex/latest/regex/struct.Regex.html#method.find_at))

### `findAll(text: string): Match[];`

Returns an array for each successive non-overlapping match in text, returning the start and end byte indices with respect to text

```typescript
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
```

[See Documentation for `find_iter`](https://docs.rs/regex/latest/regex/struct.Regex.html#method.find_iter)

### `captureNames(): string[];`

> Note: available since 1.8

Returns a list of the capture names in this regex.

[See Documentation for `capture_names`](https://docs.rs/regex/latest/regex/struct.Regex.html#method.capture_names)

### `captures(text: string): Captures | undefined;`

> Note: available since 1.8

Returns the capture groups corresponding to the leftmost-first
match in `text`. Capture group `0` always corresponds to the entire
match. If no match is found, then `undefined` is returned.

```typescript
const re = new Regex("'([^']+)'\\s+\\((\\d{4})\)")
const text = "Not my favorite movie: 'Citizen Kane' (1941)."
const caps = re.captures(text)
expect(caps.get[1].value).toBe("Citizen Kane")
expect(caps.get[2].value).toBe("1941")
expect(caps.get[0].value).toBe("'Citizen Kane' (1941)")
```

### `capturesAll(text: string): Captures[];`

> Note: available since 1.8

Returns a list with all the non-overlapping capture groups matched
in `text`. This is operationally the same as `findAll`, except it
returns information about capturing group matches.

```typescript
const re = new Regex("'(?P<title>[^']+)'\\s+\\((?P<year>\\d{4})\\)")
const text = "'Citizen Kane' (1941), 'The Wizard of Oz' (1939), 'M' (1931)."
for caps of re.captures_iter(text) {
    console.log(
        "Movie:", caps.name["title"].value, ","
        "Released:", caps.name["year"].value
    );
}
// Output:
// Movie: Citizen Kane, Released: 1941
// Movie: The Wizard of Oz, Released: 1939
// Movie: M, Released: 1931
```

[See the documentation for `captures_iter`](https://docs.rs/regex/latest/regex/struct.Regex.html#method.captures_iter))

### `capturesLength(): number;`

> Note: available since 1.8

Returns the number of captures.

This includes all named and unnamed groups, including the implicit
unnamed group that is always present and corresponds to the entire match.

Since the implicit unnamed group is always included in this length, the
length returned is guaranteed to be greater than zero.

```typescript
const re1 = new RRegex("(?P<y>\\d{4})-(?P<m>\\d{2})-(?P<d>\\d{2})");
expect(re1.capturesLength()).toEqual(4);

const re2 = new RRegex("foo");
expect(re2.capturesLength()).toEqual(1);

const re3 = new RRegex("(foo)");
expect(re3.capturesLength()).toEqual(2);

const re4 = new RRegex("(?<a>.(?<b>.))(.)(?:.)(?<c>.)");
expect(re4.capturesLength()).toEqual(5);

const re5 = new RRegex("[a&&b]");
expect(re5.capturesLength()).toEqual(1);
```

[See the documentation for `captures_len`](https://docs.rs/regex/latest/regex/struct.Regex.html#method.captures_len)

### `replace(text: string, rep: string): string;`

Replaces the leftmost-first match with the replacement provided.

If no match is found, then a copy of the string is returned unchanged.

Note that this function is polymorphic with respect to the replacement. In typical usage, this can just be a normal string:

```typescript
const re = new RRegex("[^01]+");
expect(re.replace("1078910", "")).toBe("1010");
```

But this is a bit cumbersome to use all the time. Instead, a simple syntax is supported that expands `$name` into the corresponding capture group. Here’s the last example, but using this expansion technique with named capture groups:

```typescript
const re = new RRegex("(?P<last>[^,\\s]+),\\s+(?P<first>\\S+)");
const result = re.replace("Springsteen, Bruce", "$first $last");
expect(result).toEqual("Bruce Springsteen");
```

Note that using `$2` instead of `$first` or `$1` instead of `$last` would produce the same result. To write a literal `$` use `$$`.

Sometimes the replacement string requires use of curly braces to delineate a capture group replacement and surrounding literal text. For example, if we wanted to join two words together with an underscore:

```typescript
const re = new RRegex("(?P<first>\\w+)\\s+(?P<second>\\w+)");
const result = re.replace("deep fried", "${first}_$second");
expect(result).toEqual("deep_fried");
```

Without the curly braces, the capture group name `first_` would be used, and since it doesn’t exist, it would be replaced with the empty string.

[See Documentation for `replace`](https://docs.rs/regex/latest/regex/struct.Regex.html#method.replace)

### `replaceAll(text: string, rep: string): string;`

Replaces all non-overlapping matches in `text` with the replacement provided. This is the same as calling `replacen` with `limit` set to `0`.

[See the documentation for `replace_all`](https://docs.rs/regex/latest/regex/struct.Regex.html#method.replace_all)

### `replacen(text: string, limit: number, rep: string): string;`

Replaces at most `limit` non-overlapping matches in `text` with the replacement provided. If `limit` is 0, then all non-overlapping matches are replaced.

[See Documentation for `replacen`](https://docs.rs/regex/latest/regex/struct.Regex.html#method.replacen)

### `split(text: string): string[];`

Returns an iterator of substrings of `text` delimited by a match of the regular expression. Namely, each element of the iterator corresponds to text that isn’t matched by the regular expression.

```typescript
const re = new RRegex("[ \\t]+");
const fields = re.split("a b \t  c\td    e");
expect(fields).toEqual(["a", "b", "c", "d", "e"]);
```

[See Documentation for `split`](https://docs.rs/regex/latest/regex/struct.Regex.html#method.split)

### `splitn(text: string, limit: number): string[];`

Returns an iterator of at most `limit` substrings of `text` delimited by a match of the regular expression. (A limit of 0 will return no substrings.) Namely, each element of the iterator corresponds to text that isn’t matched by the regular expression. The remainder of the string that is not split will be the last element in the iterator.

```typescript
const re = new RRegex("\\W+");
const fields = re.splitn("Hey! How are you?", 3);
expect(fields).toEqual(["Hey", "How", "are you?"]);
```

[See Documentation for `splitn`](https://docs.rs/regex/latest/regex/struct.Regex.html#method.splitn)

### `shortestMatch(text: string): number | undefined;`

Returns the end location of a match in the text given.

This method may have the same performance characteristics as `is_match`, except it provides an end location for a match. In particular, the location returned may be shorter than the proper end of the leftmost-first match.

```typescript
const text = "aaaaa";
const pos = new RRegex("a+");
expect(pos.shortestMatch(text)).toBe(1);
```

[See Documentation for `shortest_match`](https://docs.rs/regex/latest/regex/struct.Regex.html#method.shortest_match)

### `shortestMatchAt(text: string, limit: number): number | undefined;`

Returns the same as shortest_match, but starts the search at the given offset.

[See Documentation for `shortest_match_at`](https://docs.rs/regex/latest/regex/struct.Regex.html#method.shortest_match_at)

## Known Issues

If you call `splitn(text, limit)` and the expected result length is equal to `limit - 1` the result will include an extra item `""`, this behavior does not happen if `limit` es greater. **`fixed at >=1.3`**

```ts
const regex = new RRegex(",");
expect(regex.splitn("a,b,c", 0)).toEqual([]);
expect(regex.splitn("a,b,c", 1)).toEqual(["a,b,c"]);
expect(regex.splitn("a,b,c", 2)).toEqual(["a", "b,c"]);
expect(regex.splitn("a,b,c", 3)).toEqual(["a", "b", "c"]);

// This result includes an unexpected extra item
expect(regex.splitn("a,b,c", 4)).toEqual(["a", "b", "c", ""]);
expect(regex.splitn("a,b,c", 5)).toEqual(["a", "b", "c"]);

expect(regex.splitn("abc", 0)).toEqual([]);
expect(regex.splitn("abc", 1)).toEqual(["abc"]);

// This result includes an unexpected extra item
expect(regex.splitn("abc", 2)).toEqual(["abc", ""]);
expect(regex.splitn("abc", 3)).toEqual(["abc"]);
```
