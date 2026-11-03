import { THE_REMINDERS_IN_OUR_OWN_WORDS } from '../grounds/what-is-sent-in-simpler-words';
import { EmailService } from '../email/email.service';
import { TEMPLATES, fill } from './a-message-outside-the-window';
import { theCheckInIsOpen, itIsDueTomorrow, itOpensSoon, itIsOverdue, theTeamIsAlmostIn, yourViewMatters, itFollowsUpTheirPromise } from './what-goes-to-a-phone';
import { carryOnSaying, closesInHalfAnHourSaying, closedByTheClockSaying, remindThemToCarryOn } from './a-check-in-left-halfway';

/**
 * "USE SIMPLER WORDS" REACHES THE PHONE AND THE MAILBOX. With the switch off (or missing) every sentence is
 * byte for byte the one the product has always sent; with it on, a person reads the plainer form, and what
 * goes outside the 24 hours is still the approved template, from the same blanks.
 */
const who = { firstName: 'Amani', label: 'Sales team, Q4' };
const day = new Date('2026-10-08T09:00:00Z');

describe('the reminders on WhatsApp', () => {
  const all = (s?: boolean | null) => [
    theCheckInIsOpen(who, s), itIsDueTomorrow(who, day, s), itOpensSoon(who, day, s), itIsOverdue(who, s),
    theTeamIsAlmostIn(who, 3, 5, s), yourViewMatters(who, 'Wairimu', s), itFollowsUpTheirPromise(who, 'call the Quickmart buyer', s),
  ];

  /* Changed with Hafsah's standing rule (14 October): where an approved template says five minutes, the normal message inside the 24 hours says about two minutes, in our own words with the same blanks. */
  it('with the switch off or missing, every one is the approved body, word for word, or our own ten-minute words where the template says five', () => {
    for (const off of [undefined, null, false]) {
      for (const n of all(off)) expect(n.text).toBe(fill(THE_REMINDERS_IN_OUR_OWN_WORDS[n.kind] ?? TEMPLATES[n.kind].body, n.params));
    }
  });

  it('with it on, Amani reads the plainer form, with the same blanks, so the template outside the window is unchanged', () => {
    const on = all(true), off = all(false);
    expect(on.map((n) => n.text)).toEqual([
      'Hi Amani, your check-in for Sales team, Q4 is open. It takes about two minutes. You can answer here. Write START to begin.',
      `Hi Amani, your check-in for Sales team, Q4 is due tomorrow, ${off[1].params[2]}. You can answer here at any time before then.`,
      `Hi Amani, your check-in for Sales team, Q4 opens in one hour, at ${off[2].params[2]}. Write here when it opens, and we will start.`,
      'Hi Amani, your check-in for Sales team, Q4 is late. It is still open. You can answer here now.',
      'Hi Amani, 3 of 5 people have answered the check-in for Sales team, Q4. You have not answered yet. When you answer, your answers go into the report.',
      'Hi Amani, your check-in for Sales team, Q4 is still waiting. Your answers help Wairimu see what is in your way and where they can help. It takes about two minutes. You can answer here.',
      'Hi Amani, last time you said you would call the Quickmart buyer. How did it go? Your check-in for Sales team, Q4 is open. You can answer here.',
    ]);
    on.forEach((n, i) => { expect(n.params).toEqual(off[i].params); expect(n.kind).toBe(off[i].kind); });
  });
});

