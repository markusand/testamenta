/* MAIN SUITE ---------------------------------------- */

/**
 * Stores the state of the test execution.
 * @type {{
 *    passed: number,
 *    failed: number,
 *    skippedSuites: number,
 *    skippedTests: number,
 *    suites: Map<string, {
 *      queue: Array<{ name: string, test: Function }>,
 *      beforeEach?: Function,
 *      afterEach?: Function,
 *      beforeAll?: Function,
 *      afterAll?: Function,
 *    }>,
 *    currentSuite: string | null,
 * }}
 */
const _state = {
  passed: 0,
  failed: 0,
  skippedSuites: 0,
  skippedTests: 0,
  suites: new Map(),
  currentSuite: null,
};

/**
 * Executes a series of test files.
 * Initializes test counters and logs the test process. Imports each test file
 * asynchronously and logs any errors that occur during the loading of tests.
 * Provides a summary of test results, including the number of tests passed, failed,
 * and skipped.
 * @param {string[]} tests - An array of test file identifiers.
 * @param {{
 *    path?: string,
 * }} options - Configuration options for the test execution.
 * @returns {Promise<void>} A promise that resolves when all tests have been executed.
 */
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

/**
 * Executes a function before all tests in the current suite.
 * @param {Function} fn - The function to execute.
 */
export const beforeAll = fn => {
  const suite = _state.currentSuite && _state.suites.get(_state.currentSuite);
  if (suite) suite.beforeAll = fn;
};

/**
 * Executes a function after all tests in the current suite.
 * @param {Function} fn - The function to execute.
 */
export const afterAll = fn => {
  const suite = _state.currentSuite && _state.suites.get(_state.currentSuite);
  if (suite) suite.afterAll = fn;
};

/**
 * Executes a function before each test in the current suite.
 * @param {Function} fn - The function to execute.
 */
export const beforeEach = fn => {
  const suite = _state.currentSuite && _state.suites.get(_state.currentSuite);
  if (suite) suite.beforeEach = fn;
};

/**
 * Executes a function after each test in the current suite.
 * @param {Function} fn - The function to execute.
 */
export const afterEach = fn => {
  const suite = _state.currentSuite && _state.suites.get(_state.currentSuite);
  if (suite) suite.afterEach = fn;
};

/**
 * Enqueues a test to be executed in the suite.
 * @param {string} name - The name of the test.
 * @param {Function} test - The test function.
 */
export const it = (name, test) => {
  const suite = _state.currentSuite && _state.suites.get(_state.currentSuite);
  if (suite) suite.queue.push({ name, test });
};

/**
 * Skips a test.
 * @type {(name: string, test: Function) => void}
 */
it.skip = (_name, _test) => { _state.skippedTests += 1; };

/**
 * Creates a test suite.
 * @param {string} title - The test suite's title.
 * @param {() => void | Promise<void>} suite - The test suite's code.
 * @returns {Promise<void>} A promise that resolves when the suite has been executed.
 */
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

/**
 * Skips a test suite.
 * @type {(title: string, suite: Function) => void}
 */
describe.skip = (_title, _suite) => { _state.skippedSuites += 1; }; // Skip a test suite

/**
 * Logs a message to the console or the DOM.
 * @param {string} [msg=' '] - The message to log.
 */
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

/**
 * @template T
 * @typedef {T extends (value: any, ...rest: infer R) => boolean ? (...args: R) => boolean : never} ExcludeFirst
 */

/**
 * List of available matchers.
 * @typedef {(value: any, ...args: any[]) => boolean} MatcherBuilder
 * @satisfies {Record<string, MatcherBuilder>}
 */
