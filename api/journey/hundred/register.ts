
/**
 * WHAT THE RUNS FOUND, DEDUPLICATED.
 *
 * One row per problem, not one per journey that met it — a moderate problem in sixty journeys
 * matters more than a severe one in a single edge case, and the register has to be able to say so.
 *
 * `npx ts-node journey/hundred/register.ts` reads results.jsonl and groups what happened.
 */
import * as fs from 'fs';

interface Outcome {
  id: number; persona: string; entry: string; scenario: string; behaviour: string;
  setupReached: boolean; participantReached: boolean | null; checkInCompleted: boolean;
  sharedReport: boolean | null; individualReport: boolean | null;
  verdict: string; failedAt: string | null; friction: string[];
  steps: { did: string; got: string }[];
}

/** What to call a problem, from the sentence a run recorded about it. */
function nameIt(said: string): { stage: string; issue: string } {
  const s = said.toLowerCase();

  /* NORMALISED, BECAUSE ONE PROBLEM IS ONE PROBLEM. A five-second wait and a four-second wait are
     the same complaint, and splitting them would let a register of fifty rows describe six things. */
  if (/\b\d+s wait\b/.test(s) || s.includes('nothing on screen saying anything')) {
    if (s.includes('answers') || s.includes('says:')) return { stage: 'chat responsiveness', issue: 'Every chat turn takes seconds with nothing on screen saying so' };
    if (s.includes('finishes')) return { stage: 'completion', issue: 'Finishing a check-in takes seconds with no sign it is working' };
    if (s.includes('accept')) return { stage: 'participant arrival', issue: 'Accepting an invitation takes seconds with no sign it is working' };
    return { stage: 'responsiveness', issue: 'A step takes seconds with nothing on screen saying so' };
  }
  if (s.includes('second press put the same answer in the record twice')) return { stage: 'completion', issue: 'A slow reply plus a second press puts the same answer in the record twice' };
  if (s.includes('report not found')) return { stage: 'shared report', issue: 'Finishing and looking says "Report not found" — the sentence for a thing that does not exist' };
  if (s.includes('appears once everybody has checked in')) return { stage: 'shared report', issue: 'A report that is still being written is described as waiting for other people' };
  if (s.includes('waited') && s.includes('after finishing')) return { stage: 'shared report', issue: 'The report takes tens of seconds after the last person finishes, unannounced' };
  if (s.includes('never arrived')) return { stage: 'shared report', issue: 'The report never arrived while somebody waited' };
  if (s.includes('wall of text')) return { stage: 'setup chat', issue: 'The assistant answers one sentence with a wall of text' };
  if (s.includes('asked the same question again')) return { stage: 'setup chat', issue: 'The assistant asks a question it has already asked' };
  if (s.includes('answered with nothing')) return { stage: 'setup chat', issue: 'The assistant replied with nothing at all' };
  if (s.includes('coming back mid-conversation')) return { stage: 'setup chat', issue: 'Coming back to a conversation part-way through did not work' };
  if (s.includes('no invitation arrived')) return { stage: 'invitations', issue: 'No invitation reached somebody who was added' };
  if (s.includes('has no link')) return { stage: 'email UX', issue: 'An email arrived with no link in it' };
  if (s.includes('own invitation twice')) return { stage: 'participant arrival', issue: 'Opening an invitation a second time is refused with an error' };
  if (s.includes('did not sign them in')) return { stage: 'participant arrival', issue: 'Accepting an invitation did not sign the person in' };
  if (s.includes('refused')) return { stage: 'participants', issue: 'Something the organiser expected to do was refused' };
  if (s.includes('survived into the check-in')) return { stage: 'document upload', issue: 'A document attached in the entry chat did not survive into the check-in' };
  if (s.includes('cannot see what their own check-in produced')) return { stage: 'individual report', issue: 'The invited person cannot see what their own check-in produced' };
  if (s.includes('refused their own report')) return { stage: 'individual report', issue: 'The invited person is refused their own report' };
  if (s.includes('could not confirm')) return { stage: 'lead journey', issue: 'The lead could not confirm the check-in they were handed' };
  if (s.includes('could not add the people')) return { stage: 'lead journey', issue: 'The lead could not add the people they were asked to run this with' };
  if (s.includes('they are leading something they cannot open')) return { stage: 'lead journey', issue: 'The lead cannot open the check-in they were told they lead' };
  if (s.includes('clicking finish twice')) return { stage: 'completion', issue: 'Clicking finish twice produces a server error' };
  return { stage: 'other', issue: said.replace(/^[^:]*: /, '').slice(0, 90) };
}

function main() {
  /* THE LATEST RUN OF EACH JOURNEY, because a journey re-run after a fix has two rows and only
     the second one is true. */
  const all: Outcome[] = fs.readFileSync('journey/hundred/results.jsonl', 'utf8')
    .split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const latest = new Map<number, Outcome>();
  for (const row of all) latest.set(row.id, row);
  const rows = [...latest.values()].sort((a, b) => a.id - b.id);

  const byIssue = new Map<string, { stage: string; journeys: number[]; personas: Set<string>; example: string }>();
  for (const row of rows) {
    const sayings = [...row.friction, ...(row.failedAt ? [row.failedAt] : [])];
    for (const said of sayings) {
      const { stage, issue } = nameIt(said);
      const seen = byIssue.get(issue) ?? { stage, journeys: [], personas: new Set<string>(), example: said };
      if (!seen.journeys.includes(row.id)) seen.journeys.push(row.id);
      seen.personas.add(row.persona);
      byIssue.set(issue, seen);
    }
  }

  const verdicts = rows.reduce<Record<string, number>>((a, r) => ({ ...a, [r.verdict]: (a[r.verdict] ?? 0) + 1 }), {});
  const funnel = {
    'setup reached': rows.filter((r) => r.setupReached).length,
    'participant arrived': rows.filter((r) => r.participantReached).length,
    'check-in completed': rows.filter((r) => r.checkInCompleted).length,
    'report reached': rows.filter((r) => r.sharedReport).length,
  };

  console.log(`ran: ${rows.length}`);
  console.log('verdicts:', JSON.stringify(verdicts));
  console.log('funnel:', JSON.stringify(funnel));
  console.log('\nissues, by how many journeys met them:');
  const ranked = [...byIssue.entries()].sort((a, b) => b[1].journeys.length - a[1].journeys.length);
  for (const [issue, d] of ranked) {
    console.log(`  ${String(d.journeys.length).padStart(3)}x [${d.stage}] ${issue}`);
    console.log(`       personas: ${[...d.personas].join(', ')} | journeys: ${d.journeys.slice(0, 12).join(',')}${d.journeys.length > 12 ? '…' : ''}`);
  }
}
main();
