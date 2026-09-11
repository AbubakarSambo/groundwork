import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A HEALTH CHECK DOES NOT SEND MAIL, AND DOES NOT SPEND THE MODEL BUDGET ON REQUEST.
 *
 * Two routes on the raw http adapter - outside every guard and the throttler, reachable by anyone
 * with the URL. /health/email sent real mail from our domain to any address in the query string:
 * an open relay whose comment said "safe to leave in". /health/ai made a real model call per
 * request, so a stranger could spend the budget at request rate.
 *
 * The mail route is gone. The model probe runs from inside the process on a schedule and the route
 * reads the record. Pinned as source because the failure was what the adapter routes were allowed
 * to do, and a boot test of the whole app is not something this suite has.
 */
const MAIN = readFileSync(join(__dirname, 'main.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const ANTHROPIC = readFileSync(join(__dirname, 'modules/conversation/anthropic.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('the routes on the raw adapter', () => {
  const adapterRoutes = [...MAIN.matchAll(/httpAdapter\.(get|post|use)\(\s*'([^']+)'/g)].map((m) => m[2]);

  it('are /health, /health/ai and /health/mail, and nothing that sends', () => {
    /* /health/mail reports whether delivery and bounce events are being read (fix plan D15). It sends nothing. */
    expect(adapterRoutes.sort()).toEqual(['/health', '/health/ai', '/health/mail']);
    expect(MAIN).not.toMatch(/\/health\/email/);
  });

  it('main.ts no longer knows how to send mail at all', () => {
    expect(MAIN).not.toMatch(/from 'resend'/);
    expect(MAIN).not.toMatch(/emails\.send/);
  });

  it('/health/ai reads the last probe and makes no model call of its own', () => {
    const at = MAIN.indexOf("httpAdapter.get('/health/ai'");
    /* To the handler's own closing brace, at two-space indent - an inner `app.get(..., { strict: false })` also ends in `});`. */
    const handler = MAIN.slice(at, MAIN.indexOf('\n  });', at) + 6);
    expect(handler).toMatch(/lastProbeOutcome\(\)/);
    expect(handler).not.toMatch(/healthCheck\(/);
  });
});

describe('the probe inside the process', () => {
  it('is the only caller of the real model call, which is private now', () => {
    expect(ANTHROPIC).toMatch(/private async healthCheck\(/);
    const callers = [...ANTHROPIC.matchAll(/this\.healthCheck\(\)/g)];
    expect(callers).toHaveLength(1);
    const probe = ANTHROPIC.slice(ANTHROPIC.indexOf('async probeTheEngine('), ANTHROPIC.indexOf('lastProbeOutcome('));
    expect(probe).toMatch(/this\.healthCheck\(\)/);
  });

  it('runs once at boot as well as on the clock, so a fresh deploy is not "no probe yet" for five minutes', () => {
    const boot = ANTHROPIC.slice(ANTHROPIC.indexOf('onApplicationBootstrap()'), ANTHROPIC.indexOf('@Cron('));
    expect(boot).toMatch(/this\.probeTheEngine\(\)/);
  });
});
