/**
 * Reads the captured journey and answers the four questions asked, against the
 * personas' KNOWN truth rather than against vibes.
 */
import * as fs from 'fs';
import { PERSONAS } from './personas';

const OUT = 'journey/out';
const read = (f: string) => JSON.parse(fs.readFileSync(`${OUT}/${f}`, 'utf8'));

const transcripts = read('transcripts.json');
const reports = read('reports.json');
const boards = read('boards.json');
const jlog = read('journey-log.json');

const FIRST_NAMES: Record<string, string> = {
  hafsah: 'Hafsah', abubakar: 'Abubakar', adam: 'Adam', kavon: 'Kavon', nate: 'Nate',
};
const line = (s = '') => console.log(s);
const h = (s: string) => { line(); line('#'.repeat(78)); line('# ' + s); line('#'.repeat(78)); };

// ---------------------------------------------------------------- 1. JOURNEY
h('1. JOURNEY BLOCKERS AND FRICTION');
const blockers = jlog.filter((l: any) => /BLOCKER|failed|did not release/i.test(l.step));
line(`explicit blockers/failures logged: ${blockers.length}`);
for (const b of blockers) line(`  - ${b.step} :: ${typeof b.detail === 'string' ? b.detail.slice(0, 160) : JSON.stringify(b.detail).slice(0, 160)}`);

const gc = jlog.find((l: any) => l.step === 'ground created');
line(`\nfree-ground check: ${JSON.stringify(gc?.detail)}`);

// ---------------------------------------------------------------- 2. AI CHAT
h('2. AI CONVERSATION: FLOW, ENDINGS, LEAKS, ROLE MAPPING');

// 2a. natural close rate
const bySession: Record<number, any[]> = {};
for (const t of transcripts) (bySession[t.session] ??= []).push(t);
line('natural close by session (did the engine signal the end itself?):');
let closes = 0, total = 0;
for (const s of Object.keys(bySession).map(Number).sort((a, b) => a - b)) {
  const row = bySession[s];
  const c = row.filter((r) => r.naturalClose).length;
  closes += c; total += row.length;
  line(`  session ${String(s).padStart(2)}: ${c}/${row.length}  ${row.map((r) => `${r.key}:${r.naturalClose ? 'Y' : 'n'}`).join(' ')}`);
}
line(`  OVERALL: ${closes}/${total} (${Math.round((closes / total) * 100)}%)`);

// 2b. repeated questions inside one check-in = not following the thread
line('\nrepeated questions within a single check-in (engine pushing its own agenda):');
let repeatCount = 0;
for (const t of transcripts) {
  const qs = t.turns.filter((x: any) => x.role === 'AI').map((x: any) => (x.content ?? '').match(/[^.?!]*\?/g) ?? []).flat()
    .map((q: string) => q.toLowerCase().replace(/[^a-z ]/g, '').trim());
  const norm = (q: string) => q.split(' ').filter((w) => w.length > 3).sort().join(' ');
  const seen = new Map<string, number>();
  for (const q of qs) { const k = norm(q); if (k.length > 20) seen.set(k, (seen.get(k) ?? 0) + 1); }
  const dupes = [...seen.entries()].filter(([, n]) => n > 1);
  if (dupes.length) {
    repeatCount++;
    line(`  ${t.person} s${t.session}: ${dupes.length} question(s) asked more than once`);
  }
}
line(`  check-ins with a repeated question: ${repeatCount}/${transcripts.length}`);

