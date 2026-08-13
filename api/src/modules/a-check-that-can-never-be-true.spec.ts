import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * THE BUG CLASS THAT COST G37 ITS ENTIRE PURPOSE.
 *
 * The context chat asks "how long should this run?" when `timelineDays` is absent. The column is
 * `NOT NULL`. So the question the feature exists to ask had never once been asked, and nothing
 * failed: no test broke, no error logged, no user complained, because the branch simply never ran.
 *
 * That is the shape worth guarding. A guard that can never be true is invisible in every way a
 * normal bug is visible - it has no failure mode, only an absence. The only way to catch it is to
 * compare what the code checks for against what the schema permits.
 *
 * WHAT THIS DOES. For every non-nullable, non-Boolean column, look for `if (!thing.column)` or
 * `if (thing.column === null)` in any file that reads that model. Booleans are excluded because
 * `!flag` is how a boolean is meant to be read.
 *
 * WHAT IT DELIBERATELY CANNOT DO. It matches on field NAME, not on what the object actually is, so a
 * DTO field or a local variable sharing a column's name looks the same to it. Every hit needs a human
 * read; the four below were all checked and are all fine. The point is that a NEW hit is a question
 * somebody has to answer, which is exactly the attention G37 never got.
 */
const SRC = join(__dirname, '..');
const SCHEMA = readFileSync(join(__dirname, '../../prisma/schema.prisma'), 'utf8');

/** column name -> per-model spec, so nullability is read from the schema rather than assumed. */
const perModel = new Map<string, Map<string, { type: string; optional: boolean }>>();
for (const block of SCHEMA.split('\nmodel ').slice(1)) {
  const model = block.split(/\s/)[0];
  const fields = new Map<string, { type: string; optional: boolean }>();
  for (const raw of block.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('//') || line.startsWith('@@') || line.startsWith('}')) continue;
    const m = /^(\w+)\s+([A-Za-z]+)(\[\])?(\?)?\s*(.*)$/.exec(line);
    if (!m) continue;
    const [, field, type, arr, opt, rest] = m;
    if (arr || /relation/.test(rest)) continue;
    fields.set(field, { type, optional: !!opt });
  }
  perModel.set(model, fields);
}

const files: string[] = [];
const walk = (dir: string) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.ts') && !p.includes('.spec.')) files.push(p);
  }
};
walk(SRC);
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/**
 * Hits that have been read and are fine. Each is a name collision: the thing being checked is a
 * request body or a local, not the column the name matches.
 */
const CHECKED_AND_FINE = new Set([
  'modules/entry/entry.service.ts:email',           // the request body's email, before a user exists
  'modules/entry/entry.service.ts:userId',          // GroundParticipant.userId, which IS nullable
  'modules/conversation/conversation.service.ts:text', // a chat message, not a stored note
]);

function findHits() {
  const hits: string[] = [];
  for (const f of files) {
    const code = strip(readFileSync(f, 'utf8'));
    const rel = f.replace(SRC + '/', '');
    /** Only models this file actually reads, so an unrelated file's variables are not scanned. */
    const modelsHere = [...perModel.keys()].filter(m =>
      new RegExp(`prisma\\.${m[0].toLowerCase()}${m.slice(1)}\\.`).test(code),
    );
    if (!modelsHere.length) continue;

    const re = /if\s*\(\s*!(?:\w+(?:\??\.\w+)*)\.(\w+)\b|if\s*\(\s*(?:\w+(?:\??\.\w+)*)\.(\w+)\s*===?\s*null/g;
    for (const m of code.matchAll(re)) {
      const field = m[1] ?? m[2];
      for (const model of modelsHere) {
        const spec = perModel.get(model)!.get(field);
        if (!spec || spec.optional || spec.type === 'Boolean') continue;
        const key = `${rel}:${field}`;
        if (CHECKED_AND_FINE.has(key)) break;
        hits.push(`${key} (${model}.${field}: ${spec.type}, not nullable)`);
        break;
      }
    }
  }
  return [...new Set(hits)];
}

describe('nothing checks for an absence the schema forbids', () => {
  it('the audit finds no unexplained hits', () => {
    /**
     * If this fails, read the hit before changing it. Either the check is dead - the branch can never
     * run, and whatever it guards has never happened - or the column should be nullable, or it is
     * another name collision and belongs in CHECKED_AND_FINE with the reason.
     */
    expect(findHits()).toEqual([]);
  });

  it('and the audit itself still works', () => {
    /**
     * A guard that finds nothing because it is broken looks exactly like a guard that finds nothing
     * because the code is clean. This is the bite-check, permanently: `Ground.timelineDays` is Int and
     * not nullable, so the audit must recognise it as one.
     */
    const ground = perModel.get('Ground')!;
    expect(ground.get('timelineDays')).toEqual({ type: 'Int', optional: false });
    expect(ground.get('cadence')).toEqual({ type: 'Cadence', optional: false });
    /** And it must know a nullable one from a non-nullable one, or every check looks like a hit. */
    expect(ground.get('brief')?.optional).toBe(true);
    expect(perModel.get('GroundParticipant')!.get('userId')?.optional).toBe(true);
  });

  it('the two columns the original bug needed now exist', () => {
    // `timelineStated` / `cadenceStated` are what let the gap reader ask about a guess rather than
    // waiting for an absence that cannot happen.
    expect(perModel.get('Ground')!.get('timelineStated')).toEqual({ type: 'Boolean', optional: false });
    expect(perModel.get('Ground')!.get('cadenceStated')).toEqual({ type: 'Boolean', optional: false });
  });
});
