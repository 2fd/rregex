// Browser stand-in for the parts of `node:assert` that the test suite uses.

/**
 * Loose deep equality, like the legacy `deepEqual` of `node:assert`:
 * primitives are compared with `==` and prototypes are ignored.
 */
export function deepEqual(actual, expected, message) {
  const path = compare(actual, expected, "$")
  if (path === null) {
    return
  }

  const error = new Error(
    message ??
      `Expected values to be loosely deep-equal at ${path}:\n\n` +
        `${format(actual)}\n\nshould loosely deep-equal\n\n${format(expected)}`,
  )
  error.name = "AssertionError"
  error.actual = actual
  error.expected = expected
  throw error
}

/** Returns the path of the first difference, or `null` if the values are equal. */
function compare(actual, expected, path) {
  if (actual == expected || (actual !== actual && expected !== expected)) {
    return null
  }

  if (
    typeof actual !== "object" ||
    typeof expected !== "object" ||
    actual === null ||
    expected === null ||
    Array.isArray(actual) !== Array.isArray(expected)
  ) {
    return path
  }

  const keys = Object.keys(expected)
  if (Object.keys(actual).length !== keys.length) {
    return path
  }

  for (const key of keys) {
    const keyPath = Array.isArray(expected) ? `${path}[${key}]` : `${path}.${key}`
    if (!Object.hasOwn(actual, key)) {
      return keyPath
    }

    const difference = compare(actual[key], expected[key], keyPath)
    if (difference !== null) {
      return difference
    }
  }

  return null
}

function format(value) {
  return value === undefined ? "undefined" : JSON.stringify(value, null, 2)
}
