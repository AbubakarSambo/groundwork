
/**
 * DRIVING THE PRODUCT THE WAY A PERSON DOES.
 *
 * Every call here goes over HTTP to the running API, in the order a browser would make them, and
 * every email is read out of the dev-mail log rather than assumed. Nothing reaches into the
 * database to make a journey succeed - the database is only ever read, to check what the person
 * would have been left with.
 */
import * as fs from 'fs';

export const API = 'http://localhost:3000/api/v1';
const LOG = '/tmp/gw-api.log';
const ANSI = new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g');

export interface Step { did: string; got: string; friction?: string; failed?: boolean; ms?: number }

/** Anything past this and somebody is looking at a screen wondering whether it worked. */
export const A_WAIT_SOMEBODY_NOTICES_MS = 4000;
export const A_WAIT_SOMEBODY_ABANDONS_MS = 12000;

export class Run {
  readonly steps: Step[] = [];
  token: string | null = null;

  say(did: string, got: string, friction?: string, ms?: number) {
    /* Slowness is a finding in itself: the same answer after twenty seconds is a person deciding
       whether the product is broken. */
    let f = friction;
    if (ms && ms > A_WAIT_SOMEBODY_ABANDONS_MS) {
      f = f ?? `${Math.round(ms / 1000)}s with nothing on screen saying anything was happening`;
    } else if (ms && ms > A_WAIT_SOMEBODY_NOTICES_MS && !f) {
      f = `${Math.round(ms / 1000)}s wait`;
    }
    this.steps.push({ did, got, friction: f, ms });
  }

  /** What somebody read before they retried, refreshed or went looking for another way in. */
  sawBeforeRecovering(did: string, saw: string) {
    this.steps.push({ did, got: saw, friction: `what they saw first: "${saw.slice(0, 100)}"` });
  }
  broke(did: string, got: string) { this.steps.push({ did, got, failed: true }); }

  get failedAt(): string | null {
    const f = this.steps.find((s) => s.failed);
    return f ? `${f.did} -> ${f.got}` : null;
  }
  get frictions(): string[] {
    return this.steps.filter((s) => s.friction).map((s) => `${s.did}: ${s.friction}`);
  }
}

/** How long a person waited, because a correct answer after twenty seconds is not the same answer. */
export let lastCallMs = 0;

export async function call(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  token?: string | null,
): Promise<{ status: number; data: any; raw: any; ms: number }> {
  const began = Date.now();
  const r = await fetch(`${API}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const raw = await r.json().catch(() => ({}));
  lastCallMs = Date.now() - began;
  return { status: r.status, data: raw?.data ?? raw, raw, ms: lastCallMs };
}

/** Where the log had got to, so a journey only reads the mail it caused. */
export function mailMark(): number {
  try { return fs.statSync(LOG).size; } catch { return 0; }
}

export interface Mail { to: string; subject: string; body: string; link: string | null }

/** The emails written since a mark, in order. Read from the log the dev mailer writes. */
export function mailSince(mark: number): Mail[] {
  let text = '';
  try {
    const fd = fs.openSync(LOG, 'r');
    const size = fs.statSync(LOG).size;
    const buf = Buffer.alloc(Math.max(0, size - mark));
    fs.readSync(fd, buf, 0, buf.length, mark);
    fs.closeSync(fd);
    text = buf.toString('utf8');
  } catch { return []; }

  const out: Mail[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const head = lines[i].replace(ANSI, '').match(/\[DEV EMAIL\] To: (\S+) \| Subject: (.+)$/);
    if (!head) continue;
    const near = lines.slice(i + 1, i + 8).map((l) => l.replace(ANSI, ''));
    const bodyLine = near.find((l) => l.includes('[DEV EMAIL] Body:')) ?? '';
    const body = bodyLine.replace(/.*\[DEV EMAIL\] Body:\s*/, '');
    /* The links line, because stripping the tags for the body throws the href away. */
    const linkLine = near.find((l) => l.includes('[DEV EMAIL] Links:')) ?? '';
    const link = linkLine.replace(/.*\[DEV EMAIL\] Links:\s*/, '').split(' ')[0].match(/https?:\/\/\S+/);
    out.push({ to: head[1], subject: head[2].trim(), body, link: link ? link[0] : null });
  }
  return out;
}

/** A token out of a link, the way a person clicking it hands it back. */
export function tokenIn(link: string | null): string | null {
  if (!link) return null;
  const u = new URL(link);
  return u.searchParams.get('token') ?? u.searchParams.get('t');
}

export const anAddress = (who: string) => `${who}.${Date.now()}${Math.floor(Math.random() * 999)}@journey.test`;

export function record(file: string, row: unknown) {
  fs.appendFileSync(file, JSON.stringify(row) + '\n');
}
