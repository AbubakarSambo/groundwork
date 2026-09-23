import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * THE LINK SURVIVES A DEPLOY, AND A PULL REQUEST, AND A MIGRATION.
 *
 * Hafsah, 23 September 2026, before putting a link in front of a hundred people: "i need to know
 * that when we do a PR, or make changes, we do not need to update the link."
 *
 * The answer is yes, and this is the guard that keeps it yes. Three things have to hold, and each
 * one is a thing somebody could plausibly change without noticing what it costs:
 *
 *   1. the token is written once, at creation, and never rewritten;
 *   2. the route the link points at keeps its path;
 *   3. nothing refuses a token for being old - no expiry, no version.
 *
 * A link handed out at an event, printed on a QR code on a screen, cannot be reissued. If any of
 * these three ever stops holding, the failure arrives as a room full of people who cannot answer.
 */
const API = join(__dirname, '../..');

describe('the join link is written once', () => {
  const SRC = readdirSync(join(API, 'modules/grounds')).concat()
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'))
    .map((f) => readFileSync(join(API, 'modules/grounds', f), 'utf8')).join('\n')
    + readFileSync(join(API, 'modules/entry/the-open-link.service.ts'), 'utf8');

  it('and only ever at creation', () => {
    /* Every write of the field, anywhere in the two modules that own it. */
    const writes = SRC.match(/joinToken:\s*crypto\.randomBytes/g) ?? [];
    expect(writes.length).toBeGreaterThan(0);
    /*
     * AND NO UPDATE ANYWHERE GOES NEAR IT.
     *
     * Asserted as the absence rather than by proving each write sits in a `create`: the data blocks
     * are long enough that proximity proves nothing. `inviteToken` IS rotated in this codebase -
     * `data: { inviteToken: freshToken, ... }` in grounds.service - so the machinery exists and is
     * deliberately not pointed at this token. What must never appear is a join token inside an
     * update.
     */
    const rotations: string[] = [];
    for (const m of SRC.matchAll(/\.(update|updateMany|upsert)\(\{/g)) {
      const after = SRC.slice(m.index!, m.index! + 400);
      if (/joinToken/.test(after)) rotations.push(after.slice(0, 80).replace(/\n/g, ' '));
    }
    expect(rotations).toEqual([]);
  });

  it('and carries no expiry, unlike an invite token', () => {
    const schema = readFileSync(join(API, '../prisma/schema.prisma'), 'utf8');
    /* The invite token has one and it is enforced. If the join token ever gains one, this fails. */
    expect(schema).toMatch(/inviteTokenExpiresAt\s+DateTime\?/);
    expect(schema).not.toMatch(/joinTokenExpiresAt/);
  });

  /* A token is refused for what the CHECK-IN is, never for how old the link is. */
  it('and is refused only where the check-in itself has finished', () => {
    const open = readFileSync(join(API, 'modules/entry/the-open-link.service.ts'), 'utf8');
    const whatThisIs = open.slice(open.indexOf('async whatThisIs('), open.indexOf('async start('));
    expect(whatThisIs).toMatch(/That link does not open anything/);
    expect(whatThisIs).toMatch(/\['CLOSED', 'RESOLVED', 'STALLED', 'PAUSED'\]/);
    expect(whatThisIs).not.toMatch(/expire|expiry|createdAt|olderThan|version/i);
  });

  /* The path in every link ever handed out. Renaming the route breaks all of them at once. */
  it('and the route it points at keeps its path', () => {
    const app = readFileSync(join(API, '../../client/src/App.tsx'), 'utf8');
    expect(app).toContain('<Route path="/answer" element={<AnswerFirstPage />} />');
  });

  /* And no migration has ever rewritten the column's contents. Adding the column is fine; an
     UPDATE over it would silently invalidate every link in existence. */
  it('and no migration rewrites the tokens that exist', () => {
    const dir = join(API, '../prisma/migrations');
    const offenders: string[] = [];
    for (const d of readdirSync(dir)) {
      const f = join(dir, d, 'migration.sql');
      let sql = '';
      try { sql = readFileSync(f, 'utf8'); } catch { continue; }
      if (/UPDATE\s+"?ground/i.test(sql) && /join_token/i.test(sql)) offenders.push(d);
    }
    expect(offenders).toEqual([]);
  });
});
