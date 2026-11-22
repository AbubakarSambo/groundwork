import { assemble, buildTheRegister, howAlike, recordTheMatchAnswer, statusOfAnItem, statusOfOneSource, theOneQuestion } from './the-outstanding-register';
import { whatIsOutstandingSaid, whatNeedsTheDecisionSaid, whatTheTeamCanCloseSaid } from './the-register-in-plain-words';
import { anOrganisationForAnExecutive, ORG } from './an-organisation-for-an-executive';

const NOW = new Date('2026-11-10T09:00:00Z');
const day = (d: number) => new Date(NOW.getTime() - d * 86_400_000);

const raw = (o: Partial<any> & { sourceId: string; text: string }) => ({
  sourceKind: 'commitment', from: 'a check-in', action: o.text, owner: 'Amina Yusuf', workstream: 'Ministry engagement', whenSaid: null, dueGiven: null,
  state: 'UNKNOWN', settledBy: null, settledAt: null, at: day(10), updatedAt: day(10), external: false, dependency: null, decision: null, ...o,
}) as any;

describe('the status of an item follows proof, never the clock or somebody saying so', () => {
  it('done without proof is unverified, and only proof completes', () => {
    expect(statusOfOneSource({ kind: 'commitment', state: 'DONE', settledBy: 'SAID' })).toBe('unverified');
    expect(statusOfOneSource({ kind: 'commitment', state: 'DONE', settledBy: null })).toBe('unverified');
    expect(statusOfOneSource({ kind: 'commitment', state: 'DONE', settledBy: 'PROVEN' })).toBe('completed');
    expect(statusOfOneSource({ kind: 'commitment', state: 'DONE', settledBy: 'CONFIRMED' })).toBe('completed');
    expect(statusOfOneSource({ kind: 'todo', state: 'DONE' })).toBe('unverified');
    expect(statusOfOneSource({ kind: 'obligation', state: 'they say it was done' })).toBe('unverified');
    expect(statusOfOneSource({ kind: 'obligation', state: 'both sides say it was done' })).toBe('completed');
  });

  it('silence is not completion: a very old open item is still open', () => {
    const [row] = assemble([raw({ sourceId: 'old', text: 'Chase the audit letter', at: new Date('2026-01-05') })], new Map(), { now: NOW }).rows;
    expect(row.status).toBe('open');
  });

  it('a request waits for a decision, and a dependency waits on somebody outside or blocks', () => {
    expect(statusOfOneSource({ kind: 'request', state: 'waiting' })).toBe('awaiting decision');
    expect(statusOfOneSource({ kind: 'dependency', state: 'WAITING', external: true })).toBe('awaiting external party');
    expect(statusOfOneSource({ kind: 'dependency', state: 'BLOCKING', external: false })).toBe('blocked');
    expect(statusOfOneSource({ kind: 'commitment', state: 'UNKNOWN', awaiting: 'decision' })).toBe('awaiting decision');
  });

  it('a later proof supersedes an earlier pending, and a pending raised after the proof keeps it open', () => {
    const pending = { status: 'open' as const, at: day(20) };
    const proof = { status: 'completed' as const, at: day(12), settledAt: day(5) };
    expect(statusOfAnItem([pending, proof])).toBe('completed');
    expect(statusOfAnItem([proof, { status: 'open', at: day(2) }])).toBe('open');
    expect(statusOfAnItem([pending, { status: 'unverified', at: day(3) }])).toBe('open');
    expect(statusOfAnItem([{ status: 'unverified', at: day(3) }])).toBe('unverified');
  });

  it('a vague done earns one precise question, for the person who said it', () => {
    expect(theOneQuestion('Circulate the committee minutes', 'Ibrahim Sule')).toBe('You said "Circulate the committee minutes" is done. What was it, who got it, and on which day?');
  });
});

