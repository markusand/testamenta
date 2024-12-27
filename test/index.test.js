import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect, mockFn, spyOn } from '../testamenta.js';

expect.extend(({ toBeNumber }) => ({
  toBeDecimal: value => toBeNumber(value) && value % 1 !== 0,
}));

await describe('Matchers', () => {
  it('should check types', () => {
    expect(1).toBeNumber();
    // @ts-expect-error Cannot infer generated matchers with extend
    expect(1.3).toBeDecimal();
    expect('hello').toBeString();
    expect([1, 2, 3]).toBeArray();
    expect({ hello: 'World' }).toBeObject();
    expect(true).toBeBoolean();
    expect(new Date(2000, 1, 1)).toBeDate();

    expect('1').not.toBeNumber();
    // @ts-expect-error Cannot infer generated matchers with extend
    expect(1).not.toBeDecimal();
    expect(1).not.toBeString();
    expect('[1, 2, 3]').not.toBeArray();
    expect('{ hello: World }').not.toBeObject();
    expect('true').not.toBeBoolean();
    expect(new Date('')).not.toBeDate();
  });

  it('should check truthyness', () => {
    expect(1).toBeTruthy();
    expect('hello world').toBeTruthy();
    expect([1, 2, 3]).toBeTruthy();
    expect({ hello: 'World' }).toBeTruthy();
    expect(true).toBeTruthy();
    expect(new Date(2000, 1, 1)).toBeTruthy();

    expect(0).not.toBeTruthy();
    expect('').not.toBeTruthy();
    expect(false).not.toBeTruthy();
    expect(null).not.toBeTruthy();
    expect(undefined).not.toBeTruthy();
    expect(Number.NaN).not.toBeTruthy();
  });

  it('should check equality', () => {
    expect(1).toBe(1);
    expect('hello').toBe('hello');
    expect([1, 2, 3]).toBe([1, 2, 3]);
    expect({ hello: 'World', hola: undefined }).toBe({ hello: 'World' });
    expect(true).toBe(true);
    expect(new Date(2000, 1, 1)).toBe(new Date(2000, 1, 1));

    expect(2).not.toBe(1);
    expect('world').not.toBe('hello');
    expect([1, 2]).not.toBe([1, 2, 3]);
    expect({ hello: 'Mundo' }).not.toBe({ hello: 'World' });
    expect(false).not.toBe(true);
    expect(new Date(2000, 1, 2)).not.toBe(new Date(2000, 1, 1));
  });

  it('should check length', () => {
    expect([1, 2, 3]).toHaveLength(3);
    expect([1, 2]).not.toHaveLength(3);
    expect('Hello').toHaveLength(5);
    expect('Hello world').not.toHaveLength(5);
  });

  it('should check contain', () => {
    expect([1, 2, 3]).toContain(3);
    expect('hello').toContain('l');
    expect({ hello: 'world', hola: 'mon' }).toContain({ hello: 'world' });

    expect([1, 2, 3]).not.toContain(4);
    expect('hello').not.toContain('w');
    expect({ hola: 'mon' }).not.toContain({ hello: 'world' });
  });

  it('should check mock calls', () => {
    const mock = mockFn();
    mock(1, 2, 3);
    expect(mock)
      .toHaveBeenCalled()
      .toHaveBeenCalledTimes(1)
      .toHaveBeenCalledWith(1, 2, 3);
  });

  it('should check errors', () => {
    const fn = () => {};
    const throwFn = () => { throw new Error('Hello world!!'); };

    expect(throwFn).toThrow();
    expect(throwFn).toThrow('Hello world!!');
    expect(throwFn).toThrow(new Error('Hello world!!'));
    expect(throwFn).toThrow(/!+/);

    expect(fn).not.toThrow();
    expect(throwFn).not.toThrow(new Error('Hello world'));
    expect(throwFn).not.toThrow(/a+/);
    expect(throwFn).not.toThrow('Hello world!');

    try {
      expect(123).toThrow();
      throw new Error('Test should fail if value in expect is not a function');
    } catch (error) {
      if (!(error instanceof Error) || error.message !== 'toThrow require a function as expect value') throw error;
    }

    try {
      // @ts-expect-error Forcing an invalid 123 parameter
      expect(throwFn).toThrow(123);
      throw new Error('Test should fail if toThrow expected is not valid');
    } catch (error) {
      if (!(error instanceof Error) || error.message !== 'Invalid expected error type') throw error;
    }
  });

  it('should handle async tests', async () => {
    const value = await new Promise(resolve => {
      setTimeout(() => resolve(1), 1000);
    });
    expect(value).toBe(1);
  });
});

await describe('Mocking', () => {
  it('should mock functions', () => {
    const mock = mockFn();
    const mock2 = mockFn();

    mock(1, 2, 3);
    expect(mock)
      .toHaveBeenCalled()
      .toHaveBeenCalledTimes(1)
      .toHaveBeenCalledWith(1, 2, 3);

    expect(mock2).not.toHaveBeenCalled();

    mock(4, 5, 6);
    expect(mock)
      .not.toHaveBeenCalledTimes(1)
      .not.toHaveBeenCalledWith(7, 8, 9);
  });

  it('should change implementation of mocked function', () => {
    const mock = mockFn(() => 1);
    expect(mock()).toBe(1);

    mock.reset();
    mock.implementation = () => 2;
    expect(mock()).toBe(2);

    mock.returnValue(3);
    expect(mock()).toBe(3);

    mock.reset();
    expect(mock()).toBe(1);
  });
});

await describe('Hooks', () => {
  const mock = mockFn(() => 1);

  beforeAll(() => console.log('   ⏳ Running before all tests'));
  afterAll(() => console.log('   ⌛️ Running after all tests'));

  beforeEach(() => {
    console.log('      · Running before each test');
    return 10;
  });

  afterEach(() => {
    console.log('      · Running after each test');
    mock.reset();
  });

  // @ts-expect-error Cannot infer state type
  it('should receive state from beforeEach', state => {
    expect(state).toBe(10);
  });

  it('should reset mock after each test #1', () => {
    expect(mock()).toBe(1);
    mock.returnValue(2);
  });

  it('should reset mock after each test #2', () => {
    expect(mock()).toBe(1);
  });
});

await describe('Spy', () => {
  const match = spyOn(window, 'matchMedia').mock(() => 1);

  afterEach(() => match.clear());
  afterAll(() => match.restore());

  it('should spy on a function', () => {
    const result = window.matchMedia('value');
    window.matchMedia('');
    expect(match)
      .toHaveBeenCalled()
      .toHaveBeenCalledTimes(2)
      .toHaveBeenCalledWith('value');
    expect(result).toBe(1);
  });

  it('should have cleared the spy after previous test', () => {
    window.matchMedia('');
    expect(match).toHaveBeenCalledTimes(1);
    expect(match).not.toHaveBeenCalledWith('value');
  });

  it('should reset the spy', () => {
    match.reset();
    const result = window.matchMedia('(prefers-color-scheme: dark)');
    expect(match).toHaveBeenCalledTimes(1);
    expect(result)
      .toBeObject()
      .toContain({ media: '(prefers-color-scheme: dark)' });
  });
});

await describe.skip('Skip suite', () => {});

await describe('Skip tests', () => {
  it.skip('Skip test', () => {});
  it.skip('Skip test', () => {});
});
