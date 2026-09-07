
/**
 * ONE JOURNEY AT A TIME, IN ORDER, THROUGH THE DOORS A PERSON USES.
 *
 * Run as: npx ts-node journey/hundred/run-one.ts <id>
 * Appends a result to journey/hundred/results.jsonl. Nothing is written to the database except
 * through the product's own routes.
 */
import { JOURNEYS } from './matrix';
import { API, Run, call, mailMark, mailSince, tokenIn, anAddress, record } from './harness';

const RESULTS = 'journey/hundred/results.jsonl';

interface Outcome {
  id: number;
  persona: string;
  behaviour: string;
  setupReached: boolean;
  participantReached: boolean | null;
  checkInCompleted: boolean;
  sharedReport: boolean | null;
  individualReport: boolean | null;
  verdict: 'PASS' | 'PASS WITH FRICTION' | 'FAIL';
  failedAt: string | null;
  friction: string[];
  steps: { did: string; got: string }[];
  ranAt: string;
}

/** The entry chat, as somebody talking to it. Returns the transcript it built. */
async function talkToTheEntryChat(run: Run, said: string[], scenario?: string) {
  const opener = await call('POST', '/entry/opener', { scenario });
  if (opener.status >= 400) { run.broke('open the entry chat', `${opener.status} ${JSON.stringify(opener.data).slice(0, 120)}`); return null; }
  run.say('open the entry chat', String(opener.data?.reply ?? '').slice(0, 90));

  const history: { role: 'user' | 'assistant'; content: string }[] = [
    { role: 'assistant', content: String(opener.data?.reply ?? '') },
  ];

  for (const line of said) {
    history.push({ role: 'user', content: line });
    const r = await call('POST', '/entry/chat', { messages: history, scenario });
    if (r.status >= 400) { run.broke('say something in the chat', `${r.status} ${JSON.stringify(r.data).slice(0, 140)}`); return null; }
    const reply = String(r.data?.reply ?? '');
    history.push({ role: 'assistant', content: reply });
    run.say(`say: ${line.slice(0, 46)}`, reply.slice(0, 110));
  }
  return history;
}

/** Give an address, read the mail, open the link. Returns a session token. */
async function comeBackThroughTheEmail(run: Run, email: string, draft?: unknown) {
  const mark = mailMark();
  const saved = await call('POST', '/auth/entry-save', { email, draft });
  if (saved.status >= 400) { run.broke('give an email address', `${saved.status} ${JSON.stringify(saved.data).slice(0, 120)}`); return null; }
  run.say('give an email address', `${saved.status} - told to check the inbox`);

  await new Promise((r) => setTimeout(r, 700));
  const mail = mailSince(mark);
  if (mail.length === 0) { run.broke('wait for the email', 'nothing arrived'); return null; }
  const link = mail[mail.length - 1];
  run.say('the email arrives', `"${link.subject}"${link.link ? '' : ' - WITH NO LINK'}`);
  if (!link.link) { run.broke('follow the link in the email', 'there is no link in it'); return null; }

  const token = tokenIn(link.link);
  const verified = await call('POST', '/auth/verify-email', { token });
  if (verified.status >= 400) { run.broke('open the link', `${verified.status} ${JSON.stringify(verified.data).slice(0, 140)}`); return null; }
  run.say('open the link', `signed in as ${verified.data?.user?.email ?? '?'}`);
  return verified.data?.accessToken as string;
}

function reachedWhatItCameFor(
  wants: string, shared: boolean | null, individual: boolean | null, setup: boolean,
): boolean {
  if (wants === 'setup only') return setup;
  if (wants === 'shared report') return shared === true;
  if (wants === 'individual report') return individual === true;
  return shared === true && individual === true;
}

/** A person answering their own check-in, in their own words. */
async function answerTheCheckIn(run: Run, who: string, checkInId: string, token: string, says: string[]) {
  const opened = await call('POST', `/check-ins/${checkInId}/open`, {}, token);
  if (opened.status >= 400) {
    /* The admin's own session is finished the moment the entry chat commits — that conversation
       WAS their check-in. Re-opening it is the harness misunderstanding the product, not the
       product refusing something a person would try. */
    const already = String(opened.data?.message ?? '').includes('already complete');
    if (already) { run.say(`${who} opens their check-in`, 'already finished - the entry conversation was it'); return true; }
    run.broke(`${who} opens their check-in`, `${opened.status} ${JSON.stringify(opened.data).slice(0, 120)}`);
    return false;
  }
  run.say(`${who} opens their check-in`, String(opened.data?.reply ?? opened.data?.message ?? '').slice(0, 100) || 'opened');

  for (const line of says) {
    const r = await call('POST', `/check-ins/${checkInId}/messages`, { message: line }, token);
    if (r.status >= 400) { run.broke(`${who} answers`, `${r.status} ${JSON.stringify(r.data).slice(0, 120)}`); return false; }
    run.say(`${who} says: ${line.slice(0, 40)}`, String(r.data?.reply ?? '').slice(0, 90));
  }

  const done = await call('POST', `/check-ins/${checkInId}/complete`, {}, token);
  if (done.status >= 400) { run.broke(`${who} finishes`, `${done.status} ${JSON.stringify(done.data).slice(0, 120)}`); return false; }
  run.say(`${who} finishes their check-in`, 'completed');
  return true;
}

