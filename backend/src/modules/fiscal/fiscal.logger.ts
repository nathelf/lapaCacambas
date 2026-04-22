import { FISCAL_SENSITIVE_FIELDS } from './fiscal.constants';

const SENSITIVE = new Set<string>(FISCAL_SENSITIVE_FIELDS as unknown as string[]);

function maskDeep(obj: unknown, depth = 0): unknown {
  if (depth > 8 || obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(v => maskDeep(v, depth + 1));
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
      k,
      SENSITIVE.has(k) ? '••••••••' : maskDeep(v, depth + 1),
    ]),
  );
}

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

function emit(level: LogLevel, event: string, data?: Record<string, unknown>): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    module: 'fiscal',
    event,
    ...(data ? (maskDeep(data) as Record<string, unknown>) : {}),
  };
  const out = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log;
  out(JSON.stringify(entry));
}

export const FiscalLogger = {
  info(event: string, data?: Record<string, unknown>): void {
    emit('INFO', event, data);
  },

  warn(event: string, data?: Record<string, unknown>): void {
    emit('WARN', event, data);
  },

  error(event: string, err: unknown, data?: Record<string, unknown>): void {
    const errData =
      err instanceof Error
        ? { error_name: err.name, error_message: err.message }
        : { error: String(err) };
    emit('ERROR', event, { ...errData, ...data });
  },
};
