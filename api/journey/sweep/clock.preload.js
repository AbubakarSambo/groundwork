/**
 * THE TEST BED'S CLOCK AND SCHEDULER (user journey sweep, 7 October 2026). Test only.
 *
 * The API is started with `node -r journey/sweep/clock.preload.js dist/main.js` by `bed.ts up`, and ONLY
 * then. Nothing in src/ imports it, and a production start never loads it. Without SWEEP_CLOCK_PORT it
 * does nothing at all.
 *
 * WHAT IT DOES, in the API's own process, so the code that runs is the code that ships:
 *
 *  1. THE CLOCK. `Date` is replaced by a copy that is the real time plus an offset. `new Date()` and
 *     `Date.now()` anywhere in the API (the jobs, the services, the sign-in tokens) read the moved time.
 *     Dates the database makes itself (now() in SQL) are not moved.
 *
 *  2. THE SCHEDULER, RUN BY HAND. The API's scheduled jobs are the @Cron methods Nest's scheduler finds.
 *     This finds the same methods the same way (the scheduler's own metadata), and runs one by calling
 *     the method on the live instance, wrapped in the same try and catch the scheduler wraps it in. The
 *     scheduler's own timers are NOT started (they would fire on real time, against a moved clock) unless
 *     SWEEP_REAL_SCHEDULER=on.
 *
 *  3. "MOVE THE CLOCK AND RUN WHAT WOULD HAVE RUN". /advance sets the clock forward and, for every job
 *     whose cron time falls in between, in time order, sets the clock to that exact time and runs the job,
 *     as the scheduler would have. Each job's own time zone is used.
 *
 * A small HTTP control on 127.0.0.1:SWEEP_CLOCK_PORT:
 *   GET  /clock                         the real time, the API's time and the offset
 *   POST /clock {to|by|reset}           move the clock only (no jobs run)
 *   GET  /jobs                          every scheduled job: name, cron time, time zone
 *   POST /run {job}                     run one job now, as the scheduler runs it
 *   POST /advance {to|by, skip?, only?} move the clock and run what falls in between (it runs on; it answers at once)
 *   GET  /advance                       how far it has got, and the result when it is done
 *
 * `by` is a number of milliseconds, or text like "1d", "3h", "30m".
 */
'use strict';
const http = require('http');

const PORT = Number(process.env.SWEEP_CLOCK_PORT || 0);
if (!PORT) return;

/* ------------------------------------------------------------------ the clock */
const RealDate = Date;
let offsetMs = 0;
class MovedDate extends RealDate {
  constructor(...args) {
    if (args.length === 0) super(RealDate.now() + offsetMs);
    else super(...args);
  }
  static now() { return RealDate.now() + offsetMs; }
  /* A date made by node itself (a file's time, say) is still a Date, so `x instanceof Date` stays true for every Date. */
  static [Symbol.hasInstance](x) { return x instanceof RealDate; }
}
global.Date = MovedDate;
global.__GW_RealDate = RealDate;

/*
 * GOOGLE MUST SEE THE REAL TIME. The model is reached with a signed token whose issue and expiry times Google
 * checks against its own clock; signed with a moved clock it is refused ("Invalid JWT ... check your iat and exp"),
 * and every model call fails. So the code that signs and caches that token (google-auth-library and gtoken) is
 * loaded with its own `Date` that is the real one. Nothing else is changed: the API's own code, and the jobs,
 * read the moved time.
 */
{
  const Module = require('module');
  const compile = Module.prototype._compile;
  Module.prototype._compile = function (content, filename) {
    if (/[\\/]node_modules[\\/](google-auth-library|gtoken|gcp-metadata)[\\/]/.test(filename)) {
      const real = 'var Date = globalThis.__GW_RealDate;';
      content = /^\s*['"]use strict['"];?/.test(content) ? content.replace(/^(\s*['"]use strict['"];?)/, `$1 ${real}`) : `${real} ${content}`;
    }
    return compile.call(this, content, filename);
  };
}

const parseBy = (v) => {
  if (typeof v === 'number') return v;
  const m = /^(-?\d+(?:\.\d+)?)\s*(ms|s|m|h|d|w)?$/.exec(String(v).trim());
  if (!m) throw new Error(`Cannot read "${v}" as a length of time. Use a number of milliseconds, or text like 1d, 3h, 30m.`);
  const unit = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 }[m[2] || 'ms'];
  return Number(m[1]) * unit;
};
const now = () => RealDate.now() + offsetMs;
/* The offset is kept in a file, so restarting the API does not put the clock back while the database holds what happened in the days it moved through. */
const KEEP = process.env.SWEEP_CLOCK_FILE;
const keep = () => { if (KEEP) { try { require('fs').writeFileSync(KEEP, String(offsetMs)); } catch { /* the clock still moves */ } } };
if (KEEP) { try { offsetMs = Number(require('fs').readFileSync(KEEP, 'utf8')) || 0; } catch { offsetMs = 0; } }
const setNow = (t) => { offsetMs = t - RealDate.now(); keep(); };