async function main() {
  const id = Number(process.argv[2]);
  const journey = JOURNEYS.find((x) => x.id === id);
  if (!journey) { console.log('no such journey'); process.exit(1); }

  const run = new Run();
  let setupReached = false;
  let participantReached: boolean | null = null;
  let completed = false;
  let shared: boolean | null = null;
  let individual: boolean | null = null;

  try {
    // ── the admin, arriving through the entry chat ────────────────────────────────────────
    const said = SCRIPTS[journey.id] ?? SCRIPTS.default;
    const history = await talkToTheEntryChat(run, said, journey.scenario);

    if (history) {
      const email = anAddress('admin');
      const token = await comeBackThroughTheEmail(run, email, { payload: { situation: said[0] }, history });

      if (token) {
        run.token = token;
        const participant = anAddress('other');
        const mark2 = mailMark();
        const committed = await call('POST', '/entry/commit', {
          groundLabel: `J${journey.id} ${journey.scenario}`,
          scenario: journey.scenario,
          history,
          contributors: journey.mix === 'solo' ? [] : [{ email: participant }],
        }, token);

        if (committed.status >= 400) {
          run.broke('turn the conversation into a check-in', `${committed.status} ${JSON.stringify(committed.data).slice(0, 160)}`);
        } else {
          setupReached = true;
          const groundId = String(committed.data?.groundId ?? '');
          run.say('turn the conversation into a check-in', `ground ${groundId.slice(0, 8)}`);

          // ── what the admin can see of their own check-in ────────────────────────────────
          const ground = await call('GET', `/grounds/${groundId}`, undefined, token);
          const parties: any[] = ground.data?.participants ?? [];
          run.say('look at the check-in that was made', `${parties.length} people on it: ${parties.map((p: any) => p.email).join(', ').slice(0, 80)}`);

          const mine = parties.find((p: any) => p.email === email);
          const theirs = parties.find((p: any) => p.email !== email);

          // ── the other person, arriving through their invitation ─────────────────────────
          if (theirs) {
            const invite = mailSince(mark2).find((m) => m.to === theirs.email);
            if (!invite) {
              run.broke('the other person is invited', 'no invitation email was sent to them');
            } else if (!invite.link) {
              run.broke('the other person opens their invitation', 'the invitation has no link in it');
            } else {
              run.say('the other person gets an invitation', `"${invite.subject}"`);
              const inviteToken = tokenIn(invite.link);
              const preview = await call('GET', `/participants/invite?token=${inviteToken}`);
              if (preview.status >= 400) {
                run.broke('they open the invitation', `${preview.status} ${JSON.stringify(preview.data).slice(0, 120)}`);
              } else {
                run.say('they open the invitation', `sees "${String(preview.data?.groundLabel ?? preview.data?.label ?? '')}"`);
                const accepted = await call('POST', '/participants/accept', { token: inviteToken });
                if (accepted.status >= 400) {
                  run.broke('they accept', `${accepted.status} ${JSON.stringify(accepted.data).slice(0, 140)}`);
                } else {
                  participantReached = true;
                  const theirToken = accepted.data?.accessToken as string;
                  run.say('they accept the invitation', theirToken ? 'signed in' : 'accepted but NOT signed in');

                  const theirCheckIn = accepted.data?.checkInId
                    ?? (await call('GET', `/grounds/${groundId}`, undefined, theirToken)).data?.participants
                      ?.find((p: any) => p.email === theirs.email)?.checkIns?.[0]?.id;

                  if (theirToken && theirCheckIn) {
                    await answerTheCheckIn(run, 'the other person', theirCheckIn, theirToken, THEIR_ANSWERS);
                  } else {
                    run.broke('they reach their check-in', `token ${!!theirToken}, check-in ${theirCheckIn ?? 'not found'}`);
                  }
                }
              }
            }
          }

          // ── and the admin answers their own ─────────────────────────────────────────────
          const myCheckIn = mine?.checkIns?.[0]?.id
            ?? (await call('GET', `/grounds/${groundId}`, undefined, token)).data?.participants
              ?.find((p: any) => p.email === email)?.checkIns?.[0]?.id;
          if (myCheckIn) {
            completed = await answerTheCheckIn(run, 'the admin', myCheckIn, token, MY_ANSWERS);
          } else {
            run.broke('the admin reaches their own check-in', 'no check-in of their own was found');
          }

          // ── the report, looked for the way somebody actually looks ─────────────────────
          const firstLook = await call('GET', `/grounds/${groundId}/report`, undefined, token);
          if (firstLook.status === 404) {
            /* The report is generated after the last person finishes, and the page a person lands
               on immediately says "Report not found" — which is what a deleted thing says. */
            run.say('look for the report straight away', '404 Report not found', 'finishing and looking immediately says the report does not exist, rather than that it is being written');
          }

          const startedWaiting = Date.now();
          let got = firstLook;
          while (Date.now() - startedWaiting < 90_000) {
            if (got.status === 200 && got.data?.sharedPicture) break;
            await new Promise((r) => setTimeout(r, 3000));
            got = await call('GET', `/grounds/${groundId}/report`, undefined, token);
          }
          const waited = Math.round((Date.now() - startedWaiting) / 1000);

          if (got.status === 200 && got.data?.sharedPicture) {
            shared = true;
            run.say('open the shared report', `after ${waited}s: ${String(got.data.sharedPicture).slice(0, 100)}`,
              waited > 5 ? `the report took ${waited}s to appear, with nothing on screen saying it was coming` : undefined);
          } else if (got.status === 200) {
            run.say('look for the report', `still forming after ${waited}s`, 'the report never arrived while somebody was waiting for it');
          } else {
            run.broke('look for the report', `${got.status} after ${waited}s: ${JSON.stringify(got.data).slice(0, 120)}`);
          }
          individual = shared;
        }
      }
    }
  } catch (err: any) {
    run.broke('somewhere in the journey', err?.message ?? String(err));
  }

  const outcome: Outcome = {
    id: journey.id,
    persona: journey.persona,
    behaviour: journey.behaviour,
    setupReached,
    participantReached,
    checkInCompleted: completed,
    sharedReport: shared,
    individualReport: individual,
    /* PASS ONLY WHERE THE INTENDED FIRST REPORT WAS ACTUALLY REACHED. A journey that set something
       up and stopped has not answered the question this audit asks. */
    verdict: run.failedAt || !reachedWhatItCameFor(journey.wants, shared, individual, setupReached)
      ? (run.failedAt ? 'FAIL' : 'FAIL')
      : run.frictions.length ? 'PASS WITH FRICTION' : 'PASS',
    failedAt: run.failedAt,
    friction: run.frictions,
    steps: run.steps.map((s) => ({ did: s.did, got: s.got })),
    ranAt: new Date().toISOString(),
  };
  record(RESULTS, outcome);
  console.log(`J${journey.id} ${outcome.verdict}${outcome.failedAt ? ' at ' + outcome.failedAt : ''}`);
  for (const s of run.steps) console.log(`   ${s.failed ? 'x' : '-'} ${s.did} => ${s.got}`);
}

