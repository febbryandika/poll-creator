// Lightweight structured logging (SPEC §9): one JSON object per line to stdout/stderr.
// Zero dependencies — no external monitoring service, no log library. Bun handles both
// streams natively. Warn/error go to stderr, debug/info to stdout (12-factor separation).

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

// Debug lines stay out of production unless explicitly enabled.
const debugEnabled = process.env.NODE_ENV !== 'production' || process.env.LOG_DEBUG === 'true'

function write(level: LogLevel, msg: string, fields?: Record<string, unknown>): void {
  if (level === 'debug' && !debugEnabled) return
  const line = JSON.stringify({ level, time: new Date().toISOString(), msg, ...fields })
  if (level === 'warn' || level === 'error') console.error(line)
  else console.log(line)
}

export const logger = {
  debug: (msg: string, fields?: Record<string, unknown>) => write('debug', msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => write('info', msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => write('warn', msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => write('error', msg, fields),
}

/**
 * Error objects don't JSON.stringify usefully (`message`/`stack` are non-enumerable),
 * so flatten to a plain object before logging. Pass the result as a log field.
 */
export function serializeError(err: unknown): { name: string; message: string; stack?: string } {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack }
  }
  return { name: 'NonError', message: String(err) }
}
