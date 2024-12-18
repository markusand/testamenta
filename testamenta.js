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

export const beforeAll = fn => {
  const suite = _state.currentSuite && _state.suites.get(_state.currentSuite);
  if (suite) suite.beforeAll = fn;
};

export const afterAll = fn => {
  const suite = _state.currentSuite && _state.suites.get(_state.currentSuite);
  if (suite) suite.afterAll = fn;
};

export const beforeEach = fn => {
  const suite = _state.currentSuite && _state.suites.get(_state.currentSuite);
  if (suite) suite.beforeEach = fn;
};

export const afterEach = fn => {
  const suite = _state.currentSuite && _state.suites.get(_state.currentSuite);
  if (suite) suite.afterEach = fn;
};

export const it = (name, test) => {
  const suite = _state.currentSuite && _state.suites.get(_state.currentSuite);
  if (suite) suite.queue.push({ name, test });
};

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

export const MATCHERS = {
  toBeTruthy: value => !!value,
  toBeBoolean: value => typeof value === 'boolean',
  toBeNumber: value => typeof value === 'number',
  toBeString: value => typeof value === 'string',
  toBeArray: value => Array.isArray(value),
  toBeDate: value => value instanceof Date && !isNaN(value.getTime()),
  toBeObject: value => typeof value === 'object' && value !== null,
  toBeFunction: value => typeof value === 'function',

  toHaveLength: (value, length) => {
    const { toBeString, toBeArray } = MATCHERS;
    return (toBeString(value) || toBeArray(value)) && value.length === length;
  },

  toBe: (value, expected) => {
    const { toBe, toBeArray, toBeDate, toBeObject, toHaveLength } = MATCHERS;
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
    const { toBe, toBeArray, toBeObject, toBeString } = MATCHERS;
    /* eslint-disable multiline-ternary */
    /* eslint-disable indent */
    return toBeArray(haystack) ? haystack.some(item => toBe(item, needle))
      : toBeObject(haystack) && toBeObject(needle) ? Object.keys(needle).every(key => toBe(haystack[key], needle[key]))
      : toBeString(haystack) && toBeString(needle) ? haystack.includes(needle)
      : false;
    /* eslint-enable indent */
    /* eslint-enable multiline-ternary */
  },

  toHaveBeenCalled: value => {
    const { toBeObject, toBeFunction, toBeArray } = MATCHERS;
    return (toBeObject(value) || toBeFunction(value)) &&
      'calls' in value && toBeArray(value.calls) &&
      value.calls.length > 0;
  },

  toHaveBeenCalledTimes: (value, times) => MATCHERS.toHaveBeenCalled(value) && value.calls.length === times,

  toHaveBeenCalledWith: (value, ...args) => {
    const { toHaveBeenCalled, toBe } = MATCHERS;
    return toHaveBeenCalled(value) && value.calls.some(call => toBe(args, call));
  },
};

export const expect = value => {
  const build = (matchers, negate = false) => {
    const decamelize = name => name.replace(/([A-Z])/g, ' $1').toLowerCase();

    return Object.fromEntries(Object.entries(matchers).map(([name, fn]) => {
      const error = args => {
        const params = args.length ? JSON.stringify(args.length > 1 ? args : args[0]) : '';
        const expectation = `${negate ? 'not ' : ''}${decamelize(name)} ${params}`;
        const target = MATCHERS.toBeFunction(value) ? value.name : JSON.stringify(value);
        throw new Error(`Expected ${target} ${expectation}`);
      };

      return [name, (...args) => (negate ? !fn(value, ...args) : fn(value, ...args)) ? expect(value) : error(args)];
    }));
  };

  return { ...build(MATCHERS), not: build(MATCHERS, true) };
};

expect.extend = matchersBuilder => Object.assign(MATCHERS, matchersBuilder(MATCHERS));

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