// 2c. THE LEAK CHECK - the most important safety property.
// Does any AI turn in one person's check-in reveal ANOTHER participant's account?
line('\nCROSS-PARTY LEAK CHECK (does the AI feed one person another person\'s account?):');
const leaks: string[] = [];
for (const t of transcripts) {
  const others = Object.entries(FIRST_NAMES).filter(([k]) => k !== t.key).map(([, n]) => n);
  // What this person themselves said, so a name they raised is not a leak.
  const ownWords = t.turns.filter((x: any) => x.role === 'PERSON').map((x: any) => x.content).join(' ').toLowerCase();
  for (const turn of t.turns.filter((x: any) => x.role === 'AI')) {
    const c: string = turn.content ?? '';
    for (const other of others) {
      if (!c.includes(other)) continue;
      // The person raised them themselves -> legitimate (describing their world).
      if (ownWords.includes(other.toLowerCase())) continue;
      // Attribution verbs are what make it a leak: the AI telling them what
      // someone ELSE reported.
      const attributing = new RegExp(`${other}[^.?!]{0,60}\\b(said|reported|told|described|mentioned|claims?|thinks?|believes?|his account|her account|their account)\\b`, 'i');
      if (attributing.test(c)) {
        leaks.push(`  LEAK ${t.person} s${t.session}: "${c.slice(Math.max(0, c.indexOf(other) - 70), c.indexOf(other) + 130).replace(/\n/g, ' ')}"`);
      }
    }
  }
}
if (leaks.length === 0) line('  none found: no AI turn attributed content to another party.');
else leaks.forEach((l) => line(l));

