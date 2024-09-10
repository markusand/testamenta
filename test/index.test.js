import { describe, beforeEach, afterEach, it, expect, mockFn } from '../testamenta.js';

expect.extend(({ toBeNumber }) => ({
  toBeDecimal: value => toBeNumber(value) && value % 1,
}));

await describe('Matchers', () => {
  it('should check types', () => {
    expect(1).toBeNumber();
    expect(1.3).toBeDecimal();
    expect('hello').toBeString();
    expect([1, 2, 3]).toBeArray();
    expect({ hello: 'World' }).toBeObject();
    expect(true).toBeBoolean();
    expect(new Date(2000, 1, 1)).toBeDate();

    expect('1').not.toBeNumber();
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

  beforeEach(() => {
    console.log('      · Running before each test');
    return 10;
  });

  afterEach(() => {
    console.log('      · Running after each test');
    mock.reset();
  });

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
