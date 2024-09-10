# Testamenta

Lightweight, dependency-free test framework with a **Jest-like public API**. Useful for environments where bundlers and Node.js are not required, it allows you to test JavaScript code directly in the browser via a simple `<script>` import.

## Key Features

- **📖 Jest-like API**: Offers a public interface very similar to Jest (with its obvious limitations), making it intuitive for users already familiar with popular testing frameworks.

- **📦 No Setup**: Requires no installation or package management—simply import the framework using a script tag.

- **⏳ Async-Aware**: Supports asynchronous test execution via `async/await`.

- **🔍 Mocking**: Built-in support for mock functions and call tracking.

- **📝 Flexible Logging**: Outputs results to the console and the DOM.

## Getting Started

Copy the `testamenta.js` file to your project or import it from a CDN [unpkg](http://unpkg.com/testamenta) | [jsdelivr](https://cdn.jsdelivr.net/npm/testamenta).

It can also be installed with [npm](https://www.npmjs.com/package/testamenta), but it doesn't make much sense having more complete and robust options like **Jest**.

```html
// test.html

<script type="module">
  import { tests } from 'https://unpkg.com/testamenta';

  tests(['utils', 'plugins'], {
    path: new URL('.', import.meta.url).href, // path to test files
  });
</script>
```

Create test files named as `*.test.js` to be properly loaded. Test files use a syntax similar to [Jest](https://jestjs.io/docs/en/getting-started).

> [!WARNING]
> The call to `describe` must be awaited to properly run tests sequentially.

```js
import { describe, it, expect } from 'https://unpkg.com/testamenta';

await describe('Math operations', () => {
  it('should add two numbers', () => {
    expect(1 + 2).toBe(3);
  });
});
```

Both `describe` and `it` can be asynchronous and use **async/await**, and skipped by using  the `skip` modifier.

```js
import { describe, it, expect } from 'https://unpkg.com/testamenta';

await describe('Promises', () => {
  it('should await for a Promise', async () => {
    const value = await new Promise(resolve => {
      setTimeout(() => resolve(1), 1000);
    });
    expect(value).toBe(1);
  });
});
```

`beforeAll` and `afterAll` can be used to setup and clean up resources before and after each test in a suite. Returned value in beforeAll is passed as parameter to it and afterAll functions.

Mocking functions is supported, allowing you to simulate and track function calls during test execution.

```js
import { describe, it, expect, beforeAll, mockFn } from 'https://unpkg.com/testamenta';

await describe('Mocking', () => {
  const mock = mockFn();

  beforeAll(() => mock.reset());

  it('should mock a function', () => {
    mock(1, 2);
    mock(3, 4);

    expect(mock)
      .toHaveBeenCalledTimes(2);
      .toHaveBeenCalledWith(1, 2);
  });
})
```

## Assertion

The `expect` function allows for assertions within test cases. It provides a wide range of built-in matchers for testing various conditions:

- `toBe` Asserts strict equality.
- `toBeTruthy` Asserts that a value is truthy.
- `toBeBoolean`, `toBeNumber`, `toBeString`, `toBeArray`, `toBeDate`, `toBeObject`, `toBeFunction`: Type checks for primitives, objects and functions.
- `toHaveLength`: Asserts the length of an array or string.
- `toContain`: Verifies that an array, object or string contains a specific value.
- `toHaveBeenCalled`, `toHaveBeenCalledTimes`, `toHaveBeenCalledWith`: Matchers for verifying mock function behavior.

All matchers can be negated with the `not` modifier.

Multiple assertions can be chained together.

Extend the `expect` function to add additional custom matchers to increment testing flexibility.

```js
import { describe, it, expect } from 'https://unpkg.com/testamenta';

expect.extend(({ toBeNumber }) => ({
  toBeEven: value => toBeNumber(value) && value % 2 === 0,
}));

await describe('Custom matchers', () => {
  it('should assert even numbers', () => {
    expect(2).toBeEven();
    expect(3).not.toBeEven();
  });
});
```

## Development

To run in Node, execute `npm run dev`. Test suite will run in terminal in watch mode and will update on each change.

To run in browser, start a [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) in VSCode.
