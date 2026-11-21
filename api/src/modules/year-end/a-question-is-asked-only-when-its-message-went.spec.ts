import { aYearEndWorld } from './a-world-for-the-year-end';
import { askTheOwners } from './the-year-end-owner';
import { loadTheRecord } from './the-year-end-versions';
import { buildTheContent } from './the-year-end-content';
import { grantADelegate } from '../outstanding/a-delegate-acts-for-a-principal';

/**
 * DELIVERY IS THE TRUTH (Dangote stress test, 20 November 2026, D4 and the hard gate it failed). The nightly pass found 1,713 pairs of lines that "may be one
 * matter" and wrote one mail each to Maryam, Fatima's assistant, and 1,713 questions as "asked". The day's one-routine-mail rule let one through. The approved
 * report then said 23 times "Maryam Sule is being asked which is right".
 *
 * Now: the 1,713 questions to Maryam are one message, with a few questions in it and the rest counted. A question is asked only when the message carrying it
 * went; a message that never went asks nothing, and the report never says anybody is being asked.
 */
const NOW = new Date('2026-11-20T04:15:00Z');
const PAIRS = 1713;

async function aNightWith1713Pairs() {
  const w = aYearEndWorld(NOW);
  await grantADelegate(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', delegateEmail: 'maryam@example.com', delegateName: 'Maryam Sule', delegateUserId: 'u-amina', via: 'chat' });
  const matches = Array.from({ length: PAIRS }, (_, i) => ({ a: { key: `commitment:a${i}`, item: `Line ${i}` }, b: { key: `commitment:b${i}`, item: `Other line ${i}` }, question: `Is "Line ${i}" from what they told Groundwork the same thing as "Other line ${i}" from what they told Groundwork? I have kept them apart until you tell me.` }));
  const night = (now: Date) => askTheOwners(w.prisma, w.ports, { organizationId: w.ORG, principalUserId: 'u-fatima', principalFirst: 'Fatima', gaps: [], owners: [{ name: 'Maryam Sule', email: 'maryam@example.com' }], rows: [], matches, peopleCounts: {}, now });
  const gaps = (state: string) => w.t.informationGap.rows.filter((g: any) => g.askedOfEmail === 'maryam@example.com' && g.state === state);
  return { w, night, gaps, matches };
}

describe('1,713 candidate questions to Maryam in one night', () => {
  it('become one message, with five questions in it and the rest counted, and nothing is asked until it goes', async () => {
    const { w, night, gaps } = await aNightWith1713Pairs();
    /* It is the middle of the night where she is: the door holds the mail for the morning. */
    w.mode.asks = 'held';
    await night(NOW);
    expect(w.heldAsks).toHaveLength(1);
    expect(w.mails.filter((m) => m.kind === 'ask')).toHaveLength(0);
    expect(gaps('queued')).toHaveLength(5);
    expect(gaps('asked')).toHaveLength(0);
    /* What Maryam will read. */
    const mail = w.heldAsks[0];
    console.log(`WHAT MARYAM IS SENT, ONE MESSAGE\n[subject: ${mail.subject}]\n${mail.text}`);
    expect(mail.subject).toBe('Some questions about the year-end report');
    expect(mail.text.startsWith("Hello Maryam Sule, I'm putting together Fatima's year-end report, and I have 5 questions for you.")).toBe(true);
    expect(mail.text).toContain('1. Is "Line 0" from what they told Groundwork the same thing as "Other line 0" from what they told Groundwork?');
    expect(mail.text).toContain('I have 1,708 more questions like these, and I will send them once you have answered these.');
    /* The report says nobody is being asked: no message has gone. */
    const record = await loadTheRecord(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', now: NOW });
    expect(Object.keys(record.askedOf!.matches)).toEqual([]);

    /* The same night runs again: the message waiting stands, and nothing more is written. */
    await night(new Date(NOW.getTime() + 15 * 60_000));
    expect(w.heldAsks).toHaveLength(1);
    expect(w.t.informationGap.rows).toHaveLength(5);

    /* Morning: the mail goes, and only now are its five questions asked. */
    await w.releaseTheHeldAsks();
    expect(w.mails.filter((m) => m.kind === 'ask')).toHaveLength(1);
    expect(gaps('asked')).toHaveLength(5);
    expect(gaps('queued')).toHaveLength(0);
  });

  it('a held message the door refuses in the morning asks nothing, and the report never says Maryam is being asked', async () => {
    const { w, night, gaps, matches } = await aNightWith1713Pairs();
    w.mode.asks = 'held';
    await night(NOW);
    /* She already had her one routine message today, so the door refuses the held one when its morning comes. */
    w.mode.routineMailsToday.add(`maryam@example.com|${NOW.toISOString().slice(0, 10)}|released`);
    await w.releaseTheHeldAsks();
    expect(w.mails.filter((m) => m.kind === 'ask')).toHaveLength(0);
    expect(gaps('asked')).toHaveLength(0);
    expect(gaps('queued')).toHaveLength(0);
    const record = await loadTheRecord(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', now: NOW });
    const c = buildTheContent({ ...record, register: { ...record.register, toAsk: matches.slice(0, 3) as any } }, []);
    const lines = c.sections.flatMap((s) => s.claims.map((cl) => cl.text)).filter((t) => /which is right/.test(t));
    expect(lines.length).toBeGreaterThan(0);
    for (const t of lines) { expect(t).not.toContain('Maryam Sule is being asked'); expect(t).toContain('Nobody has been asked yet which is right'); }
    /* The questions were given back, so the next night asks them again, in one message. */
    w.mode.asks = 'sent';
    w.clock.now = new Date(NOW.getTime() + 86_400_000);
    await night(w.clock.now);
    expect(w.mails.filter((m) => m.kind === 'ask')).toHaveLength(1);
    expect(gaps('asked')).toHaveLength(5);
  });

  it('once the message went, the report names Maryam for those lines, and only those', async () => {
    const { w, night, matches } = await aNightWith1713Pairs();
    await night(NOW);
    const record = await loadTheRecord(w.prisma, { organizationId: w.ORG, principalUserId: 'u-fatima', now: NOW });
    expect(Object.keys(record.askedOf!.matches)).toHaveLength(5);
    const c = buildTheContent({ ...record, register: { ...record.register, toAsk: [matches[0], matches[100]] as any } }, []);
    const lines = c.sections.flatMap((s) => s.claims.map((cl) => cl.text)).filter((t) => /which is right/.test(t));
    expect(lines).toEqual([
      'The record may hold one matter in different words: "Line 0" and "Other line 0". Maryam Sule is being asked which is right, and the lines are kept apart until then.',
      'The record may hold one matter in different words: "Line 100" and "Other line 100". Nobody has been asked yet which is right, and the lines are kept apart until then.',
    ]);
  });

  it('one question alone reads as it always did', async () => {
    const w = aYearEndWorld(NOW);
    await askTheOwners(w.prisma, w.ports, { organizationId: w.ORG, principalUserId: 'u-fatima', principalFirst: 'Fatima', gaps: [], owners: [], rows: [{ owner: 'Ibrahim Sule', questionForTheOwner: 'You said "File the quarterly assembly summary" is done. What was it, who got it, and on which day?' }], matches: [], peopleCounts: {}, now: NOW });
    const asks = w.mails.filter((m) => m.kind === 'ask');
    expect(asks.map((m) => m.text)).toEqual(['Hello Ibrahim Sule, one question for the year-end report. You said "File the quarterly assembly summary" is done. What was it, who got it, and on which day?']);
    expect(w.t.informationGap.rows.map((g: any) => g.state)).toEqual(['asked']);
  });
});
