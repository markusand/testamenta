let _passed = 0;
let _failed = 0;
const _skipped = {
  suites: 0,
  tests: 0,
};

const _suites = new Map();
let _currentSuite = null;

/* MAIN SUITE ---------------------------------------- */

export const tests = async (tests, options) => {
  _passed = 0;
  _failed = 0;

  log('Running tests...');

  const { path = './' } = options || {};
  for (const test of tests) {
    try {
      const src = `${path}${test}.test.js?${Date.now()}`;
      await import(src);
    } catch (e) {
      log();
      log(`Error loading test ${test}: ${e.message}`);
    }
  }

  log();
  log('Tests finished.');
  log();
  if (_skipped.suites) log(`⚠️ ${_skipped.suites} suites skipped.`);
  if (_skipped.tests) log(`⚠️ ${_skipped.tests} tests skipped.`);
  log(`✅ ${_passed} tests passed. ${!_failed ? '🎉' : ''}`);
  if (_failed) log(`❌ ${_failed} tests failed.`);
};

export const beforeEach = fn => { _suites.get(_currentSuite).beforeEach = fn; };
export const afterEach = fn => { _suites.get(_currentSuite).afterEach = fn; };

export const it = (name, test) => { _suites.get(_currentSuite).queue.push({ name, test }); };
it.skip = () => { _skipped.tests += 1; };

export const describe = async (id, suite) => {
  _suites.set(id, { queue: [], beforeEach: null, afterEach: null });
  _currentSuite = id;

  await suite();

  log();
  log(`  ${id ?? '{unnamed suite}'} [${_suites.get(id).queue.length} tests]`);

  for (const { name, test } of _suites.get(id).queue) {
    try {
      const state = _suites.get(id).beforeEach?.();
      await test(state);
      log(`   ✅ ${name || '{unnamed test}'}.`);
      _passed += 1;
      _suites.get(id).afterEach?.(state);
    } catch (error) {
      _failed += 1;
      log(`   ❌ ${name}. ${error.message}.`);
    }
  }

  _currentSuite = null;
  _suites.delete(id);
};

describe.skip = () => { _skipped.suites += 1; }; // Skip a test suite

const log = (msg = '') => {
  if (typeof console !== 'undefined' && console.log) console.log(msg);
  if (typeof document !== 'undefined') {
    let logger = document.getElementById('logger');
    if (!logger) {
      logger = Object.assign(document.createElement('pre'), { id: 'logger' });
      document.body.appendChild(logger);
    }
    const text = document.createTextNode(`${msg}\n`);
    logger.appendChild(text);
  }
};

/* EXPECT & MATCHERS ------------------------------------ */

const matchers = {
  toBeTruthy: value => !!value,
  toBeBoolean: value => typeof value === 'boolean',
  toBeNumber: value => typeof value === 'number',
  toBeString: value => typeof value === 'string',
  toBeArray: value => Array.isArray(value),
  toBeDate: value => value instanceof Date && !isNaN(value.getTime()),
  toBeObject: value => typeof value === 'object' && value !== null,
  toBeFunction: value => typeof value === 'function',

  toHaveLength: (value, length) => (matchers.toBeArray(value) || matchers.toBeString(value)) && value.length === length,

  toBe: (value, expected) => {
    const { toBe, toBeArray, toBeDate, toBeObject, toHaveLength } = matchers;
    /* eslint-disable multiline-ternary */
    /* eslint-disable indent */
    return value === expected ? true
      : toBeArray(value) && toBeArray(expected) ? toHaveLength(value, expected.length) && value.every((part, i) => toBe(part, expected[i]))
      : toBeDate(value) && toBeDate(expected) ? value.getTime() === expected.getTime()
      : toBeObject(value) && toBeObject(expected) ? Object.keys(value).every(key => toBe(value[key], expected[key]))
      : false;
    /* eslint-enable indent */
    /* eslint-enable multiline-ternary */
  },

  toContain: (haystack, needle) => {
    const { toBe, toBeArray, toBeObject, toBeString } = matchers;
    /* eslint-disable multiline-ternary */
    /* eslint-disable indent */
    return toBeArray(haystack) ? haystack.some(item => toBe(item, needle))
      : toBeObject(haystack) && toBeObject(needle) ? Object.keys(needle).every(key => toBe(haystack[key], needle[key]))
      : toBeString(haystack) && toBeString(needle) ? haystack.includes(needle)
      : false;
    /* eslint-enable indent */
    /* eslint-enable multiline-ternary */
  },

  toHaveBeenCalled: value => matchers.toBeFunction(value) && 'calls' in value && value.calls.length > 0,
  toHaveBeenCalledTimes: (value, times) => matchers.toHaveBeenCalled(value) && value.calls.length === times,
  toHaveBeenCalledWith: (value, ...args) => matchers.toHaveBeenCalled(value) && value.calls.some(call => matchers.toBe(args, call)),
};

export const expect = result => {
  const _throw = expectation => { throw new Error(`Expected ${matchers.toBeFunction(result) ? result.name : JSON.stringify(result)} ${expectation}`); };

  const build = (fns, negate = false) => {
    const decamelize = name => name.replace(/([A-Z])/g, ' $1').toLowerCase();
    return Object.fromEntries(Object.entries(fns).map(([name, fn]) => {
      const error = args => _throw(`${negate ? 'not ' : ''}${decamelize(name)} ${args.length ? JSON.stringify(args.length > 1 ? args : args[0]) : ''}`);
      return [name, (...args) => (negate ? !fn(result, ...args) : fn(result, ...args)) ? expect(result) : error(args)];
    }));
  };

  return { ...build(matchers), not: build(matchers, true) };
};

expect.extend = matchersBuilder => Object.assign(matchers, matchersBuilder(matchers));

/* MOCKING ---------------------------------------------- */

export const mockFn = implementation => {
  const mockFunction = (...args) => {
    mockFunction.calls.push(args);
    return mockFunction.response ?? mockFunction.implementation?.();
  };

  mockFunction.returnValue = response => { mockFunction.response = response; };

  mockFunction.reset = () => {
    mockFunction.calls = [];
    mockFunction.response = undefined;
    mockFunction.implementation = implementation;
  };

  mockFunction.reset();
  return mockFunction;
};