/* ------------------------------------------------------------------ the scheduler's jobs */
if (process.env.SWEEP_REAL_SCHEDULER !== 'on') {
  /* The scheduler's timers do not start, so a job only ever runs when this says so. */
  try {
    const { CronJob } = require('cron');
    CronJob.prototype.start = function start() { /* held by the test bed */ };
  } catch (e) { console.warn('[test-bed] could not hold the scheduler timers:', e.message); }
}

let app = null;
try {
  const core = require('@nestjs/core');
  const create = core.NestFactory.create.bind(core.NestFactory);
  core.NestFactory.create = async (...args) => { const a = await create(...args); app = a; return a; };
} catch (e) { console.warn('[test-bed] could not watch for the app:', e.message); }

const jobs = () => {
  if (!app) throw new Error('The API has not finished starting.');
  const { DiscoveryService, MetadataScanner } = require('@nestjs/core');
  const C = require('@nestjs/schedule/dist/schedule.constants');
  const discovery = app.get(DiscoveryService, { strict: false });
  const scanner = app.get(MetadataScanner, { strict: false });
  const out = [];
  for (const w of [...discovery.getControllers(), ...discovery.getProviders()]) {
    const instance = w.instance;
    if (!instance || !Object.getPrototypeOf(instance)) continue;
    for (const key of scanner.getAllMethodNames(Object.getPrototypeOf(instance))) {
      const ref = instance[key];
      const meta = Reflect.getMetadata(C.SCHEDULE_CRON_OPTIONS, ref);
      if (!meta) continue;
      out.push({ name: `${instance.constructor.name}.${key}`, cron: String(meta.cronTime), timeZone: meta.timeZone || 'UTC', run: async () => { try { await ref.call(instance); return { ok: true }; } catch (error) { return { ok: false, error: String((error && error.stack) || error) }; } } });
    }
  }
  /* A provider that several modules each list is found once per module (AnthropicService, five times). One stands for them: the copies share the database and the jobs are written to run more than once. */
  const seen = new Set();
  return out.filter((j) => (seen.has(j.name) ? false : (seen.add(j.name), true))).sort((a, b) => a.name.localeCompare(b.name));
};

/** Not run by an advance unless asked for by name: it asks the model if it is up, every five minutes, which is a model call per five minutes of clock. */
const NOT_UNLESS_ASKED = [/probeTheEngine/];

const runOne = async (j) => {
  const t0 = RealDate.now();
  const r = await j.run();
  /* The scheduler logs a job's failure as an error; so does this, in the same place, so the log capture sees it. */
  if (!r.ok) { try { new (require('@nestjs/common').Logger)('Scheduler').error(r.error); } catch { console.error(r.error); } }
  return { job: j.name, at: new RealDate(now()).toISOString(), ms: RealDate.now() - t0, ...r };
};

/** Every time this job would have fired after `from` and up to `to`, with the job's own time zone. */
const firesBetween = (j, from, to) => {
  const { CronTime } = require('cron');
  const ct = new CronTime(j.cron, j.timeZone);
  const times = [];
  /* The time zone is passed again here: without it the cron library reads the time in this computer's own zone. */
  let cursor = new Date(from);
  for (let i = 0; i < 20000; i++) {
    const next = ct.getNextDateFrom(cursor, j.timeZone).toJSDate().getTime();
    if (next > to) break;
    times.push(next);
    cursor = new Date(next + 1000);
  }
  return times;
};

