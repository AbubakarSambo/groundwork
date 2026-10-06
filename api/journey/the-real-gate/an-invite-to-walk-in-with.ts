/**
 * A LEAD SETS ONE UP AND INVITES ONE PERSON, SO THE PARTICIPANT SIDE CAN BE WALKED IN A BROWSER.
 *
 * The participant conversation is the half a lead is asking their team to do, and it cannot be
 * judged from the lead's screens - a participant's check-in is private and the lead gets a 403.
 * This does the lead's part and prints the invitation link. A person then opens it and walks it.
 */
import { call, mailMark, mailSince, tokenIn, anAddress } from '../hundred/harness';

const settle = (ms = 1200) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const scenario = 'OKR_ALIGNMENT';
  const brief = 'We are shipping the onboarding rewrite this quarter and I want to know each week whether the plan is being followed and where it is stuck.';
  const opener = await call('POST', '/entry/opener', { scenario });
  const history: { role: 'user' | 'assistant'; content: string }[] = [{ role: 'assistant', content: String(opener.data?.reply ?? '') }];
  for (const line of [brief, 'Two of us. Me running it and Tomi on engineering.', 'Weekly, for three weeks.']) {
    history.push({ role: 'user', content: line });
    const r = await call('POST', '/entry/chat', { messages: history, scenario });
    history.push({ role: 'assistant', content: String(r.data?.reply ?? '') });
  }
  const email = anAddress('lead');
  const signUp = mailMark();
  await call('POST', '/auth/entry-save', { email, draft: { payload: { situation: brief }, history } });
  await settle();
  const link = mailSince(signUp).filter((m) => m.to === email).map((m) => m.link).filter(Boolean).pop();
  const LEAD = (await call('POST', '/auth/verify-email', { token: tokenIn(link!) })).data?.accessToken;

  const read = await call('POST', '/entry/report', { messages: history, scenario, groundLabel: 'The onboarding rewrite' });
  const who = anAddress('tomi');
  const invites = mailMark();
  const committed = await call('POST', '/entry/commit', {
    groundLabel: 'The onboarding rewrite', scenario, history,
    reportSummary: read.data?.report ?? undefined, roleAsDescribed: 'Chief of staff',
    contributors: [{ email: who }],
  }, LEAD);
  await settle(1800);
  const invite = mailSince(invites).filter((m) => m.to === who).map((m) => m.link).filter(Boolean).pop();
  process.stdout.write(`GROUND=${committed.data?.groundId}\nWHO=${who}\nINVITE=${invite}\n`);
})();
