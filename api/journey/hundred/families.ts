
/**
 * THE FAMILIES OF JOURNEY, AND WHAT MAKES EACH ONE DIFFERENT.
 *
 * A journey is not a happy path with a different label. What varies is the door somebody comes
 * through, whether they had an account, what they upload, what they do halfway, whose check-in it
 * is, and which report they are trying to reach. Each of these runs the product differently.
 */
import { Journey } from './matrix';
import { Run, call, mailMark, mailSince, tokenIn, anAddress } from './harness';
import { signUpThroughEmail, createTheCheckIn, arriveFromTheInvitation, theirCheckIn, answer, lookForTheReport, Who } from './acts';

/** The first question in a reply, so the same one asked twice can be seen as a person sees it. */
function firstQuestion(text: string): string | null {
  const q = text.split(/(?<=[.?!])\s+/).find((line) => line.trim().endsWith('?'));
  return q ? q.trim().toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ') : null;
}

export interface Result {
  setup: boolean;
  participantArrived: boolean | null;
  completed: boolean;
  shared: boolean | null;
  individual: boolean | null;
}

const A_CONTRACT = `DATA LICENCE AND REVENUE SHARE
Between Northwind Analytics ("the Provider") and Meridian Foods ("the Client").
Commencement: 1 January 2026. Term: twelve months.
Clause 4.2 Revenue share: the Client shall pay the Provider twenty per cent (20%) of revenue
derived from the protected data.
Clause 6.1 Reporting: the Client shall report revenue derived from the protected data each quarter.
Clause 9 Approved clients: Northwind, Acme and Bridgeworks. No other client may be served with the
protected data without written approval.`;

const A_JOB_DESCRIPTION = `ROLE: Delivery Lead
Reports to: Head of Delivery. Start date: 1 October 2026.
Purpose: own delivery of the pilot programme end to end, including the client relationship.
First 90 days: pilot live with two customers; weekly client meeting chaired without support;
handover of the existing backlog completed.
Decision rights: may commit to scope changes under two weeks of effort without escalation.`;

const A_SECOND_CONTRACT = `AMENDMENT ONE
Clause 4.2 is amended: the revenue share is fifteen per cent (15%) of NET revenue after
direct costs. Approved clients are extended to include Delta Foods.`;

const SAYS = {
  clear: [
    'We have somebody starting in two weeks and I want us to agree what good looks like before they do.',
    'She is a delivery lead. Her manager is the other person on this. That is everybody.',
  ],
  oneLine: ['new project starting'],
  long: [
    'The delivery has drifted. We agreed in June the pilot would be live by September and it is not, and every time I ask I get a different reason. Two of the four people think the scope changed and two think it did not. I have a board meeting in three weeks and I need to know what is actually true rather than what everybody tells me separately in corridors. I do not want to point fingers. I want them to write down what they each think happened so we can look at it together.',
  ],
  vague: ['Something is off with the team but I cannot put my finger on it.'],
  asksBack: ['What is this for?', 'Do you keep what I write private?'],
  changesMind: [
    'We have a new hire starting.',
    'Actually it is not the hire. The problem is the project she is joining, which is already late.',
  ],
  corrects: [
    'The person is called Sam and she starts in October.',
    'Sorry, not Sam. Her name is Sana, and it is November not October.',
  ],
  contradicts: [
    'There are three of us on this and it starts in January.',
    'It is just me and the client, and we started last month.',
  ],
  ownWords: [
    'We need a retro on our OKR cadence because velocity is down and the squad is not aligned on the north star.',
  ],
} as const;