/* ------------------------------------------------------------------ the control */
const body = (req) => new Promise((ok) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => ok(b ? JSON.parse(b) : {})); });
const send = (res, code, v) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(v, null, 2)); };
const state = () => ({ realNow: new RealDate().toISOString(), apiNow: new RealDate(now()).toISOString(), offsetMs, offsetDays: Math.round((offsetMs / 86400000) * 100) / 100, realScheduler: process.env.SWEEP_REAL_SCHEDULER === 'on' });
const target = (b) => {
  if (b.to) { const t = RealDate.parse(b.to); if (Number.isNaN(t)) throw new Error(`Cannot read "${b.to}" as a date and time.`); return t; }
  if (b.by !== undefined) return now() + parseBy(b.by);
  throw new Error('Say where to move the clock: "to" (a date and time) or "by" (like 1d).');
};
let progress = { running: false };

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'GET' && url.pathname === '/clock') return send(res, 200, state());
    if (req.method === 'GET' && url.pathname === '/jobs') return send(res, 200, jobs().map(({ name, cron, timeZone }) => ({ name, cron, timeZone })));
    if (req.method === 'POST' && url.pathname === '/clock') {
      const b = await body(req);
      if (b.reset) { offsetMs = 0; keep(); } else setNow(target(b));
      return send(res, 200, state());
    }
    if (req.method === 'POST' && url.pathname === '/run') {
      const b = await body(req);
      const j = jobs().find((x) => x.name === b.job || x.name.endsWith(`.${b.job}`));
      if (!j) return send(res, 404, { error: `No scheduled job called "${b.job}". GET /jobs lists them.` });
      return send(res, 200, await runOne(j));
    }
    if (req.method === 'GET' && url.pathname === '/advance') return send(res, 200, { ...state(), ...progress });
    if (req.method === 'POST' && url.pathname === '/advance') {
      if (progress.running) return send(res, 409, { error: 'An advance is already running.', ...progress });
      const b = await body(req);
      const from = now();
      const to = target(b);
      if (to < from) throw new Error('The clock only moves forward here. Use /clock with "to" to set it back.');
      const only = (b.only || []).map((p) => new RegExp(p, 'i'));
      const skip = (b.skip || []).map((p) => new RegExp(p, 'i'));
      const chosen = jobs().filter((j) => (only.length ? only.some((r) => r.test(j.name)) : !NOT_UNLESS_ASKED.some((r) => r.test(j.name))) && !skip.some((r) => r.test(j.name)));
      const fires = [];
      for (const j of chosen) for (const t of firesBetween(j, from, to)) fires.push({ t, j });
      fires.sort((a, c) => a.t - c.t || a.j.name.localeCompare(c.j.name));
      /* It can take minutes (a night's jobs write reports with the model), so it runs on and is read with GET /advance. */
      progress = { running: true, from: new RealDate(from).toISOString(), to: new RealDate(to).toISOString(), planned: fires.length, done: 0, current: null, failed: [], runs: [], finishedAt: null };
      (async () => {
        try {
          for (const f of fires) {
            setNow(f.t); progress.current = `${f.j.name} at ${new RealDate(f.t).toISOString()}`;
            const r = await runOne(f.j); progress.done += 1;
            progress.runs.push({ job: r.job, at: r.at, ms: r.ms, ok: r.ok });
            if (!r.ok) progress.failed.push({ job: r.job, at: r.at, error: r.error });
          }
          setNow(to);
        } catch (e) { progress.failed.push({ job: '(the advance itself)', at: new RealDate(now()).toISOString(), error: String((e && e.stack) || e) }); }
        finally { progress.running = false; progress.current = null; progress.finishedAt = new RealDate().toISOString(); }
      })();
      return send(res, 202, { started: true, planned: fires.length, ...state() });
    }
    send(res, 404, { error: 'GET /clock /jobs, POST /clock /run /advance' });
  } catch (e) { send(res, 400, { error: String(e.message || e) }); }
}).listen(PORT, '127.0.0.1', () => console.warn(`[test-bed] clock and scheduler control on 127.0.0.1:${PORT}. The scheduler's own timers are ${process.env.SWEEP_REAL_SCHEDULER === 'on' ? 'ON' : 'held'}.`));
