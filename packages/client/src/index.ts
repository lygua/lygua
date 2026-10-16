/**
 * @module @lygua/client
 * Type-safe, Promise-based RPC client for Google Apps Script Web Apps and Add-ons.
 */

export interface GasClientOptions<TContract extends object = Record<string, unknown>> {
  /**
   * Mock implementation table for local development (e.g. running inside Vite dev server).
   */
  mocks?: Partial<{
    [K in keyof TContract]: TContract[K] extends (...args: infer Args) => infer Ret
      ? (...args: Args) => Ret | Promise<Awaited<Ret>>
      : unknown;
  }>;
  /**
   * Simulated network delay in milliseconds when invoking mock functions (default: 150ms).
   */
  mockDelayMs?: number;
  /**
   * Execution timeout in milliseconds before rejecting with a timeout error (default: 30000ms).
   */
  timeoutMs?: number;
  /**
   * Optional logger function. Pass `null` or `false` to disable dev logging.
   */
  logger?: ((message: string, ...details: unknown[]) => void) | false;
}

export class GasRpcError extends Error {
  readonly functionName: string;
  readonly args: unknown[];

  constructor(message: string, functionName: string, args: unknown[], cause?: unknown) {
    super(message, { cause });
    this.name = 'GasRpcError';
    this.functionName = functionName;
    this.args = args;
  }
}

/**
 * Returns true if running within a Google Apps Script client container (google.script.run is present).
 */
export function isGasEnvironment(): boolean {
  if (typeof window === 'undefined' && typeof globalThis === 'undefined') return false;
  const root = typeof window !== 'undefined' ? window : globalThis;
  const google = (root as Record<string, unknown>).google as Record<string, unknown> | undefined;
  const script = google?.script as Record<string, unknown> | undefined;
  return typeof script?.run === 'object' && script.run !== null;
}

/**
 * Promisifies a raw `google.script.run` invocation with timeout support.
 */
export function callGas<TResult = unknown>(
  functionName: string,
  args: unknown[] = [],
  options: { timeoutMs?: number } = {}
): Promise<TResult> {
  const timeoutMs = options.timeoutMs ?? 30000;

  return new Promise<TResult>((resolve, reject) => {
    if (!isGasEnvironment()) {
      return reject(
        new GasRpcError(
          `Cannot call "${functionName}": google.script.run is not available in the current environment. Use createGasClient() with mocks for local development.`,
          functionName,
          args
        )
      );
    }

    const root = typeof window !== 'undefined' ? window : globalThis;
    const runner = ((root as Record<string, unknown>).google as Record<string, unknown>)
      .script as Record<string, unknown>;
    const scriptRun = runner.run as Record<string, unknown>;

    let timer: ReturnType<typeof setTimeout> | undefined;
    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        reject(
          new GasRpcError(
            `Call to "${functionName}" timed out after ${timeoutMs}ms.`,
            functionName,
            args
          )
        );
      }, timeoutMs);
    }

    const targetFn = scriptRun[functionName];
    if (typeof targetFn !== 'function') {
      if (timer) clearTimeout(timer);
      return reject(
        new GasRpcError(
          `Server function "${functionName}" is not exported on google.script.run. Ensure the function is defined globally on the Apps Script backend.`,
          functionName,
          args
        )
      );
    }

    const boundRunner = (scriptRun as {
      withSuccessHandler: (cb: (value: TResult) => void) => {
        withFailureHandler: (cb: (err: unknown) => void) => Record<string, (...a: unknown[]) => void>;
      };
    })
      .withSuccessHandler((result: TResult) => {
        if (timer) clearTimeout(timer);
        resolve(result);
      })
      .withFailureHandler((err: unknown) => {
        if (timer) clearTimeout(timer);
        const errMsg = err instanceof Error ? err.message : String(err);
        reject(new GasRpcError(errMsg, functionName, args, err));
      });

    boundRunner[functionName](...args);
  });
}

/**
 * Creates a type-safe Proxy client representing your Apps Script backend functions.
 * Automatically falls back to mock implementations when running locally outside of Apps Script.
 */
export function createGasClient<TContract extends object>(
  options: GasClientOptions<TContract> = {}
): TContract {
  const mockDelayMs = options.mockDelayMs ?? 150;
  const timeoutMs = options.timeoutMs ?? 30000;
  const log = options.logger === false ? () => {} : (options.logger ?? console.log);

  return new Proxy({} as TContract, {
    get(_target, prop: string | symbol) {
      if (typeof prop !== 'string') return undefined;

      return async (...args: unknown[]) => {
        if (isGasEnvironment()) {
          return callGas(prop, args, { timeoutMs });
        }

        // Running in local dev mode (Vite / local browser)
        const mockFn = options.mocks?.[prop as keyof TContract];
        if (typeof mockFn === 'function') {
          log(`[LyguaClient:mock] -> ${prop}(`, ...args, `)`);
          if (mockDelayMs > 0) {
            await new Promise((res) => setTimeout(res, mockDelayMs));
          }
          const result = await (mockFn as (...a: unknown[]) => unknown)(...args);
          log(`[LyguaClient:mock] <- ${prop} resolved:`, result);
          return result;
        }

        throw new GasRpcError(
          `[LyguaClient] No mock provided for server function "${prop}". Running locally outside of Apps Script. Provide a mock in createGasClient({ mocks: { ${prop}: ... } }) to simulate this call.`,
          prop,
          args
        );
      };
    },
  });
}
