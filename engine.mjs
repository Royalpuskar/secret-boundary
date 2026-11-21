const has = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const escapePart = key => key.replace(/~/g, '~0').replace(/\//g, '~1');

function list(value, label) {
  if (!Array.isArray(value) || value.length > 500) throw Error(label + ' must be an array with at most 500 items');
  return value;
}

function pointer(value) {
  if (typeof value !== 'string' || value.length > 100000 ||
      (value !== '' && !value.startsWith('/')) || /~(?![01])/.test(value)) {
    throw Error('Paths must be empty for the root or slash-prefixed pointers using ~0 and ~1 escapes');
  }
  return value;
}

export function run(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Expected an object');
  if (!has(input, 'record')) throw Error('A record is required');
  const serialized = JSON.stringify(input);
  if (serialized.length > 200000) throw Error('Input exceeds 200000 serialized characters');
  const keys = new Set(list(input.keys, 'keys').map(key => {
    if (typeof key !== 'string' || !key.trim() || key.length > 100000) throw Error('Keys must be nonempty text');
    return key.toLowerCase();
  }));
  const paths = new Set(list(input.paths === undefined ? [] : input.paths, 'paths').map(pointer));
  const audit = [];
  const matched = new Set();

  function walk(value, path = '', depth = 0, keyMatch = false) {
    if (depth > 30) throw Error('Nesting too deep');
    const pathMatch = paths.has(path);
    if (pathMatch) matched.add(path);
    if (pathMatch || keyMatch) {
      audit.push({path, reason: pathMatch ? 'exact path' : 'field name'});
      return '[REDACTED]';
    }
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (Array.isArray(value)) {
      return value.map((item, index) => walk(item, path + '/' + index, depth + 1));
    }
    if (value && typeof value === 'object' &&
        (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)) {
      const output = Object.create(null);
      for (const [key, item] of Object.entries(value)) {
        output[key] = walk(item, path + '/' + escapePart(key), depth + 1, keys.has(key.toLowerCase()));
      }
      return output;
    }
    throw Error('Record must contain JSON-compatible values');
  }
  const cleaned = walk(input.record);
  const unmatchedPaths = [...paths].filter(path => !matched.has(path));
  return {
    metrics: {redacted: audit.length, configuredKeys: keys.size, configuredPaths: paths.size, unmatchedPaths: unmatchedPaths.length},
    rows: [{output: JSON.stringify(cleaned, null, 2)}],
    audit,
    unmatchedPaths
  };
}