/** The person who talks to the entry chat, then signs up, then commits it. */
export async function throughTheEntryChat(run: Run, journey: Journey): Promise<Result> {
  const out: Result = { setup: false, participantArrived: null, completed: false, shared: null, individual: null };

  const script =
    journey.behaviour.includes('one sentence') ? SAYS.oneLine
    : journey.behaviour.includes('six paragraphs') ? SAYS.long
    : journey.behaviour.includes('vague') ? SAYS.vague
    : journey.behaviour.includes('asks the assistant') ? SAYS.asksBack
    : journey.behaviour.includes('changes their mind') ? SAYS.changesMind
    : journey.behaviour.includes('corrects') ? SAYS.corrects
    : journey.behaviour.includes('contradicts') ? SAYS.contradicts
    : journey.behaviour.includes('words the product does not use') ? SAYS.ownWords
    : SAYS.clear;

  const opener = await call('POST', '/entry/opener', { scenario: journey.scenario });
  if (opener.status >= 400) { run.broke('open the entry chat', String(opener.status)); return out; }
  const history: { role: 'user' | 'assistant'; content: string }[] = [
    { role: 'assistant', content: String(opener.data?.reply ?? '') },
  ];

  for (const line of script) {
    history.push({ role: 'user', content: line });
    const r = await call('POST', '/entry/chat', { messages: history, scenario: journey.scenario });
    if (r.status >= 400) { run.broke('say something in the chat', `${r.status} ${JSON.stringify(r.data).slice(0, 110)}`); return out; }
    const reply = String(r.data?.reply ?? '');
    history.push({ role: 'assistant', content: reply });

    /* WHAT A PERSON READS, JUDGED AS READING. A correct setup arrived at through six paragraphs
       and four repeats of the same question is not a good conversation. */
    const tooLong = reply.length > 900;
    const askedAgain = history
      .filter((h) => h.role === 'assistant')
      .slice(0, -1)
      .some((h) => firstQuestion(h.content) && firstQuestion(h.content) === firstQuestion(reply));

    run.say(
      `says: ${line.slice(0, 40)}`,
      reply.slice(0, 90),
      tooLong ? `the reply is ${reply.length} characters — a wall of text to answer one sentence`
        : askedAgain ? `asked the same question again: "${firstQuestion(reply)?.slice(0, 70)}"`
        : undefined,
      r.ms,
    );
    if (!reply.trim()) run.say('reads the reply', 'empty', 'the assistant answered with nothing at all');
  }

  /* Halfway out and back, on the same browser. */
  if (journey.twist?.includes('returns') || journey.behaviour.includes('leaves halfway')) {
    const again = await call('POST', '/entry/chat', { messages: history, scenario: journey.scenario });
    run.say('comes back and carries on', again.status === 200 ? 'the conversation is still there' : `${again.status}`,
      again.status === 200 ? undefined : 'coming back mid-conversation did not work');
  }

  const documents =
    journey.docs === 'none' ? undefined
    : journey.docs === 'two, overlapping' || journey.docs === 'two, contradictory'
      ? [{ fileName: 'agreement.txt', content: A_CONTRACT }, { fileName: 'amendment.txt', content: A_SECOND_CONTRACT }]
      : journey.docs === 'unreadable'
        ? [{ fileName: 'scan.pdf', content: '%PDF-1.4 binary-ish content with no readable text' }]
        : [{ fileName: journey.scenario === 'NEW_HIRE' ? 'job-description.txt' : 'agreement.txt',
             content: journey.scenario === 'NEW_HIRE' ? A_JOB_DESCRIPTION : A_CONTRACT }];

  const admin = await signUpThroughEmail(run, 'admin', { payload: { situation: script[0] }, history });
  if (!admin?.token) return out;
  const signedIn: Who = { email: admin.email, token: admin.token };

  const other = journey.mix === 'solo' ? null : anAddress('other');
  const since = mailMark();
  const committed = await call('POST', '/entry/commit', {
    groundLabel: `J${journey.id} ${journey.scenario}`,
    scenario: journey.scenario,
    history,
    documents,
    contributors: other ? [{ email: other }] : [],
  }, admin.token);

  if (committed.status >= 400) {
    run.broke('turn the conversation into a check-in', `${committed.status} ${JSON.stringify(committed.data).slice(0, 150)}`);
    return out;
  }
  out.setup = true;
  const groundId = String(committed.data?.groundId ?? '');
  run.say('turn the conversation into a check-in', `ground ${groundId.slice(0, 8)}`);

  if (documents) {
    const docs = await call('GET', `/grounds/${groundId}/documents`, undefined, admin.token);
    const kept = (docs.data?.documents ?? docs.data ?? []).length;
    run.say('check the document came with it', `${kept} kept`,
      kept === documents.length ? undefined : `uploaded ${documents.length} and ${kept} survived into the check-in`);
  }

  /* The mark taken BEFORE the commit, because the invitation goes out during it. */
  return finishTheRound(run, out, signedIn, groundId, other, journey, since);
}

/** Somebody signed in, using the ordinary wizard. */
export async function throughTheWizard(run: Run, journey: Journey): Promise<Result> {
  const out: Result = { setup: false, participantArrived: null, completed: false, shared: null, individual: null };
  const admin = await signUpThroughEmail(run, 'admin');
  if (!admin?.token) return out;
  const signedIn: Who = { email: admin.email, token: admin.token };

  const people =
    journey.mix === 'solo' ? []
    : journey.mix === 'many' ? [anAddress('one'), anAddress('two'), anAddress('three')]
    : journey.twist?.includes('same person twice') ? (() => { const a = anAddress('twice'); return [a, a]; })()
    : journey.twist?.includes('typo') ? ['not-an-address']
    : [anAddress('other')];

  const since = mailMark();
  const made = await createTheCheckIn(run, admin, {
    label: `J${journey.id} ${journey.scenario}`,
    scenario: journey.scenario,
    moment: journey.scenario === 'IMPLEMENTATION_TRACKING' ? 'RECOGNITION' : 'STARTING',
    people,
  });
  if (!made) return out;
  out.setup = true;

  return finishTheRound(run, out, signedIn, made.groundId, made.invited[0] ?? null, journey, since);
}