export const MATCHERS = {
  /** @type {(value: unknown) => value is true} - Checks if a value is truthy. */
  toBeTruthy: value => !!value,

  /** @type {(value: unknown) => value is boolean} - Checks if a value is a boolean. */
  toBeBoolean: value => typeof value === 'boolean',

  /** @type {(value: unknown) => value is number} - Checks if a value is a number. */
  toBeNumber: value => typeof value === 'number',

  /** @type {(value: unknown) => value is string} - Checks if a value is a string. */
  toBeString: value => typeof value === 'string',

  /** @type {(value: unknown) => value is any[]} - Checks if a value is an array. */
  toBeArray: value => Array.isArray(value),

  /** @type {(value: unknown) => value is Date} - Checks if a value is a date. */
  toBeDate: value => value instanceof Date && !isNaN(value.getTime()),

  /** @type {(value: unknown) => value is Object} - Checks if a value is an object. */
  toBeObject: value => typeof value === 'object' && value !== null,

  /** @type {(value: unknown) => value is Function} - Checks if a value is a function. */
  toBeFunction: value => typeof value === 'function',

  /** @type {(value: Function, expected?: string | RegExp | Error) => boolean} */
  toThrow: (value, expected) => {
    if (!MATCHERS.toBeFunction(value)) throw new TypeError('toThrow require a function as expect value');
    try {
      value();
      return false; // No error thrown
    } catch (error) {
      if (expected === undefined) return true; // Any error is acceptable
      if (typeof expected === 'string') return error.message === expected;
      if (expected instanceof RegExp) return expected.test(error.message);
      if (expected instanceof Error) return error.message === expected.message;
      throw new TypeError('Invalid expected error type');
    }
  },

  /** @type {(value: unknown, length: number) => boolean} - Checks if a value has the specified length. */
  toHaveLength: (value, length) => {
    const { toBeString, toBeArray } = MATCHERS;
    return (toBeString(value) || toBeArray(value)) && value.length === length;
  },

  /** @type {(value: unknown, expected: unknown) => boolean} - Checks if two values are equal. */
  toBe: (value, expected) => {
    const { toBe, toBeArray, toBeDate, toBeObject, toHaveLength } = MATCHERS;
    /* eslint-disable multiline-ternary */
    /* eslint-disable indent */
    return value === expected ? true
      : toBeArray(value) && toBeArray(expected) ? toHaveLength(value, expected.length) && value.every((part, i) => toBe(part, expected[i]))
      : toBeDate(value) && toBeDate(expected) ? value.getTime() === expected.getTime()
                                                    // @ts-expect-error Object.keys(T) returns string and not keyof T
      : toBeObject(value) && toBeObject(expected) ? Object.keys(value).every(key => toBe(value[key], expected[key]))
      : false;
    /* eslint-enable indent */
    /* eslint-enable multiline-ternary */
  },

  /** @type {(value: unknown, needle: unknown) => boolean} - Checks if a haystack contains a needle. */
  toContain: (haystack, needle) => {
    const { toBe, toBeArray, toBeObject, toBeString } = MATCHERS;
    /* eslint-disable multiline-ternary */
    /* eslint-disable indent */
    return toBeArray(haystack) ? haystack.some(item => toBe(item, needle))
                                                     // @ts-expect-error Object.keys(T) returns string and not keyof T
      : toBeObject(haystack) && toBeObject(needle) ? Object.keys(needle).every(key => toBe(haystack[key], needle[key]))
      : toBeString(haystack) && toBeString(needle) ? haystack.includes(needle)
      : false;
    /* eslint-enable indent */
    /* eslint-enable multiline-ternary */
  },

  /** @type {(value: unknown) => value is { calls: any[]} } - Checks if a value is a spy object. */
  toHaveBeenCalled: value => {
    const { toBeObject, toBeFunction, toBeArray } = MATCHERS;
    return (toBeObject(value) || toBeFunction(value)) &&
      'calls' in value && toBeArray(value.calls) &&
      value.calls.length > 0;
  },

  /** @type {(value: unknown, times: number) => boolean} - Checks if a value has been called the specified number of times. */
  toHaveBeenCalledTimes: (value, times) => MATCHERS.toHaveBeenCalled(value) && value.calls.length === times,

  /** @type {(value: unknown, ...args: any[]) => boolean} - Checks if a value has been called with the specified arguments. */
  toHaveBeenCalledWith: (value, ...args) => {
    const { toHaveBeenCalled, toBe } = MATCHERS;
    return toHaveBeenCalled(value) && value.calls.some(call => toBe(args, call));
  },
};

/**
 * The expect function.
 * @template T
 * @typedef {T extends (value: any, ...rest: infer R) => boolean ? R : never} MatcherParams
 * @typedef {{
 *    [k in keyof typeof MATCHERS]: (...args: MatcherParams<typeof MATCHERS[k]>) => Expect<typeof MATCHERS>
 * } & { not: { [k in keyof typeof MATCHERS]: (...args: MatcherParams<typeof MATCHERS[k]>) => Expect<typeof MATCHERS> } }} Expect
 */

/**
 *
 * @param {any} value - The value to check
 * @returns {Expect<typeof MATCHERS>} An object with matcher functions
 */
