import { AsyncLocalStorage } from "async_hooks";
import { nanoid } from "nanoid";

const traceStore = new AsyncLocalStorage<{ traceId: string }>();

export function getTraceId(): string {
  return traceStore.getStore()?.traceId ?? "no-trace";
}

/**
 * Reads the x-trace-id header from the incoming request and runs `fn` inside
 * an AsyncLocalStorage context so that all log calls within the same async
 * chain automatically include the trace ID.
 *
 * Falls back to fn() without a trace context if headers() is unavailable
 * (e.g. in test environments or non-server contexts).
 */
export async function runWithTrace<T>(fn: () => Promise<T>): Promise<T> {
  try {
    const { headers } = await import("next/headers");
    const traceId = (await headers()).get("x-trace-id") ?? nanoid(12);
    return traceStore.run({ traceId }, fn);
  } catch {
    return fn();
  }
}
