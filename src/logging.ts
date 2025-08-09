import pino from "pino";
export const log = pino({ level: process.env.LOG_LEVEL || "info" });
export const withTrace = (traceId?: string) => log.child({ traceId });