/** The rest of the round, from whoever was invited to whichever report was wanted. */
async function finishTheRound(
  run: Run, out: Result, admin: Who, groundId: string, other: string | null, journey: Journey, since?: number,
): Promise<Result> {
  const mark = since ?? mailMark();
  let theirToken: string | null = null;

  if (other) {
    const them = await arriveFromTheInvitation(run, other, mark);
    if (them?.token) {
      out.participantArrived = true;
      theirToken = them.token;
      const theirs = them.checkInId ?? (await theirCheckIn(them, groundId));
      if (theirs) {
        const said = journey.behaviour.includes('short answers') ? ['Fine.', 'Yes.', 'Nothing else.']
          : journey.behaviour.includes('refuses') ? ['I would rather not answer that one.', 'Still no.', 'That is all I want to say.']
          : journey.behaviour.includes('asks who will see') ? ['Before I answer — who reads this?', 'Alright. Here is my version.', 'That is everything.']
          : ['Here is how it looks from where I sit.', 'By the end I want it live and running without me.', 'The risk is nobody has said who decides.'];
        if (journey.behaviour.includes('declines')) {
          const declined = await call('POST', `/check-ins/${theirs}/decline`, {}, them.token);
          run.say('the other person declines', declined.status < 400 ? 'recorded' : `${declined.status}`,
            declined.status < 400 ? undefined : 'declining the willingness gate was refused');
        } else if (!journey.twist?.includes('never starts')) {
          await answer(run, 'the other person', theirs, them.token, said);
        }
      } else run.broke('they reach their check-in', 'no check-in of theirs was found');
    } else out.participantArrived = false;
  }

  /* Some journeys are about somebody NOT finishing. */
  if (journey.twist?.includes('never starts')) {
    run.say('the other party never starts', 'left untouched on purpose');
  }

  const mine = await theirCheckIn(admin, groundId);
  if (mine) {
    out.completed = await answer(run, 'the person who set it up', mine, admin.token ?? '', [
      'This starts at the beginning of next month.',
      'By the end I want it live, with them running it themselves.',
      'What worries me is waiting to be told rather than deciding.',
    ]);
  } else run.broke('the person who set it up reaches their own check-in', 'none found');

  if (journey.wants !== 'setup only') {
    out.shared = await lookForTheReport(run, admin, groundId);

    /* WHOSE REPORT THIS JOURNEY IS ABOUT. A participant journey that only checks the organiser's
       view has not asked the question it exists to ask: can the person who was invited find what
       the exercise produced for them. */
    if (journey.persona !== 'org admin' && theirToken) {
      /* THE REVEAL, WHICH IS A BUTTON THE PERSON PRESSES.
         A participant's report opens behind a deliberate step: they show theirs before they see
         the others'. Not pressing it is my harness missing a control, not the product refusing —
         so the journey presses it, and what is recorded is what pressing it costs. */
      const stub = await call('GET', `/grounds/${groundId}/report`, undefined, theirToken);
      if (stub.status === 200 && stub.data?.activated === false) {
        run.sawBeforeRecovering('the invited person opens the report', 'a report with nothing in it and a button to reveal it');
        const revealed = await call('POST', `/grounds/${groundId}/report/activate`, {}, theirToken);
        run.say('they press reveal', `${revealed.status}`, revealed.status >= 400 ? 'pressing reveal was refused' : undefined, revealed.ms);
      }
      const theirs = await call('GET', `/grounds/${groundId}/report`, undefined, theirToken);
      if (theirs.status === 200 && (theirs.data?.sharedPicture || theirs.data?.soloArtifact)) {
        out.individual = true;
        run.say('the invited person opens the report', 'they can read it');
      } else if (theirs.status === 200) {
        out.individual = false;
        run.say('the invited person looks for the report', 'nothing to read yet',
          'the person who was invited cannot see what their own check-in produced');
      } else {
        out.individual = false;
        run.say('the invited person looks for the report', `${theirs.status} ${JSON.stringify(theirs.data?.message ?? '').slice(0, 60)}`,
          'the person who was invited is refused their own report');
      }
    } else {
      out.individual = out.shared;
    }
  }
  return out;
}


