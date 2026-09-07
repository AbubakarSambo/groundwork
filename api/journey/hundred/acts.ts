
/**
 * THE THINGS A PERSON DOES, EACH ONE THROUGH THE DOOR THEY WOULD USE.
 *
 * A journey is a sequence of these. Keeping them here rather than in the runner means every
 * journey exercises the same code a person exercises, and a variation is a different order of the
 * same acts rather than a second implementation of the product.
 */
import { Run, call, mailMark, mailSince, tokenIn, anAddress, A_WAIT_SOMEBODY_NOTICES_MS } from './harness';

export interface Who { email: string; token: string | null; orgId?: string }

/** Sign up from nothing, through the email, the way somebody with no account does. */
export async function signUpThroughEmail(run: Run, label: string, draft?: unknown): Promise<Who | null> {
  const email = anAddress(label);
  const mark = mailMark();
  const saved = await call('POST', '/auth/entry-save', { email, draft });
  if (saved.status >= 400) { run.broke(`${label} gives an email address`, `${saved.status}`); return null; }

  await new Promise((r) => setTimeout(r, 700));
  const mail = mailSince(mark).filter((m) => m.to === email);
  if (!mail.length) { run.broke(`${label} waits for the email`, 'nothing arrived'); return null; }
  const link = mail[mail.length - 1];
  if (!link.link) { run.broke(`${label} follows the link`, `"${link.subject}" has no link in it`); return null; }

  const verified = await call('POST', '/auth/verify-email', { token: tokenIn(link.link) });
  if (verified.status >= 400) { run.broke(`${label} opens the link`, `${verified.status} ${JSON.stringify(verified.data).slice(0, 120)}`); return null; }
  run.say(`${label} signs up through the email`, `"${link.subject}" -> signed in`);
  return { email, token: verified.data?.accessToken ?? null, orgId: verified.data?.user?.organizationId };
}

/** Set a check-in up the way the wizard does: create, then add the people. */
export async function createTheCheckIn(
  run: Run,
  who: Who,
  opts: { label: string; scenario: string; moment?: string; brief?: string; people: string[] },
): Promise<{ groundId: string; invited: string[] } | null> {
  const made = await call('POST', '/grounds', {
    label: opts.label,
    scenario: opts.scenario,
    moment: opts.moment ?? 'STARTING',
    timelineDays: 90,
    brief: opts.brief ?? 'We are agreeing what the first ninety days should produce, and what each of us is responsible for in it.',
  }, who.token);
  if (made.status >= 400) { run.broke('set the check-in up', `${made.status} ${JSON.stringify(made.data).slice(0, 160)}`); return null; }
  const groundId = String(made.data?.id ?? made.data?.ground?.id ?? '');
  run.say('set the check-in up', `${opts.scenario}, ground ${groundId.slice(0, 8)}`);

  const invited: string[] = [];
  for (const person of opts.people) {
    const added = await call('POST', `/grounds/${groundId}/participants`, { email: person }, who.token);
    if (added.status >= 400) {
      run.say(`invite ${person.split('@')[0]}`, `${added.status} ${JSON.stringify(added.data?.message ?? added.data).slice(0, 100)}`,
        'an invitation the person setting this up expected to send was refused');
    } else { invited.push(person); run.say(`invite ${person.split('@')[0]}`, 'invited'); }
  }
  return { groundId, invited };
}

/** Somebody opening an invitation email and arriving at their own check-in. */
export async function arriveFromTheInvitation(run: Run, email: string, since: number): Promise<Who & { checkInId?: string } | null> {
  const mail = mailSince(since).filter((m) => m.to === email);
  const invite = mail.find((m) => /invited you|check in on/i.test(m.subject)) ?? mail[0];
  if (!invite) { run.broke(`${email.split('@')[0]} is invited`, 'no invitation arrived'); return null; }
  if (!invite.link) { run.broke(`${email.split('@')[0]} opens the invitation`, `"${invite.subject}" has no link`); return null; }
  run.say(`${email.split('@')[0]} gets an invitation`, `"${invite.subject}"`);

  const token = tokenIn(invite.link);
  const preview = await call('GET', `/participants/invite?token=${token}`);
  if (preview.status >= 400) { run.broke('they open the invitation', `${preview.status}`); return null; }

  const accepted = await call('POST', '/participants/accept', { token });
  if (accepted.status >= 400) { run.broke('they accept', `${accepted.status} ${JSON.stringify(accepted.data).slice(0, 140)}`); return null; }
  run.say('they accept the invitation', accepted.data?.accessToken ? 'signed in' : 'accepted but not signed in',
    accepted.data?.accessToken ? undefined : 'accepting did not sign them in, so they are at a door they cannot open', accepted.ms);

  /* The same link, opened twice — a person who is not sure the first click worked. */
  const secondClick = await call('POST', '/participants/accept', { token });
  run.say('they open the invitation a second time', `${secondClick.status} ${String(secondClick.data?.message ?? '').slice(0, 70)}`,
    secondClick.status >= 400 && !secondClick.data?.accessToken
      ? `opening their own invitation twice says "${String(secondClick.data?.message ?? '').slice(0, 60)}"`
      : undefined);
  return { email, token: accepted.data?.accessToken ?? null, checkInId: accepted.data?.checkInId };
}

/** Whichever check-in on this ground is theirs, found the way the page finds it. */
export async function theirCheckIn(who: Who, groundId: string): Promise<string | null> {
  const ground = await call('GET', `/grounds/${groundId}`, undefined, who.token);
  const parties: any[] = ground.data?.participants ?? [];
  const mine = parties.find((p: any) => p.email?.toLowerCase() === who.email.toLowerCase());
  const open = (mine?.checkIns ?? []).find((c: any) => c.status !== 'COMPLETED') ?? (mine?.checkIns ?? [])[0];
  return open?.id ?? null;
}