// 2d. did it name a failure mode at the person? (forbidden)
line('\nACCUSATION CHECK (did it name a failure mode at anyone?):');
const accusatory = /\b(you are (being )?(avoidant|vague|evasive|non-?committal|illegible)|are you avoiding|you're avoiding|you seem to be avoiding|lazy|slacking)\b/i;
const accusations = transcripts.flatMap((t: any) =>
  t.turns.filter((x: any) => x.role === 'AI' && accusatory.test(x.content ?? ''))
    .map((x: any) => `  ${t.person} s${t.session}: "${(x.content ?? '').slice(0, 180)}"`));
if (!accusations.length) line('  none: no failure mode was named at a person.');
else accusations.forEach((a: string) => line(a));

// 2e. role-mapped probing: does each function get its own kind of question?
line('\nROLE-TUNED PROBING (did the questions match each function?):');
const SIGNALS: Record<string, RegExp> = {
  sales: /\b(buyer|budget|decision.?maker|authority|close|pipeline|procurement|who can (actually )?(buy|decide))\b/i,
  engineering: /\b(ship|shipped|deploy|stable|regression|what can someone else|non-?engineer)\b/i,
  founder: /\b(only you|decision|decide|the call|board|strategy|author)\b/i,
};
for (const p of PERSONAS) {
  const mine = transcripts.filter((t: any) => t.key === p.key);
  const ai = mine.flatMap((t: any) => t.turns.filter((x: any) => x.role === 'AI').map((x: any) => x.content ?? ''));
  const hits = Object.fromEntries(Object.entries(SIGNALS).map(([k, re]) => [k, ai.filter((c: string) => re.test(c)).length]));
  line(`  ${p.name.padEnd(18)} expect=${p.expectFunction.padEnd(12)} question signals: ${JSON.stringify(hits)}`);
}

// ---------------------------------------------------------------- 3. REPORT
h('3. REPORT: HALLUCINATION AND THINNESS, SESSION ON SESSION');
for (const r of reports) {
  const rep = r.report;
  if (!rep) { line(`session ${r.session}: ERROR ${r.error}`); continue; }
  const div = Array.isArray(rep.divergences) ? rep.divergences.length : 0;
  const agr = Array.isArray(rep.agreements) ? rep.agreements.length : 0;
  const inf = Array.isArray(rep.inferences) ? rep.inferences.length : 0;
  const lg = Array.isArray(rep.leadershipGaps) ? rep.leadershipGaps.length : 0;
  const sp = (rep.sharedPicture ?? '').length;
  line(`session ${String(r.session).padStart(2)}: sharedPicture=${sp}ch agreements=${agr} divergences=${div} inferences=${inf} leadershipGaps=${lg} released=${!!rep.releasedAt}`);
}
line('\n--- fabricated-name check: does any report name a person who is not on this ground? ---');
const realNames = Object.values(FIRST_NAMES);
// Names the personas themselves put on the record (buyers, contributors) are legitimate.
const legit = new Set<string>([...realNames, 'Sahar', 'Coamana', 'Loop', 'Flexi', 'Northwind', 'Beacon', 'Harto', 'Daisy', 'Copperline',
  'Meridian', 'Salt', 'Ridgeway', 'Alto', 'Nishita', 'Ceren', 'Jessie', 'Groundwork', 'Q3', 'Q4']);
for (const r of reports) {
  const rep = r.report; if (!rep) continue;
  const blob = JSON.stringify({ sp: rep.sharedPicture, a: rep.agreements, d: rep.divergences, cq: rep.centralQuestion });
  const caps = (blob.match(/\b[A-Z][a-z]{3,}\b/g) ?? []);
  const unknown = [...new Set(caps)].filter((n) => !legit.has(n) && !/^(The|This|That|Their|There|Both|What|When|Where|Which|While|With|From|Session|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve|None|Only|Also|After|Before|Every|Each|Some|Most|More|Less|First|Second|Third|Final|Team|Sales|Engineering|Product|Pricing|Deck|Staging|Pilot|Contributors?|Paying|Companies|Users?|Weekly|Monthly|Quarter|Target|Record|Report|Board|Ground|Founder|Lead|Blocked|Blocker)$/.test(n));
  if (unknown.length) line(`  session ${r.session}: unexplained capitalised names -> ${unknown.slice(0, 12).join(', ')}`);
}

// ---------------------------------------------------------------- 4. BOARD
h('4. BOARD: HALLUCINATION AND THINNESS, SESSION ON SESSION');
for (const b of boards) {
  const bd = b.board;
  if (!bd) { line(`session ${b.session}: ERROR ${b.error}`); continue; }
  const n = (x: any) => (Array.isArray(x) ? x.length : x ? 1 : 0);
  line(`session ${String(b.session).padStart(2)}: renders=${bd.renders} sections=${n(bd.sections)} objectives=${n(bd.objectives)} deps=${n(bd.dependencies)} whoOwns=${n(bd.whoOwnsWhat)} contribution=${n(bd.contribution)} coverage=${n(bd.coverage?.reads)} patterns=${n(bd.patterns)} decisions=${n(bd.decisions)} mgrAlign=${n(bd.managerAlignment)}`);
}

line('\n--- lead-only material must NEVER appear on the board ---');
const FORBIDDEN = ['arcSignals', 'CONCENTRATED_FINISH', 'finalSynthesis', 'COLLUSION_RISK', 'concernFlags', 'specificityCauses'];
let leaked = false;
for (const b of boards) {
  if (!b.board) continue;
  const blob = JSON.stringify(b.board);
  for (const f of FORBIDDEN) if (blob.includes(f)) { line(`  LEAK session ${b.session}: board contains ${f}`); leaked = true; }
}
if (!leaked) line('  none: no lead-only field reached the board in any session.');

line('\n--- the reads, checked against what we KNOW is true ---');
const last = boards.filter((b: any) => b.board?.renders).pop();
if (last) {
  const bd = last.board;
  line(`(from session ${last.session})`);
  for (const c of bd.contribution ?? []) {
    line(`  CONTRIBUTION ${String(c.name).padEnd(20)} remitDefined=${c.remitDefined} fn=${c.fnLabel ?? '-'} blocked=${c.isBlocked}`);
    if (c.reason) line(`      reason: ${c.reason}`);
  }
  for (const r of bd.coverage?.reads ?? []) {
    line(`  COVERAGE     ${String(r.name).padEnd(20)} kind=${r.kind} pct=${r.pct} trend=${r.trend} reason=${r.reason}`);
    line(`      what: ${r.what}`);
  }
  for (const m of bd.managerAlignment ?? []) {
    line(`  LEADERSHIP   ${m.label} [${m.pole}] periods=${m.periods}`);
    line(`      gap: ${m.gap}`);
  }
}

line('\n--- persona ground truth, for judging the above ---');
for (const p of PERSONAS) line(`  ${p.name}: ${p.truth}`);
line();