describe('the same commitment in an email forward, a spreadsheet row and a WhatsApp message is one row', () => {
  const email = raw({ sourceId: 'email', from: 'a pasted document', text: 'Send the ministry the revised brief', whenSaid: 'by Friday', at: day(20) });
  const sheet = raw({ sourceId: 'sheet', from: 'a pasted document', text: 'Revised brief to ministry', owner: 'unconfirmed', at: day(18) });
  const whatsapp = raw({ sourceId: 'wa', from: 'a check-in', text: 'Ministry revised brief sent', at: day(2) });

  it('keeps all three sources and reads one status', () => {
    const { rows, toAsk } = assemble([email, sheet, whatsapp], new Map(), { now: NOW });
    expect(rows).toHaveLength(1);
    expect(rows[0].sources.map((s) => s.id).sort()).toEqual(['email', 'sheet', 'wa']);
    expect(rows[0].owner).toBe('Amina Yusuf');
    expect(toAsk).toEqual([]);
  });

  /* Changed 21 November 2026 (Batch E, N6): two people's lines were asked about as one on shared words, which made 1,705 questions to Maryam in the Dangote rerun. The same task can be two people's, so it is neither merged nor asked about. */
  it('does not merge two people’s version of the same task on wording alone, and does not ask', () => {
    const other = raw({ sourceId: 'other', text: 'Send the ministry the revised brief', owner: 'Ibrahim Sule' });
    const { rows, toAsk } = assemble([email, other], new Map(), { now: NOW });
    expect(rows).toHaveLength(2);
    expect(toAsk).toHaveLength(0);
    expect(howAlike({ text: email.text, owner: 'a' }, { text: other.text, owner: 'b' })).toBe('different');
    expect(howAlike({ text: email.text, owner: 'a' }, { text: other.text, owner: 'a' })).toBe('same');
  });

  it('asks about a middling match and merges nothing, in plain words', () => {
    const a = raw({ sourceId: 'a', from: 'a pasted document', text: 'Prepare the ministry budget briefing note' });
    const b = raw({ sourceId: 'b', from: 'a check-in', text: 'Ministry budget meeting agenda' });
    const { rows, toAsk } = assemble([a, b], new Map(), { now: NOW });
    expect(rows).toHaveLength(2);
    expect(toAsk).toHaveLength(1);
    expect(toAsk[0].question).toBe('Is "Prepare the ministry budget briefing note" from a pasted document the same thing as "Ministry budget meeting agenda" from a check-in? I have kept them apart until you tell me.');
  });

  it('an answer is kept: yes merges them, no is never asked again', async () => {
    const o = anOrganisationForAnExecutive();
    const a = raw({ sourceId: 'a', text: 'Prepare the ministry budget briefing note' });
    const b = raw({ sourceId: 'b', text: 'Ministry budget meeting agenda' });
    await recordTheMatchAnswer(o.prisma, { organizationId: ORG, principalUserId: 'u-fatima', aKey: 'commitment:a', bKey: 'commitment:b', same: true });
    const notes = new Map(o.tables.registerNote.rows.map((n: any) => [`${n.sourceKind}:${n.sourceId}`, n]));
    expect(assemble([a, b], notes, { now: NOW }).rows).toHaveLength(1);

    const p = anOrganisationForAnExecutive();
    await recordTheMatchAnswer(p.prisma, { organizationId: ORG, principalUserId: 'u-fatima', aKey: 'commitment:a', bKey: 'commitment:b', same: false });
    const apart = new Map(p.tables.registerNote.rows.map((n: any) => [`${n.sourceKind}:${n.sourceId}`, n]));
    const out = assemble([a, b], apart, { now: NOW });
    expect(out.rows).toHaveLength(2);
    expect(out.toAsk).toEqual([]);
  });

  it('a later proof in WhatsApp settles the earlier email, and the history stays on the row', () => {
    const proof = raw({ sourceId: 'wa', text: 'Revised brief to the ministry', state: 'DONE', settledBy: 'PROVEN', settledAt: day(1), at: day(3) });
    const { rows } = assemble([email, proof], new Map(), { now: NOW });
    expect(rows[0].status).toBe('completed');
    expect(rows[0].sources).toHaveLength(2);
  });
});

describe('a date is read from the words, labelled, and the words are untouched', () => {
  it('labels the date as worked out and keeps what was said', () => {
    const { rows } = assemble([raw({ sourceId: 'x', text: 'Circulate the committee minutes', whenSaid: 'by Friday' })], new Map(), { now: NOW });
    expect(rows[0].whenSaid).toBe('by Friday');
    expect(rows[0].dueInferred).toBe(true);
    expect(rows[0].dueOn).not.toBeNull();
  });
  it('a date somebody gave is not marked as worked out', () => {
    const { rows } = assemble([raw({ sourceId: 'x', sourceKind: 'obligation', text: 'Pay the licence', dueGiven: new Date('2026-12-01') })], new Map(), { now: NOW });
    expect(rows[0].dueInferred).toBe(false);
    expect(rows[0].dueOn?.toISOString().slice(0, 10)).toBe('2026-12-01');
  });
  it('a words-only date that cannot be read stays words only', () => {
    const { rows } = assemble([raw({ sourceId: 'x', text: 'Plan the retreat', whenSaid: 'soon' })], new Map(), { now: NOW });
    expect(rows[0].dueOn).toBeNull();
    expect(rows[0].whenSaid).toBe('soon');
  });
});

