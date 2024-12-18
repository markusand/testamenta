const _state = {
  passed: 0,
  failed: 0,
  skippedSuites: 0,
  skippedTests: 0,
  suites: new Map(),
  currentSuite: null,
};

/* MAIN SUITE ---------------------------------------- */

export const tests = async (tests, options) => {
  _state.passed = 0;
  _state.failed = 0;

  log('Running tests...');

  const { path = './' } = options || {};
  for (const test of tests) {
    try {
      const src = `${path}${test}.test.js?${Date.now()}`;
      await import(src);
    } catch (error) {
      log();
      log(`Error loading test ${test}: ${error instanceof Error ? error.message : error}`);
    }
  }

  log();
  log('Tests finished.');
  log();
  if (_state.skippedSuites) log(`⚠️ ${_state.skippedSuites} suites skipped.`);
  if (_state.skippedTests) log(`⚠️ ${_state.skippedTests} tests skipped.`);
  log(`✅ ${_state.passed} tests passed. ${!_state.failed ? '🎉' : ''}`);
  if (_state.failed) log(`❌ ${_state.failed} tests failed.`);
};

export const beforeAll = fn => { _state.suites.get(_state.currentSuite).beforeAll = fn; };
export const afterAll = fn => { _state.suites.get(_state.currentSuite).afterAll = fn; };
export const beforeEach = fn => { _state.suites.get(_state.currentSuite).beforeEach = fn; };
export const afterEach = fn => { _state.suites.get(_state.currentSuite).afterEach = fn; };
export const it = (name, test) => { _state.suites.get(_state.currentSuite).queue.push({ name, test }); };

it.skip = (_name, _test) => { _state.skippedTests += 1; };
export const describe = async (title, suite) => {
  _state.suites.set(title, { queue: [] });
  _state.currentSuite = title;

  await suite();

  const { queue = [], beforeAll, afterEach, beforeEach, afterAll } = _state.suites.get(title) ?? {};

  log();
  log(`  ${title ?? '{unnamed suite}'} [${queue.length} tests]`);

  beforeAll?.();

  for (const { name, test } of queue) {
    try {
      const state = beforeEach?.();
      await test(state);
      log(`   ✅ ${name || '{unnamed test}'}.`);
      _state.passed += 1;
    } catch (error) {
      _state.failed += 1;
      log(`   ❌ ${name}. ${error instanceof Error ? error.message : error}.`);
    } finally {
      afterEach?.();
    }
  }

  afterAll?.();

  _state.currentSuite = null;
  _state.suites.delete(title);
};

describe.skip = (_title, _suite) => { _state.skippedSuites += 1; }; // Skip a test suite

const log = (msg = ' ') => {
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

  toHaveBeenCalled: value => 'calls' in value && value.calls.length > 0,
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

export const mockFn = (implementation = undefined) => {
  const mock = (...args) => {
    mock.calls.push(args);
    return mock.response ?? mock.implementation?.();
  };

  mock.returnValue = response => { mock.response = response; };

  mock.reset = () => {
    mock.calls = [];
    mock.response = undefined;
    mock.implementation = implementation;
  };

  mock.reset(); // Initialize
  return mock;
};

/* SPY ------------------------------------------------ */
export const spyOn = (object, methodName) => {
  if (typeof object[methodName] !== 'function') throw new TypeError(`The property ${methodName} is not a function.`);

  const original = object[methodName];

  let implementation = null;

  const spy = {
    error: null,
    calls: [],

    get executions() {
      return this.calls.length;
    },

    get executed() {
      return this.calls.length > 0;
    },

    mock(impl) {
      implementation = impl;
      return this;
    },

    clear() {
      this.calls = [];
      this.error = null;
      return this;
    },

    reset() {
      this.clear();
      implementation = null;
      return this;
    },

    restore() {
      object[methodName] = original;
      return this;
    },
  };

  object[methodName] = (...args) => {
    try {
      const executor = implementation ?? original;
      return executor(...args);
    } catch (error) {
      spy.error = error instanceof Error
        ? error
        : new Error(String(error));
    } finally {
      spy.calls.push(args);
    }
  };

  return spy;
};
