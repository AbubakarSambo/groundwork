/**
 * THE ANCHOR JOURNEY, AS EACH OF ITS FOUR READERS (anchor piece 35).
 *
 * Signs in as the lead, a person in the check-in, and an admin who only reads, against an API running on this computer
 * with the anchor seed loaded (journey/seed-an-anchor-check-in.ts), reads the live and the ended anchor check-in's
 * board as each, and checks every read with src/modules/board/the-anchor-readers.ts. It writes nothing: it only reads.
 *
 * IT ONLY TALKS TO THIS COMPUTER. Anything but localhost or 127.0.0.1 is refused before a request is made. The password
 * is the seed's local one. From api/:
 *
 *   npx ts-node -T journey/anchor/walk-the-anchor-as-each-reader.ts http://127.0.0.1:3000 <live ground id> <ended ground id>
 */
import { whatIsWrongForThisReader, type AnAnchorReader } from '../../src/modules/board/the-anchor-readers';
import { onThisComputer } from '../../src/common/on-this-computer';

export { onThisComputer };

const PASSWORD = 'anchor-local-only';
const READERS: { reader: AnAnchorReader; email: string; name: string }[] = [
  { reader: 'the lead', email: 'rukia@anchor.test', name: 'Rukia' },
  { reader: 'a person in it', email: 'amani@anchor.test', name: 'Amani' },
  { reader: 'a person in it', email: 'baraka@anchor.test', name: 'Baraka' },
  { reader: 'an admin who only reads', email: 'grace@anchor.test', name: 'Grace' },
];
const EVERYONE = ['Rukia', 'Amani', 'Baraka', 'Neema', 'Juma'];

/**
 * THE API WRAPS EVERY ANSWER IN `{ success, data }`. The walker read `accessToken` from the top of the sign-in answer,
 * found nothing, and every board read was refused with 401, which the walker counted as an ordinary failure at best and,
 * for an admin who only reads, never saw at all. And a board read from the wrapper has none of the board's fields, so
 * every rule would pass on it. Both are read from `data` now, and a missing token stops the run.
 */
export function theBody(json: any): any {
  return json && typeof json === 'object' && 'data' in json && 'success' in json ? json.data : json;
}

export function theToken(json: any): string {
  const token = theBody(json)?.accessToken;
  if (typeof token !== 'string' || !token) throw new Error('The sign-in answer has no access token, so nothing after it could be read. Stopping.');
  return token;
}

/** A 401 or a 429 means the walk read nothing at all; it stops the run, loudly, rather than passing or counting on. */
export function stopOnARefusal(status: number, what: string): void {
  if (status === 401) throw new Error(`${what} was refused as not signed in (401), so the walk read nothing. Stopping.`);
  if (status === 429) throw new Error(`${what} was refused for too many requests (429), so the walk read nothing. Stopping.`);
}

async function main() {
  const [base, live, ended] = process.argv.slice(2);
  if (!base || !live || !ended) throw new Error('Give the API on this computer, the live check-in and the ended check-in.');
  if (!onThisComputer(base)) throw new Error('This journey only talks to an API on this computer (localhost or 127.0.0.1).');
  const api = `${base.replace(/\/$/, '')}/api/v1`;
  let failed = 0;
  for (const r of READERS) {
    const login = await fetch(`${api}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: r.email, password: PASSWORD }) });
    stopOnARefusal(login.status, `${r.name} signing in`);
    if (!login.ok) { console.log(`${r.name}: could not sign in (${login.status}).`); failed++; continue; }
    const accessToken = theToken(await login.json());
    for (const [which, id, monthIsOver] of [['live', live, false], ['ended', ended, true]] as const) {
      const res = await fetch(`${api}/grounds/${id}/board`, { headers: { authorization: `Bearer ${accessToken}` } });
      stopOnARefusal(res.status, `${r.name} reading the ${which} board`);
      if (!res.ok) {
        /* An admin who only reads may be refused the board altogether, which is right for them. */
        if (r.reader === 'an admin who only reads' && (res.status === 403 || res.status === 404)) { console.log(`${r.name}, ${which}: refused, as an admin who only reads may be.`); continue; }
        console.log(`${r.name}, ${which}: the board answered ${res.status}.`); failed++; continue;
      }
      const board = theBody(await res.json());
      const problems = whatIsWrongForThisReader(r.reader, board, { monthIsOver, ended: which === 'ended', theirOwnName: r.name, othersNames: EVERYONE.filter((n) => n !== r.name) });
      console.log(`${r.name} (${r.reader}), ${which}: ${problems.length ? problems.join(' ') : 'right for this reader.'}`);
      failed += problems.length;
    }
  }
  if (failed) { console.log(`\n${failed} problem(s).`); process.exitCode = 1; } else console.log('\nEvery reader was served what they may read, and nothing else.');
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exitCode = 1; });