export const expect = value => {
  /**
   * @param {typeof MATCHERS} matchers - The matchers to build
   * @param {boolean} [negate=false] - Whether to negate the matchers
   * @returns {Expect<typeof MATCHERS> }} An object with built matcher functions
   */
  const build = (matchers, negate = false) => {
    /** @type {(name: string) => string} */
    const decamelize = name => name.replace(/([A-Z])/g, ' $1').toLowerCase();

    // @ts-expect-error Object.entries(T) returns key string and not keyof T
    return Object.fromEntries(Object.entries(matchers).map(([name, fn]) => {
      /**
       * @param {any[]} args - The arguments passed to the matcher
       * @throws {Error} - Throw an error formatted according to matcher and arguments
       */
      const error = args => {
        const params = args.length ? JSON.stringify(args.length > 1 ? args : args[0]) : '';
        const expectation = `${negate ? 'not ' : ''}${decamelize(name)} ${params}`;
        const target = MATCHERS.toBeFunction(value) ? value.name : JSON.stringify(value);
        throw new Error(`Expected ${target} ${expectation}`);
      };

      // @ts-expect-error - TBH I'm not sure how to type this
      return [name, (...args) => (negate ? !fn(value, ...args) : fn(value, ...args)) ? expect(value) : error(args)];
    }));
  };

  return { ...build(MATCHERS), not: build(MATCHERS, true) };
};

/**
 * Extends the `expect` function with custom matchers.
 * @param {(matchers: typeof MATCHERS) => Record<string, MatcherBuilder>} matchersBuilder - The new matchers builder function
 */
expect.extend = matchersBuilder => Object.assign(MATCHERS, matchersBuilder(MATCHERS));

/* MOCKING ---------------------------------------------- */

/**
 * @typedef {{
 *    (...args: any[]): any;  // The mock function
 *    calls: any[];           // The list of arguments passed to the mock function
 *    response: any;          // The return value of the mock function
 *    implementation: any;    // The implementation function
 *    returnValue: Function;  // Sets the return value of the mock function
 *    reset: Function;        // Resets the mock function
 * }} Mock - The mock function and its properties
 *
 * Creates a mock function that can be used to spy on function calls and set a return value.
 * @param {Function} [implementation] - An optional implementation function to use when the mock function is called.
 * @returns {Mock} A mock function with properties
 */
export const mockFn = (implementation = undefined) => {
  /** @type {Mock} - The mock function */
  // @ts-expect-error Function attributes are added with reset() after creation
  const mock = (...args) => {
    mock.calls.push(args);
    mock.response = mock.implementation?.() ?? mock.response;
    return mock.response;
  };

  /**
   * Sets the return value of the mock function.
   * @param {any} response - The return value to set.
   */
  mock.returnValue = response => {
    mock.implementation = undefined;
    mock.response = response;
  };

  /** * Resets the mock function's state, including clearing calls and responses. */
  mock.reset = () => {
    mock.calls = [];
    mock.response = undefined;
    mock.implementation = implementation;
  };

  mock.reset(); // Initialize
  return mock;
};

/* SPY ------------------------------------------------ */

/**
 * @typedef {Object} Spy
 * @property {Array<any>} calls - The list of arguments passed to the function.
 * @property {Error | null} error - The error that occurred during the last execution.
 * @property {number} executions - The number of times the function has been called.
 * @property {boolean} executed - Whether the function has been called at least once.
 * @property {(implementation: Function) => Spy} mock - Mock the function with a given implementation.
 * @property {() => Spy} clear - Clear the spy's state.
 * @property {() => Spy} reset - Clear the spy's state and remove the mock implementation.
 * @property {() => Spy} restore - Restore the original function.
 */

/**
 * Spy on a function call.
 * @template T
 * @param {T} object The object containing the function to spy on.
 * @param {keyof T & string} methodName The name of the function to spy on.
 * @returns {Spy} The spy object
 */
export const spyOn = (object, methodName) => {
  if (typeof object[methodName] !== 'function') throw new TypeError(`The property ${methodName} is not a function.`);

  const original = object[methodName];

  /** @type {Function | null} - The mock implementation */
  let implementation = null;

  /** @type {Spy} - The spy object */
  const spy = {
    error: null,
    calls: [],

    /** @type {number} - The number of times the function has been called. */
    get executions() {
      return this.calls.length;
    },

    /** @type {boolean} - Whether the function has been called at least once. */
    get executed() {
      return this.calls.length > 0;
    },

    /**
     * Mock the function with a given implementation.
     * @param {Function} impl The implementation function to use when the function is called.
     * @returns {Spy} The spy
     */
    mock(impl) {
      implementation = impl;
      return this;
    },

    /**
     * Clear the spy's state (except for the mock implementation).
     * @returns {Spy} The spy
     */
    clear() {
      this.calls = [];
      this.error = null;
      return this;
    },

    /**
     * Reset the spy's state to initial state.
     * @returns {Spy} The spy
     */
    reset() {
      this.clear();
      implementation = null;
      return this;
    },

    /**
     * Restores the original function, removing any mock implementation.
     * @returns {Spy} The spy object.
     */
    restore() {
      object[methodName] = original;
      this.reset();
      return this;
    },
  };

  /**
   * Overrides the target function with a spy function that
   * tracks calls, errors and arguments.
   */
  // @ts-expect-error Override the original function causes a type error
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
