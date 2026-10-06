/**
 * BRING EACH STORED CHECKABILITY READ UP TO THE CURRENT RULE (screens request 103).
 *
 * Every finished check-in stores the person's own read of how checkable it was, in
 * `CheckIn.specificityDimensions`. Request 45 (29 September) changed two of its five parts: "One date,
 * number or document" and "What you were waiting on, and from whom" are now there once the person said
 * the thing once. Check-ins finished before that keep the old read, so the Done page told Amani
 * "Groundwork did not pick this up this time." about a date she gave.
 *
 * This reads each finished check-in's own turns again under the current rule (readTheTurns, the same
 * function a check-in is scored with when it finishes) and raises any part the current rule reads
 * higher. It never lowers a part, never changes the overall level, and never touches anybody's words:
 * it writes only `specificityDimensions`, which is the person's own read and is served to them alone.
 *
 * ON A DATABASE ON THIS MACHINE (localhost, 127.0.0.1 or [::1]):
 *
 *   DATABASE_URL=postgresql://localhost/gw_... npx ts-node -T journey/bring-the-checkability-read-up-to-date.ts --dry-run
 *   DATABASE_URL=postgresql://localhost/gw_... npx ts-node -T journey/bring-the-checkability-read-up-to-date.ts
 *
 * ON A HOSTED DATABASE (decision 74, item 5), only whoever runs the release, as a release step, exactly
 * like the word-for-word script and with the same guard:
 *
 *   1. With --hosted-database alone it is a dry run: it prints how many check-ins would change, and
 *      writes nothing.
 *   2. With --hosted-database --write it prints the same, then asks for the database's host name to be
 *      typed back, and writes only when the typed name is exactly the host in DATABASE_URL.
 *   Without --hosted-database it refuses any database not on this machine.
 *
 * The engine work never runs it on anything but a local gw_ database.
 */
import * as readline from 'readline';
import { whatThisRunMayDo, theTypedHostMatches } from './stamp-said-word-for-word';
import { readTheTurns, raisedToTheCurrentRule } from '../src/modules/conversation/the-specificity-read';

export interface ACheckInToRaise {
  id: string;
  from: Record<string, unknown>;
  to: Record<string, unknown>;
  raised: string[];
}

export interface WhatWouldChange {
  read: number;
  raise: ACheckInToRaise[];
}

/** Reads only. Works out every finished check-in's read under the current rule, and which would rise. */
export async function whatWouldChange(prisma: any): Promise<WhatWouldChange> {
  const done = await prisma.checkIn.findMany({
    where: { status: 'COMPLETED' },
    select: { id: true, groundId: true, participantId: true, startedAt: true, specificityDimensions: true },
  });
  const out: WhatWouldChange = { read: 0, raise: [] };
  for (const c of done) {
    const stored = c.specificityDimensions;
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) continue;
    out.read += 1;
    const turns = (await prisma.conversationTurn.findMany({
      where: { checkInId: c.id, role: 'PERSON' },
      orderBy: { createdAt: 'asc' },
      select: { content: true },
    })).map((t: any) => t.content ?? '');
    if (!turns.length) continue;
    const attached = (await prisma.groundDocument.count({
      where: { groundId: c.groundId, participantId: c.participantId, ...(c.startedAt ? { createdAt: { gte: c.startedAt } } : {}) },
    })) > 0;
    const now = readTheTurns(turns, attached);
    const up = raisedToTheCurrentRule(stored, now.dimensions);
    if (up) out.raise.push({ id: c.id, from: stored, to: up.dimensions, raised: up.raised });
  }
  return out;
}

/** Writes only the reads that rise, and only that one column. */
export async function writeTheReads(prisma: any, plan: WhatWouldChange): Promise<void> {
  for (const c of plan.raise) {
    await prisma.checkIn.update({ where: { id: c.id }, data: { specificityDimensions: c.to } });
  }
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
/* The Done page's own words for each part (client/src/components/gw/TheFiveThingsThatMakeItCheckable.tsx). */
const PART_SAID: Record<string, string> = {
  delivery: 'What you did, not just what was happening',
  evidence: 'One date, number or document',
  enablement: 'What you were waiting on, and from whom',
  coverage: 'What went badly, not only what went well',
  commitment: 'What happens next, who does it, by when',
  checkable: 'Whether anything said could be checked',
};

export function whatWouldChangeSays(plan: WhatWouldChange): string[] {
  const byPart = new Map<string, number>();
  for (const c of plan.raise) for (const p of c.raised) byPart.set(p, (byPart.get(p) ?? 0) + 1);
  const lines = [
    `${count(plan.read, 'finished check-in was', 'finished check-ins were')} read again under the current rule.`,
    `${count(plan.raise.length, 'check-in', 'check-ins')} would have a part of the read raised. No part would be lowered, and nobody's words would change.`,
  ];
  for (const [part, n] of byPart) {
    lines.push(`"${PART_SAID[part] ?? part}" would be raised on ${count(n, 'check-in', 'check-ins')}.`);
  }
  return lines;
}

/** The whole run, with the database and the question handed in, so a test can run it with neither. */
export async function run(opts: {
  url: string;
  args: readonly string[];
  prismaFor: (url: string) => any;
  ask: (question: string) => Promise<string | null>;
  say: (line: string) => void;
}): Promise<{ wrote: boolean; refused: string | null; plan?: WhatWouldChange }> {
  const may = whatThisRunMayDo(opts.url, opts.args);
  if (may.refused) {
    opts.say(may.why);
    return { wrote: false, refused: may.why };
  }
  const prisma = opts.prismaFor(opts.url);
  try {
    const plan = await whatWouldChange(prisma);
    for (const line of whatWouldChangeSays(plan)) opts.say(line);
    if (!may.writes) {
      opts.say('This was a dry run. Nothing was written.');
      return { wrote: false, refused: null, plan };
    }
    if (may.mustTypeTheHostBack) {
      const typed = await opts.ask(`To write these reads to the database at ${may.host}, type its host name exactly: `);
      if (!theTypedHostMatches(typed, may.host)) {
        const why = 'The host name typed back did not match the database, so nothing was written.';
        opts.say(why);
        return { wrote: false, refused: why, plan };
      }
    }
    await writeTheReads(prisma, plan);
    opts.say('The reads were written.');
    return { wrote: true, refused: null, plan };
  } finally {
    await prisma?.$disconnect?.();
  }
}

function askOnTheKeyboard(question: string): Promise<string | null> {
  if (!process.stdin.isTTY) return Promise.resolve(null);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer); }));
}

if (require.main === module) {
  run({
    url: process.env.DATABASE_URL ?? '',
    args: process.argv.slice(2),
    prismaFor: (url) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { PrismaClient } = require('@prisma/client');
      return new PrismaClient({ datasources: { db: { url } } });
    },
    ask: askOnTheKeyboard,
    say: (line) => console.log(line),
  })
    .then((r) => process.exit(r.refused ? 1 : 0))
    .catch((err) => {
      console.error(err?.message ?? err);
      process.exit(2);
    });
}