/**
 * SOMEBODY HANDED A CHECK-IN AN ADMIN SET UP FOR THEM.
 *
 * A different arc from the wizard: the admin never takes part, the lead confirms, and the question
 * is whether the person who was handed it can reach the thing they were told about.
 */
export async function handedToALead(run: Run, journey: Journey): Promise<Result> {
  const out: Result = { setup: false, participantArrived: null, completed: false, shared: null, individual: null };

  const admin = await signUpThroughEmail(run, 'admin');
  if (!admin?.token) return out;

  const leadEmail = anAddress('lead');
  const since = mailMark();
  const made = await call('POST', '/grounds/for-lead', {
    leadEmail,
    leadName: 'A lead',
    label: `J${journey.id} ${journey.scenario}`,
    scenario: journey.scenario,
    moment: 'STARTING',
    timelineDays: 90,
    brief: 'You are running this one. Two people need to agree what the first quarter should produce.',
  }, admin.token);

  if (made.status >= 400) {
    run.broke('an admin sets one up for a lead', `${made.status} ${JSON.stringify(made.data?.message ?? made.data).slice(0, 140)}`);
    return out;
  }
  out.setup = true;
  const groundId = String(made.data?.id ?? made.data?.ground?.id ?? '');
  run.say('an admin sets one up for a lead', `ground ${groundId.slice(0, 8)}, handed to ${leadEmail.split('@')[0]}`);

  await new Promise((r) => setTimeout(r, 800));
  const mail = mailSince(since).filter((m) => m.to === leadEmail);
  if (!mail.length) { run.broke('the lead is told', 'no email reached them'); return out; }
  const invite = mail[mail.length - 1];
  run.say('the lead gets an email', `"${invite.subject}"`);
  if (!invite.link) { run.broke('the lead opens it', 'the email has no link in it'); return out; }

  /* A lead arrives through the password-setup door, not the participant one. */
  const token = tokenIn(invite.link);
  const set = await call('POST', '/auth/set-password', { token, password: 'JourneyPass123!' });
  const leadToken = set.status < 400 ? set.data?.accessToken as string : null;
  if (!leadToken) {
    run.broke('the lead gets in', `${set.status} ${JSON.stringify(set.data?.message ?? set.data).slice(0, 120)}`);
    return out;
  }
  out.participantArrived = true;
  run.say('the lead sets a password and lands', 'signed in');

  const seen = await call('GET', `/grounds/${groundId}`, undefined, leadToken);
  if (seen.status >= 400) {
    run.broke('the lead opens the check-in they were given', `${seen.status} — they were told they are leading something they cannot open`);
    return out;
  }
  run.say('the lead opens the check-in they were given', String(seen.data?.label ?? '').slice(0, 60));

  /* `managingOnly: false` is the lead taking part as well — the field the DTO actually has. */
  const confirmed = await call('POST', `/grounds/${groundId}/confirm-lead`,
    { managingOnly: journey.behaviour.includes('managing only') }, leadToken);
  run.say('the lead confirms it', confirmed.status < 400 ? 'confirmed' : `${confirmed.status} ${JSON.stringify(confirmed.data?.message ?? '').slice(0, 90)}`,
    confirmed.status < 400 ? undefined : 'the lead could not confirm the check-in they were handed');

  const other = anAddress('other');
  const beforeInvite = mailMark();
  const added = await call('POST', `/grounds/${groundId}/participants`, { email: other }, leadToken);
  if (added.status >= 400) {
    run.say('the lead adds the other person', `${added.status} ${JSON.stringify(added.data?.message ?? '').slice(0, 90)}`,
      'the lead could not add the people they were asked to run this with');
  } else {
    run.say('the lead adds the other person', 'invited');
    const them = await arriveFromTheInvitation(run, other, beforeInvite);
    if (them?.token) {
      const theirs = them.checkInId ?? (await theirCheckIn(them, groundId));
      if (theirs) await answer(run, 'the other person', theirs, them.token, [
        'Here is my account of it.', 'By the end I want it running without me.', 'The risk is nobody has said who decides.',
      ]);
    }
  }

  const leadWho: Who = { email: leadEmail, token: leadToken };
  const mine = await theirCheckIn(leadWho, groundId);
  if (mine) out.completed = await answer(run, 'the lead', mine, leadToken, [
    'This starts next month.', 'By the end it should be running without me.', 'What worries me is who decides what.',
  ]);

  if (journey.wants !== 'setup only') {
    out.shared = await lookForTheReport(run, leadWho, groundId);
    out.individual = out.shared;
  }
  return out;
}