describe('the three messages for somebody who stopped halfway', () => {
  it('off: the sentences are the ones already sent', () => {
    expect(carryOnSaying('Amani', 'X', false)).toBe('Hi Amani, your check-in for "X" is still open, and everything you have said so far is kept. Reply here to carry on whenever you are ready.');
    expect(closesInHalfAnHourSaying('X')).toBe('Your check-in for "X" closes in 30 minutes if nothing else is said. Add anything you still want on the record now.');
    expect(closedByTheClockSaying('X', null)).toBe('Your check-in for "X" has closed, because nothing was said for twelve hours. Everything you said is kept on the record.');
  });
  it('on: the plainer forms', () => {
    expect(carryOnSaying('Amani', 'X', true)).toBe('Hi Amani, your check-in for "X" is still open. Everything you have said is saved. Write here to carry on when you are ready.');
    expect(closesInHalfAnHourSaying('X', true)).toBe('Your check-in for "X" will close in 30 minutes if you say nothing more. Add anything you still want saved now.');
    expect(closedByTheClockSaying('X', true)).toBe('Your check-in for "X" has closed, because nothing was said for twelve hours. Everything you said is saved.');
  });
  it('the reminder reads the check-in\'s own switch', async () => {
    for (const simplerWords of [false, true]) {
      const sent: string[] = [];
      const began = new Date('2026-10-06T06:00:00Z');
      const prisma: any = {
        platformSetting: { findUnique: async () => ({ value: { at: '2026-10-05T12:00:00Z' } }) },
        conversationTurn: {},
        checkIn: { findUnique: async () => ({ startedAt: began, createdAt: began, ground: { organizationId: 'o', label: 'X', overWhatsApp: null, simplerWords }, participant: { email: 'a@k.test', user: { firstName: 'Amani', phoneNumber: null, deletedAt: null } } }) },
        person: { findFirst: async () => ({ phone: '+254700000001' }) },
        whatsAppSend: { findFirst: async (q: any) => (q.where.kind === 'answered-here' ? { id: 'w' } : null) },
        groundParticipant: { findMany: async () => [] },
      };
      await remindThemToCarryOn(prisma, { sendFor: async (_o: string, _p: string, t: string) => { sent.push(t); return { sent: true }; } }, { id: 'c' }, { role: 'AI', createdAt: new Date('2026-10-06T07:30:00Z') }, new Date('2026-10-06T11:00:00Z'));
      expect(sent).toEqual([carryOnSaying('Amani', 'X', simplerWords)]);
    }
  });
});

describe('the emails', () => {
  async function render(call: (e: any) => Promise<void>) {
    const sent: any[] = [];
    const e: any = Object.create(EmailService.prototype);
    e.sendEmail = async (m: any) => { sent.push(m); };
    e.layout = (h: string) => h;
    e.theWayToStopBeingChased = async () => null;
    await call(e);
    return sent[0].html.replace(/<\/p>/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  }
  it('the reminder: off is the old sentence, on is the plainer one', async () => {
    const nudge = (s?: boolean) => (e: any) => e.sendNudge('a@k.test', 'Sales team, Q4', 'https://x/y', undefined, true, null, 'p1', s);
    expect(await render(nudge())).toBe('Your check-in for Sales team, Q4 is still open. It takes about two minutes, and your answers go into the report everyone reads. They have already shared their side. Yours is the last one we are waiting for. Check in');
    expect(await render(nudge(true))).toBe('Your check-in for Sales team, Q4 is still open. It takes about two minutes. Your answers go into the report. The other person has already answered. Yours is the last answer we need. Check in');
  });
  it('the next check-in: off is the old sentence, on is the plainer one', async () => {
    const ready = (s?: boolean) => (e: any) => e.sendSessionReady('a@k.test', 'Sales team, Q4', 'https://x/y', s);
    /* Changed 18 October (Drop Access run 1, item 11): the opening says how long a check-in takes, about two minutes. */
    expect(await render(ready())).toBe('A new check-in is ready for Sales team, Q4. It takes about two minutes, and your answers keep the report you and your team read up to date. Check in');
    expect(await render(ready(true))).toBe('Your next check-in for Sales team, Q4 is open. It takes about two minutes. Your answers go into the report. Check in');
  });
});

describe('what Amani is told when she writes "finish", and about the report', () => {
  const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const src = strip(require('fs').readFileSync(require('path').join(__dirname, '..', 'public-api', 'whatsapp-for-an-organisation.service.ts'), 'utf8'));
  it('each takes the check-in\'s own switch', () => {
    expect(src).toContain('theCheckInIsCompleteSaying(current.simplerWords)');
    // Changed 26 October 2026 (Hafsah: item 3): an engine close no longer asks for "finish"; it says the check-in is complete, with the same switch, on every path that ends it.
    expect(src).not.toContain('enoughToCloseSaying(current.simplerWords)');
    /* Two since 29 October: the second way to the same close ("I am done", theirOwnWordsClosedIt) went; the engine's close says it. */
    expect((src.match(/theCheckInIsCompleteSaying\(current\.simplerWords\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
    /* Changed 20 Oct 2026: and the direct morning's switch after it (email/a-direct-email.ts). */
    expect(src).toContain('reportAsText(report, c.label, c.simplerWords, direct)');
  });
  it('and with the switch off the words are the ones always sent', () => {
    const { theCheckInIsCompleteSaying, enoughToCloseSaying } = require('../grounds/what-is-sent-in-simpler-words');
    expect(theCheckInIsCompleteSaying(false)).toBe('Your check-in is complete and on record.');
    expect(enoughToCloseSaying(undefined)).toBe('That is enough to close this check-in. Reply "finish" to complete it, or keep going.');
  });
});
