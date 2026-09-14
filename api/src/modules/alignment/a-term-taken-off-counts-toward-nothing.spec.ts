import { readFileSync } from 'fs';
import { join } from 'path';

/* Source assertion, comments stripped first: the rule must be in the code, not in a note about it. */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const read = (f: string) => strip(readFileSync(join(__dirname, f), 'utf8'));

const SERVICE = read('agreements.service.ts');
const LISTENER = read('it-listens-for-a-check-in-and-writes-nothing-else.ts');
const CONTROLLER = read('alignment.controller.ts');

describe('a term taken off counts toward nothing', () => {
  it('is marked, never deleted', () => {
    const at = SERVICE.indexOf('async notWhatISaid(');
    expect(at).toBeGreaterThan(-1);
    const body = SERVICE.slice(at, SERVICE.indexOf('async checked(', at));
    expect(body).toContain('disputedAt: new Date()');
    expect(body).not.toMatch(/\.delete\(|deleteMany/);
  });

  it('needs somebody who can speak for a side, like every other statement about the contract', () => {
    const at = SERVICE.indexOf('async notWhatISaid(');
    const body = SERVICE.slice(at, SERVICE.indexOf('async checked(', at));
    expect(body).toContain('mustBeAbleToSpeakForThisSide');
  });

  it('drops out of every read of the terms', () => {
    /* The whole point of marking rather than deleting is that the reads have to remember. */
    for (const src of [SERVICE, LISTENER]) {
      const reads = src.split('terms:').slice(1).filter((s) => /where|select|include/.test(s.slice(0, 80)));
      expect(reads.length).toBeGreaterThan(0);
      for (const r of reads) expect(r.slice(0, 120)).toContain('disputedAt: null');
    }
  });

  it('is reachable, because a press nobody can press is a comment', () => {
    expect(CONTROLLER).toContain("@Post('terms/:termId/not-what-i-said')");
    expect(CONTROLLER).toContain('notWhatISaid(');
  });
});