const MY_ANSWERS = [
  'She starts on the first of next month as our delivery lead.',
  'By day 90 I want the pilot live with two customers on it, and her running the weekly with the client herself.',
  'The risk is that she waits to be told what to do rather than deciding.',
];
const THEIR_ANSWERS = [
  'I am her manager. I want her owning the client relationship by the end of the quarter.',
  'Success is the pilot live and her chairing the weekly without me in it.',
  'What worries me is us not agreeing what she is allowed to decide on her own.',
];

/** What each person actually types. One script per journey where it differs. */
const SCRIPTS: Record<string | number, string[]> = {
  default: [
    'We have a new person starting in two weeks and I want us to agree what good looks like.',
    'She is joining as a delivery lead. I want her and her manager to write down what the first 90 days should produce.',
    'Her manager is the other person. That is everyone.',
  ],
  2: ['new project starting'],
  3: [
    'The delivery has drifted. We agreed in June that the pilot would be live by September and it is not, and every time I ask I get a different reason. Two of the four people think the scope changed and two think it did not. I have a board meeting in three weeks and I need to know what is actually true rather than what everybody tells me separately in corridors. I do not want to point fingers, I want the four of them to write down what they each think happened so we can look at it together.',
  ],
  4: ['Something is not right with the team but I cannot put my finger on it.'],
};

main();
