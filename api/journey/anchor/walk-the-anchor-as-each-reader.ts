/**
 * THE ANCHOR JOURNEY, AS EACH OF ITS FOUR READERS (anchor piece 35).
 *
 * Signs in as the lead, a person in the check-in, and an admin who only reads, against an API running on this computer
 * with the anchor seed loaded (journey/seed-an-anchor-check-in.ts), reads the live and the ended anchor check-in's
 * board as each, and checks every read with what-each-reader-may-be-served.ts. It writes nothing: it only reads.
 *
 * IT ONLY TALKS TO THIS COMPUTER. Anything but localhost or 127.0.0.1 is refused before a request is made. The password
 * is the seed's local one. From api/:
 *
 *   npx ts-node -T journey/anchor/walk-the-anchor-as-each-reader.ts http://127.0.0.1:3000 <live ground id> <ended ground id>
 */
import { whatIsWrongForThisReader, type AnAnchorReader } from './what-each-reader-may-be-served';

const PASSWORD = 'anchor-local-only';
const READERS: { reader: AnAnchorReader; email: string; name: string }[] = [
  { reader: 'the lead', email: 'rukia@anchor.test', name: 'Rukia' },
  { reader: 'a person in it', email: 'amani@anchor.test', name: 'Amani' },
  { reader: 'a person in it', email: 'baraka@anchor.test', name: 'Baraka' },
  { reader: 'an admin who only reads', email: 'grace@anchor.test', name: 'Grace' },
];
const EVERYONE = ['Rukia', 'Amani', 'Baraka', 'Neema', 'Juma'];

export function onThisComputer(base: string): boolean {
  try {
    const u = new URL(base);
    return ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
  } catch {
    return false;
  }
}

async function main() {
  const [base, live, ended] = process.argv.slice(2);
  if (!base || !live || !ended) throw new Error('Give the API on this computer, the live check-in and the ended check-in.');
  if (!onThisComputer(base)) throw new Error('This journey only talks to an API on this computer (localhost or 127.0.0.1).');
  const api = `${base.replace(/\/$/, '')}/api/v1`;
  let failed = 0;
  for (const r of READERS) {
    const login = await fetch(`${api}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: r.email, password: PASSWORD }) });
    if (!login.ok) { console.log(`${r.name}: could not sign in (${login.status}).`); failed++; continue; }
    const { accessToken } = (await login.json()) as any;
    for (const [which, id, monthIsOver] of [['live', live, false], ['ended', ended, true]] as const) {
      const res = await fetch(`${api}/grounds/${id}/board`, { headers: { authorization: `Bearer ${accessToken}` } });
      if (!res.ok) {
        /* An admin who only reads may be refused the board altogether, which is right for them. */
        if (r.reader === 'an admin who only reads' && (res.status === 403 || res.status === 404)) { console.log(`${r.name}, ${which}: refused, as an admin who only reads may be.`); continue; }
        console.log(`${r.name}, ${which}: the board answered ${res.status}.`); failed++; continue;
      }
      const board = (await res.json()) as any;
      const problems = whatIsWrongForThisReader(r.reader, board, { monthIsOver, theirOwnName: r.name, othersNames: EVERYONE.filter((n) => n !== r.name) });
      console.log(`${r.name} (${r.reader}), ${which}: ${problems.length ? problems.join(' ') : 'right for this reader.'}`);
      failed += problems.length;
    }
  }
  if (failed) { console.log(`\n${failed} problem(s).`); process.exitCode = 1; } else console.log('\nEvery reader was served what they may read, and nothing else.');
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exitCode = 1; });
