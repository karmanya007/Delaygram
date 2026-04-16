import { getTraceId } from "@/lib/trace";

type LogLevel = "info" | "warn" | "error";

type LogMetadata = Record<string, unknown> | undefined;

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return error;
}

function writeLog(level: LogLevel, context: string, message: string, metadata?: LogMetadata) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    context,
    message,
    traceId: getTraceId(),
    metadata,
  };

  const logger = level === "error" ? console.error : level === "warn" ? console.warn : console.info;
  logger(JSON.stringify(payload));
}

export function logInfo(context: string, message: string, metadata?: LogMetadata) {
  writeLog("info", context, message, metadata);
}

export function logWarn(context: string, message: string, metadata?: LogMetadata) {
  writeLog("warn", context, message, metadata);
}

export function logError(
  context: string,
  error: unknown,
  metadata?: LogMetadata,
) {
  writeLog("error", context, "Unhandled error", {
    ...metadata,
    error: serializeError(error),
  });
}