describe('the register read from the record, and the three questions it answers', () => {
  const view = { forName: null, now: NOW };

  it('what is outstanding, word for word', async () => {
    const o = anOrganisationForAnExecutive(NOW);
    const reg = await buildTheRegister(o.prisma, { organizationId: ORG, principalUserId: 'u-fatima', now: NOW, forADelegate: false });
    expect(whatIsOutstandingSaid(reg, view)).toBe([
      'You have 5 matters outstanding.',
      'Circulate the committee minutes. Ibrahim Sule has it, and it is due Friday 13 November, a day I worked out from "by Friday".',
      'Chase the audit letter. Nobody has confirmed who owns it.',
      'Get the ministry’s reply on the budget. Amina Yusuf has it, and it is waiting on the ministry.',
      'Think about my own retirement date. You have it.',
      'File the quarterly assembly summary. Ibrahim Sule said it was done, but nothing shows it yet, so I have not counted it as finished.',
    ].join('\n'));
  });

  it('what needs her decision, with the exact question and the options', async () => {
    const o = anOrganisationForAnExecutive(NOW);
    o.tables.registerNote.rows.push({ organizationId: ORG, principalUserId: 'u-fatima', sourceKind: 'commitment', sourceId: 'c-nobody', awaiting: 'decision', decisionQuestion: 'Should we reply to the audit letter ourselves or ask the ministry to', decisionOptions: ['Reply ourselves', 'Ask the ministry', 'Wait a week'], dueOn: new Date('2026-11-14'), notTheSameAs: [] });
    const reg = await buildTheRegister(o.prisma, { organizationId: ORG, principalUserId: 'u-fatima', now: NOW, forADelegate: false, waitingForThePrincipal: [{ ref: 'sr-1', firstName: 'Amina', thing: 'Amina’s request to spend KES 12,000 for fuel' }] });
    expect(whatNeedsTheDecisionSaid(reg, view)).toBe([
      '2 things need your decision.',
      'Should we reply to the audit letter ourselves or ask the ministry to? Your options are reply ourselves, ask the ministry or wait a week. It is wanted by Saturday 14 November.',
      'Do you approve Amina’s request to spend KES 12,000 for fuel? Your options are approve it or decline it.',
    ].join('\n'));
  });

  it('which items can be closed this week, and says why', async () => {
    const o = anOrganisationForAnExecutive(NOW);
    const reg = await buildTheRegister(o.prisma, { organizationId: ORG, principalUserId: 'u-fatima', now: NOW, forADelegate: false });
    expect(whatTheTeamCanCloseSaid(reg, view)).toBe([
      '2 items could be closed this week.',
      'Circulate the committee minutes. Ibrahim Sule has it, and it is due Friday 13 November.',
      'File the quarterly assembly summary. Ibrahim Sule says it is done. It can close once Ibrahim Sule shows what was sent and to whom.',
    ].join('\n'));
  });

  it('says plainly when nothing is there', () => {
    expect(whatIsOutstandingSaid({ rows: [], toAsk: [] }, view)).toBe('I have nothing outstanding for you yet. The check-ins you run have no open commitments, handoffs or agreements on record.');
    expect(whatNeedsTheDecisionSaid({ rows: [], toAsk: [] }, view)).toBe('Nothing needs your decision right now.');
  });

  it('the first answer of the revised brief: proven, so it is not listed as outstanding', async () => {
    const o = anOrganisationForAnExecutive(NOW);
    const reg = await buildTheRegister(o.prisma, { organizationId: ORG, principalUserId: 'u-fatima', now: NOW, forADelegate: false });
    const brief = reg.rows.find((r) => r.sources.some((s) => s.id === 'c-brief-1'))!;
    expect(brief.status).toBe('completed');
    expect(brief.sources.map((s) => s.id).sort()).toEqual(['c-brief-1', 'c-brief-2']);
    expect(whatIsOutstandingSaid(reg, view)).not.toContain('revised brief');
  });
});

/* DANGOTE RERUN, N12. Ibese was settled on 11 September; Folasade's "I sent the signed copy on 11 September", written on 20 November, joined the row and moved the date to 20 November. */
describe('a finished item keeps the day it was first proven', () => {
  it('a later mention of the same thing does not move the day it was settled', () => {
    const sept = new Date('2026-09-11T12:00:00Z');
    const nov = new Date('2026-11-20T14:01:00Z');
    const { rows } = assemble([
      raw({ sourceId: 'proof', text: 'Sign the Ibese community development agreement', state: 'DONE', settledBy: 'PROVEN', settledAt: sept, at: new Date('2026-08-01'), updatedAt: sept }),
      raw({ sourceId: 'later', text: 'Sign the Ibese community development agreement', state: 'DONE', settledBy: 'PROVEN', settledAt: nov, at: nov, updatedAt: nov }),
    ], new Map(), { now: new Date('2026-11-21T09:00:00Z') });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('completed');
    expect(rows[0].lastVerifiedAt.toISOString()).toBe(sept.toISOString());
  });
});
