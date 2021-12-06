# rregex

A WebAssembly build of [Rust Regex](https://docs.rs/regex/latest/regex/) for Javascript

> Note: this project is not intended to be use in production

## Why Rust Regex

Rust has a powerful Regex library with a lot of features that don't exists en the standard `Regex` object

[See the official documentation](https://docs.rs/regex/latest/regex/#syntax) for more detail

## API

Similar to the native `Regex` object you can create a new `RRegex` instance using a string.

```typescript
import { RRegExp } from "rregex";
const re = new RRegExp("^d{4}-d{2}-d{2}$");
assert.equal(re.isMatch("2014-01-01"), true);
```

> Note: It doesn't take a second parameter because fags are part of the syntax ([See Documentation](https://docs.rs/regex/latest/regex/#grouping-and-flags))

### `isMatch(text: string): boolean`

Returns true if and only if there is a match for the regex in the string given. ([See Documentation](https://docs.rs/regex/latest/regex/struct.Regex.html#method.is_match))

```typescript
const text = "I categorically deny having triskaidekaphobia.";
const re = new RRegExp("\\b\\w{13}\\b");
expect(re.isMatch(text)).toEqual(true);
```

### `isMatchAt(text: string, limit: number): boolean`

Returns the same as is_match, but starts the search at the given offset. ([See Documentation](https://docs.rs/regex/latest/regex/struct.Regex.html#method.is_match_at))

```typescript
const text = "I categorically deny having triskaidekaphobia.";
const re = new RRegExp("\\b\\w{13}\\b");
expect(re.isMatchAt(text, 1)).toBe(true);
expect(re.isMatchAt(text, 5)).toBe(false);
```

### `find(text: string): Match | undefined;`

Returns the start and end byte range of the leftmost-first match in `text`. If no match exists, then `undefined` is returned. ([See Documentation](https://docs.rs/regex/latest/regex/struct.Regex.html#method.find))

```typescript
const text = "I categorically deny having triskaidekaphobia.";
const re = new RRegExp("\\b\\w{13}\\b");
expect(re.find(text)).toEqual({
  value: "categorically",
  start: 2,
  end: 15,
});
```

### `findAt(text: string): Match | undefined;`

Returns the same as find, but starts the search at the given offset. ([See Documentation](https://docs.rs/regex/latest/regex/struct.Regex.html#method.find_at))

```typescript
const text = "I categorically deny having triskaidekaphobia.";
const re = new RRegExp("\\b\\w{13}\\b");
expect(re.findAt(text, 1)).toEqual({
  value: "categorically",
  start: 2,
  end: 15,
});

expect(re.findAt(text, 5)).toEqual(undefined);
```

### `findAll(text: string): Match[];`

Returns an array for each successive non-overlapping match in text, returning the start and end byte indices with respect to text ([See Documentation](https://docs.rs/regex/latest/regex/struct.Regex.html#method.find_iter))

```typescript
    const text = 'Retroactively relinquishing remunerations is reprehensible.'
    const re = new RRegExp('\\b\\w{13}\\b')
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

### `replace(text: string, rep: string): string;`

Replaces the leftmost-first match with the replacement provided.

If no match is found, then a copy of the string is returned unchanged. ([See Documentation](https://docs.rs/regex/latest/regex/struct.Regex.html#method.replace))

Note that this function is polymorphic with respect to the replacement. In typical usage, this can just be a normal string:

```typescript
const re = new RRegExp("[^01]+");
expect(re.replace("1078910", "")).toBe("1010");
```

But this is a bit cumbersome to use all the time. Instead, a simple syntax is supported that expands `$name` into the corresponding capture group. Here’s the last example, but using this expansion technique with named capture groups:

```typescript
const re = new RRegExp("(?P<last>[^,\\s]+),\\s+(?P<first>\\S+)");
const result = re.replace("Springsteen, Bruce", "$first $last");
expect(result).toEqual("Bruce Springsteen");
```

Note that using `$2` instead of `$first` or `$1` instead of `$last` would produce the same result. To write a literal `$` use `$$`.

Sometimes the replacement string requires use of curly braces to delineate a capture group replacement and surrounding literal text. For example, if we wanted to join two words together with an underscore:

```typescript
const re = new RRegExp("(?P<first>\\w+)\\s+(?P<second>\\w+)");
const result = re.replace("deep fried", "${first}_$second");
expect(result).toEqual("deep_fried");
```

Without the curly braces, the capture group name `first_` would be used, and since it doesn’t exist, it would be replaced with the empty string.

### `replaceAll(text: string, rep: string): string;`

Replaces all non-overlapping matches in `text` with the replacement provided. This is the same as calling `replacen` with `limit` set to `0`.

See the documentation for `replace` for details on how to access capturing group matches in the replacement string. ([See Documentation](https://docs.rs/regex/latest/regex/struct.Regex.html#method.replace_all))

### `replacen(text: string, limit: number, rep: string): string;`

Replaces at most `limit` non-overlapping matches in `text` with the replacement provided. If `limit` is 0, then all non-overlapping matches are replaced. ([See Documentation](https://docs.rs/regex/latest/regex/struct.Regex.html#method.replacen))

### `split(text: string): string[];`

Returns an iterator of substrings of `text` delimited by a match of the regular expression. Namely, each element of the iterator corresponds to text that isn’t matched by the regular expression. ([See Documentation](https://docs.rs/regex/latest/regex/struct.Regex.html#method.split))

```typescript
const re = new RRegExp("[ \\t]+");
const fields = re.split("a b \t  c\td    e");
expect(fields).toEqual(["a", "b", "c", "d", "e"]);
```

### `splitn(text: string, limit: number): string[];`

Returns an iterator of at most `limit` substrings of `text` delimited by a match of the regular expression. (A limit of 0 will return no substrings.) Namely, each element of the iterator corresponds to text that isn’t matched by the regular expression. The remainder of the string that is not split will be the last element in the iterator.([See Documentation](https://docs.rs/regex/latest/regex/struct.Regex.html#method.splitn))

```typescript
const re = new RRegExp("\\W+");
const fields = re.splitn("Hey! How are you?", 3);
expect(fields).toEqual(["Hey", "How", "are you?"]);
```

### `shortestMatch(text: string): number | undefined;`

Returns the end location of a match in the text given.

This method may have the same performance characteristics as `is_match`, except it provides an end location for a match. In particular, the location returned may be shorter than the proper end of the leftmost-first match. ([See Documentation](https://docs.rs/regex/latest/regex/struct.Regex.html#method.shortest_match))

```typescript
    const text = 'aaaaa'
    const pos = new RRegExp('a+')
    expect(pos.shortestMatch(text)).toBe(1)
```

### `shortestMatchAt(text: string, limit: number): number | undefined;`

Returns the same as shortest_match, but starts the search at the given offset. ([See Documentation](https://docs.rs/regex/latest/regex/struct.Regex.html#method.shortest_match_at))
