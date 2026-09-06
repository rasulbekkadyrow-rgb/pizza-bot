'use strict';

/**
 * Nol-bog'liqlikli (zero-dependency) strukturaviy logger.
 * - development: rangli, o'qish uchun qulay
 * - production: bir qatorli JSON (Grafana/Datadog uchun tayyor)
 */

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const COLORS = { debug: '\x1b[90m', info: '\x1b[36m', warn: '\x1b[33m', error: '\x1b[31m' };
const RESET = '\x1b[0m';

const isProd = (process.env.NODE_ENV || 'development') === 'production';
const threshold = LEVELS[process.env.LOG_LEVEL] || (isProd ? LEVELS.info : LEVELS.debug);

function serializeError(err) {
  if (!(err instanceof Error)) return err;
  return { name: err.name, message: err.message, stack: err.stack, ...(err.code && { code: err.code }) };
}

function write(level, message, meta) {
  if (LEVELS[level] < threshold) return;

  const payload = meta instanceof Error ? { error: serializeError(meta) } : meta;

  if (isProd) {
    process.stdout.write(
      JSON.stringify({ ts: new Date().toISOString(), level, message, ...(payload || {}) }) + '\n'
    );
    return;
  }

  const time = new Date().toLocaleTimeString('uz-UZ', { hour12: false });
  const tag = `${COLORS[level]}${level.toUpperCase().padEnd(5)}${RESET}`;
  const extra = payload ? ` ${JSON.stringify(payload, null, 0)}` : '';
  process.stdout.write(`\x1b[90m${time}${RESET} ${tag} ${message}${extra}\n`);
}

const logger = {
  debug: (msg, meta) => write('debug', msg, meta),
  info: (msg, meta) => write('info', msg, meta),
  warn: (msg, meta) => write('warn', msg, meta),
  error: (msg, meta) => write('error', msg, meta),
  /** Kichik "child" logger — barcha loglarga bir xil kontekst qo'shadi. */
  child(context) {
    return {
      debug: (m, x) => write('debug', m, { ...context, ...x }),
      info: (m, x) => write('info', m, { ...context, ...x }),
      warn: (m, x) => write('warn', m, { ...context, ...x }),
      error: (m, x) => write('error', m, x instanceof Error ? { ...context, error: serializeError(x) } : { ...context, ...x }),
    };
  },
};

module.exports = logger;