/** Answering, in their own words, and finishing. */
export async function answer(run: Run, who: string, checkInId: string, token: string, says: string[]): Promise<boolean> {
  const opened = await call('POST', `/check-ins/${checkInId}/open`, {}, token);
  if (opened.status >= 400) {
    if (String(opened.data?.message ?? '').includes('already complete')) {
      run.say(`${who} opens their check-in`, 'already finished'); return true;
    }
    run.broke(`${who} opens their check-in`, `${opened.status} ${JSON.stringify(opened.data).slice(0, 110)}`);
    return false;
  }
  let slowest = 0;
  for (const [i, line] of says.entries()) {
    const r = await call('POST', `/check-ins/${checkInId}/messages`, { message: line }, token);
    if (r.status >= 400) { run.broke(`${who} answers`, `${r.status} ${JSON.stringify(r.data).slice(0, 110)}`); return false; }
    slowest = Math.max(slowest, r.ms);
    run.say(`${who} answers`, String(r.data?.reply ?? '').slice(0, 80), undefined, r.ms);

    /* A SLOW ANSWER MAKES PEOPLE PRESS SEND AGAIN. Once per journey, on the first answer, do what
       they do — and see whether the record ends up with it twice. */
    if (i === 0 && r.ms > A_WAIT_SOMEBODY_NOTICES_MS) {
      const again = await call('POST', `/check-ins/${checkInId}/messages`, { message: line }, token);
      const transcript = await call('GET', `/check-ins/${checkInId}/transcript`, undefined, token);
      const turns: any[] = transcript.data?.turns ?? transcript.data?.messages ?? [];
      const saidTwice = turns.filter((t: any) => String(t.content ?? '').trim() === line.trim()).length;
      run.say(`${who} presses send again after waiting`, `${again.status}, the record now holds it ${saidTwice} times`,
        saidTwice > 1 ? 'a slow reply and a second press put the same answer in the record twice' : undefined);
    }
  }

  let done = await call('POST', `/check-ins/${checkInId}/complete`, {}, token);

  /* REFUSED FOR BEING TOO SHORT, WHICH A PERSON ANSWERS RATHER THAN ABANDONS.
     The refusal carries `canContinue`, so the composer re-opens and somebody would type more. What
     is recorded is what they saw first and what it cost them — not a failure the product does not
     actually have. */
  if (done.status === 400 && (done.raw?.canContinue || done.data?.canContinue || /almost nothing here yet|record is still thin/i.test(JSON.stringify(done.data)))) {
    run.sawBeforeRecovering(`${who} presses finish`, String(done.data?.message ?? done.raw?.message ?? '').slice(0, 120));
    const more = await call('POST', `/check-ins/${checkInId}/messages`, {
      message: 'Alright, more fully: the thing I care about is that it is live by the end of the quarter and that they are running it without me, and the risk is that nobody has said who decides what.',
    }, token);
    run.say(`${who} types more because they were asked to`, `${more.status}`, 'pressing finish was refused for being too short, and the refusal does not say how much is enough', more.ms);
    done = await call('POST', `/check-ins/${checkInId}/complete`, {}, token);
  }

  if (done.status >= 400) { run.broke(`${who} finishes`, `${done.status} ${JSON.stringify(done.data).slice(0, 110)}`); return false; }

  /* And the second click on Finish, which every slow page produces. */
  const twice = await call('POST', `/check-ins/${checkInId}/complete`, {}, token);
  run.say(`${who} finishes`, `first ${done.status}, again ${twice.status}`,
    twice.status >= 500 ? 'clicking finish twice produced a server error' : undefined, slowest);
  return true;
}

/** Looking for the report the way somebody does: straight away, then again. */
export async function lookForTheReport(run: Run, who: Who, groundId: string, waitMs = 90_000) {
  const first = await call('GET', `/grounds/${groundId}/report`, undefined, who.token);
  if (first.status === 404) {
    /* WHAT IT ACTUALLY SAID, not a string this file remembers. The hardcoded 'Report not found'
       kept being recorded after the product had stopped saying it — a runner that narrates from
       its own memory is reporting on itself. */
    run.sawBeforeRecovering(
      'look for the report the moment they finish',
      String(first.data?.message ?? first.raw?.message ?? '(a 404 with no sentence)'),
    );
  } else if (first.status === 200 && !first.data?.sharedPicture) {
    run.sawBeforeRecovering('look for the report the moment they finish',
      String(first.data?.message ?? 'the page says it appears once everybody has checked in'));
  }
  const began = Date.now();
  let got = first;
  while (Date.now() - began < waitMs) {
    if (got.status === 200 && got.data?.sharedPicture) break;
    await new Promise((r) => setTimeout(r, 3000));
    got = await call('GET', `/grounds/${groundId}/report`, undefined, who.token);
  }
  const waited = Math.round((Date.now() - began) / 1000);

  if (got.status === 200 && got.data?.sharedPicture) {
    run.say('open the report', `after ${waited}s`,
      waited > 5 ? `waited ${waited}s after finishing, with the page saying the report does not exist for most of it` : undefined);
    return true;
  }
  if (got.status === 200) { run.say('look for the report', `still forming after ${waited}s`, 'the report never arrived'); return false; }
  run.broke('look for the report', `${got.status} after ${waited}s`);
  return false;
}

export { mailMark };
