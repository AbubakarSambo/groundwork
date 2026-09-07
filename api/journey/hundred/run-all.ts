
/**
 * ONE HUNDRED JOURNEYS, ONE AT A TIME.
 *
 * `npx ts-node journey/hundred/run-all.ts <from> <to>` runs them in order and appends a result per
 * journey. Sequential on purpose: a person does one thing at a time, and two journeys racing each
 * other through the same organisation would produce state neither of them would meet in life.
 */
import { JOURNEYS, Journey } from './matrix';
import { Run, record } from './harness';
import { throughTheEntryChat, throughTheWizard, handedToALead } from './families';

const RESULTS = 'journey/hundred/results.jsonl';


async function runOne(journey: Journey) {
  const run = new Run();
  let setup = false;
  let participantArrived: boolean | null = null;
  let completed = false;
  let shared: boolean | null = null;
  let individual: boolean | null = null;

  try {
    /* Which door this person comes through decides which of these runs. */
    const r = journey.persona === 'lead'
      ? await handedToALead(run, journey)
      : journey.entry === 'entry chat' || journey.setup === 'chat-led' || journey.setup === 'document first'
        ? await throughTheEntryChat(run, journey)
        : await throughTheWizard(run, journey);
    setup = r.setup;
    participantArrived = r.participantArrived;
    completed = r.completed;
    shared = r.shared;
    individual = r.individual;
  } catch (err: any) {
    run.broke('somewhere in the journey', err?.message ?? String(err));
  }

  const wanted =
    journey.wants === 'setup only' ? setup
    : journey.wants === 'shared report' ? shared === true
    : journey.wants === 'individual report' ? individual === true
    : shared === true && individual === true;

  const outcome = {
    id: journey.id,
    persona: journey.persona,
    entry: journey.entry,
    scenario: journey.scenario,
    behaviour: journey.behaviour,
    setupReached: setup,
    participantReached: participantArrived,
    checkInCompleted: completed,
    sharedReport: shared,
    individualReport: individual,
    verdict: !wanted || run.failedAt ? 'FAIL' : run.frictions.length ? 'PASS WITH FRICTION' : 'PASS',
    failedAt: run.failedAt,
    friction: run.frictions,
    steps: run.steps.map((s) => ({ did: s.did, got: s.got })),
    ranAt: new Date().toISOString(),
  };
  record(RESULTS, outcome);
  console.log(`J${String(journey.id).padStart(3)} ${outcome.verdict.padEnd(19)} ${journey.persona} · ${journey.behaviour.slice(0, 44)}${outcome.failedAt ? ' | FAILED: ' + outcome.failedAt.slice(0, 70) : ''}`);
}

async function main() {
  const from = Number(process.argv[2] ?? 1);
  const to = Number(process.argv[3] ?? from);
  for (const journey of JOURNEYS.filter((x) => x.id >= from && x.id <= to)) {
    await runOne(journey);
  }
}
main();
