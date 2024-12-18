export function tests(tests: string[], options: {
    path?: string;
}): Promise<void>;
export function beforeAll(fn: Function): void;
export function afterAll(fn: Function): void;
export function beforeEach(fn: Function): void;
export function afterEach(fn: Function): void;
export function it(name: string, test: Function): void;
export namespace it {
    function skip(name: string, test: Function): void;
}
export function describe(title: string, suite: () => void | Promise<void>): Promise<void>;
export namespace describe {
    function skip(title: string, suite: Function): void;
}
export namespace MATCHERS {
    let toBeTruthy: (value: unknown) => value is true;
    let toBeBoolean: (value: unknown) => value is boolean;
    let toBeNumber: (value: unknown) => value is number;
    let toBeString: (value: unknown) => value is string;
    let toBeArray: (value: unknown) => value is any[];
    let toBeDate: (value: unknown) => value is Date;
    let toBeObject: (value: unknown) => value is any;
    let toBeFunction: (value: unknown) => value is Function;
    let toHaveLength: (value: unknown, length: number) => boolean;
    let toBe: (value: unknown, expected: unknown) => boolean;
    let toContain: (value: unknown, needle: unknown) => boolean;
    let toHaveBeenCalled: (value: unknown) => value is {
        calls: any[];
    };
    let toHaveBeenCalledTimes: (value: unknown, times: number) => boolean;
    let toHaveBeenCalledWith: (value: unknown, ...args: any[]) => boolean;
}
export function expect(value: any): Expect<typeof MATCHERS>;
export namespace expect {
    /**
     * Extends the `expect` function with custom matchers.
     * @param {(matchers: typeof MATCHERS) => Record<string, MatcherBuilder>} matchersBuilder - The new matchers builder function
     */
    function extend(matchersBuilder: (matchers: typeof MATCHERS) => Record<string, MatcherBuilder>): any;
}
export function mockFn(implementation?: Function): Mock;
export function spyOn<T>(object: T, methodName: keyof T & string): Spy;
export type ExcludeFirst<T> = T extends (value: any, ...rest: infer R) => boolean ? (...args: R) => boolean : never;
/**
 * List of available matchers.
 */
export type MatcherBuilder = (value: any, ...args: any[]) => boolean;
/**
 * The expect function.
 */
export type MatcherParams<T> = T extends (value: any, ...rest: infer R) => boolean ? R : never;
/**
 * The expect function.
 */
export type Expect<T> = { [k in keyof typeof MATCHERS]: (...args: MatcherParams<(typeof MATCHERS)[k]>) => Expect<typeof MATCHERS>; } & {
    not: { [k in keyof typeof MATCHERS]: (...args: MatcherParams<(typeof MATCHERS)[k]>) => Expect<typeof MATCHERS>; };
};
/**
 * - The mock function and its properties
 *
 * Creates a mock function that can be used to spy on function calls and set a return value.
 */
export type Mock = {
    (...args: any[]): any;
    calls: any[];
    response: any;
    implementation: any;
    returnValue: Function;
    reset: Function;
};
export type Spy = {
    /**
     * - The list of arguments passed to the function.
     */
    calls: Array<any>;
    /**
     * - The error that occurred during the last execution.
     */
    error: Error | null;
    /**
     * - The number of times the function has been called.
     */
    executions: number;
    /**
     * - Whether the function has been called at least once.
     */
    executed: boolean;
    /**
     * - Mock the function with a given implementation.
     */
    mock: (implementation: Function) => Spy;
    /**
     * - Clear the spy's state.
     */
    clear: () => Spy;
    /**
     * - Clear the spy's state and remove the mock implementation.
     */
    reset: () => Spy;
    /**
     * - Restore the original function.
     */
    restore: () => Spy;
};
