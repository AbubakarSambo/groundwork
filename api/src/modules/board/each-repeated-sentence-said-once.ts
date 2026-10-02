/**
 * EACH REPEATED SENTENCE IN THE FOLD IS SAID ONCE (screens request 117, part 8).
 *
 * On "Sales team, Q3" nobody's role had been written down, so the lead read "No position shown, because the role
 * was never clearly defined. ..." five times, once under each name, and under "Where work is landing" the same
 * two sentences four times ("Nobody has said anything about this person's work moving elsewhere. Their
 * responsibilities are staying with them. ..."). A sentence true of several people is now said once for the
 * section, naming them, and the rows it was true of carry it no more: `contributionSaysOnce` beside
 * `contribution`, and `coverage.saysOnce`, each sent only where something was repeated. A row whose sentence is
 * its own keeps it.
 *
 * It runs on what this reader is already served, after every wall, so it names nobody the rows did not.
 */
const andList = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const orList = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`);
/* The reader's own row is "you", never their own name (request 118, part 2): Rukia read "No position is shown for
   Rukia Otieno, Baraka Mwangi, ..." about herself. */
const nameOf = (r: any, me: string | null = null) => {
  const n = String(r?.name ?? '').trim();
  if (me && r?.participantId === me) return 'you';
  return /^you$/i.test(n) ? 'you' : n || 'a colleague';
};

const NO_ROLE = /^No position shown, because the role was never clearly defined\./;
const NO_ROLE_IN_THIS = /^No position shown\. This situation does not run against a role/;

export function theNoteSaidOnce(note: string, names: string[]): string {
  if (NO_ROLE.test(note)) {
    return `No position is shown for ${orList(names)}, because nobody's role was clearly defined. Define what each role is responsible for before assessing anyone against it. An undefined role is often the real problem, not the person.`;
  }
  if (NO_ROLE_IN_THIS.test(note)) return 'No position is shown for anybody. This situation does not run against a role, so there is nothing to read anyone against.';
  return `${note} This is true of ${andList(names)}.`;
}

export function theReadSaidOnce(what: string | null, reasonText: string | null, names: string[]): string[] {
  const others = names.filter((n) => n !== 'you');
  const whose = names.includes('you')
    ? (others.length ? `your work and the work of ${andList(others)}` : 'your work')
    : `the work of ${andList(names)}`;
  const w = (what ?? '').replace(/\bthis person's work\b/g, whose).replace(/\bthis person\b/g, andList(names));
  return [w === (what ?? '') && w ? `${w} This is true of ${andList(names)}.` : w, reasonText ?? ''].filter((x) => x.trim());
}

export function eachRepeatedSentenceSaidOnce<T extends Record<string, any>>(board: T): T {
  const out: any = { ...board };
  const me: string | null = typeof out.myParticipantId === 'string' ? out.myParticipantId : null;
  if (Array.isArray(out.contribution)) {
    const byNote = new Map<string, any[]>();
    for (const r of out.contribution) if (typeof r?.note === 'string' && r.note.trim()) byNote.set(r.note, [...(byNote.get(r.note) ?? []), r]);
    const repeated = [...byNote.entries()].filter(([, rows]) => rows.length >= 2);
    if (repeated.length) {
      const said = new Set(repeated.map(([note]) => note));
      out.contributionSaysOnce = repeated.map(([note, rows]) => theNoteSaidOnce(note, rows.map((r) => nameOf(r, me)))).join(' ');
      out.contribution = out.contribution.map((r: any) => (said.has(r?.note) ? { ...r, note: null, saidOnceAbove: true } : r));
    }
  }
  if (out.coverage && Array.isArray(out.coverage.reads)) {
    const key = (r: any) => `${r?.what ?? ''}\u0000${r?.reasonText ?? ''}`;
    const byKey = new Map<string, any[]>();
    for (const r of out.coverage.reads) if ((r?.what ?? '').trim() || (r?.reasonText ?? '').trim()) byKey.set(key(r), [...(byKey.get(key(r)) ?? []), r]);
    const repeated = [...byKey.values()].filter((rows) => rows.length >= 2);
    if (repeated.length) {
      const said = new Set(repeated.map((rows) => key(rows[0])));
      out.coverage = {
        ...out.coverage,
        saysOnce: repeated.flatMap((rows) => theReadSaidOnce(rows[0].what ?? null, rows[0].reasonText ?? null, rows.map((r: any) => nameOf(r, me)))),
        reads: out.coverage.reads.map((r: any) => (said.has(key(r)) ? { ...r, what: null, reasonText: null, saidOnceAbove: true } : r)),
      };
    }
  }
  return out;
}
