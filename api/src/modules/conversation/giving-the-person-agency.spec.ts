import { GroundScenario, PartyType, CheckInStatus } from '@prisma/client';
import { ConversationService } from './conversation.service';
import { ConversationContextService } from './context.service';
import { ANCHOR_PARTICIPANT_PROMPT } from './the-anchor-weekly-check-in';
import { THE_AGENCY_GUIDANCE, aPlainYes, aPlainNo, whatTheAnswerAgreedTo, hasAlreadyOffered, YOU_HAVE_ALREADY_OFFERED } from './giving-the-person-agency';

/**
 * ANCHOR PIECE 17: GIVING THE PERSON AGENCY. The model asks what they think could happen and offers their own words back as a
 * commitment. Nothing is written until they say yes, and what is written is what they said. The yes is read from the record.
 */
const IDEA = 'I could ask Ngozi for the Kano attendance sheets before Friday so the report is not late.';
const OFFER = 'Would you like me to write down "ask Ngozi for the Kano attendance sheets before Friday" as something you will do?';

describe('a plain yes, and a plain no', () => {
  it.each(['Yes', 'yes please', 'Yeah, go ahead', 'Sure.', 'Okay', 'That is right'])('%s is a yes', (a) => expect(aPlainYes(a)).toBe(true));
  it.each(['Yes but make it Monday', 'yes, not that one', 'Actually change it to Monday', 'No', 'I am not sure', '', 'Maybe'])('%s is not a yes', (a) => expect(aPlainYes(a)).toBe(false));
  it.each(['No', 'nope', 'Not now', "Don't"])('%s is a no', (a) => expect(aPlainNo(a)).toBe(true));
});

describe('what an answer agreed to, read from the conversation', () => {
  const offered = [{ role: 'AI', content: OFFER }, { role: 'PERSON', content: IDEA }, { role: 'AI', content: 'What do you think could happen next?' }];

  it('a yes to an offer keeps the words they said, not the words Groundwork put to them', () => {
    expect(whatTheAnswerAgreedTo(offered, 'Yes')).toEqual({ kind: 'yes', text: 'ask Ngozi for the Kano attendance sheets before Friday' });
  });

  it('keeps all they said when the offer did not quote them exactly', () => {
    const loose = [{ role: 'AI', content: 'Would you like me to write that down as something you will do?' }, ...offered.slice(1)];
    expect(whatTheAnswerAgreedTo(loose, 'yes')).toEqual({ kind: 'yes', text: IDEA });
    const reworded = [{ role: 'AI', content: 'Would you like me to write down "get the Kano sheets from Ngozi" as something you will do?' }, ...offered.slice(1)];
    expect(whatTheAnswerAgreedTo(reworded, 'yes')).toEqual({ kind: 'yes', text: IDEA });
  });

  it('a no is a no, and anything else writes nothing', () => {
    expect(whatTheAnswerAgreedTo(offered, 'No')).toEqual({ kind: 'no' });
    expect(whatTheAnswerAgreedTo(offered, 'yes but make it Monday')).toBeNull();
    expect(whatTheAnswerAgreedTo(offered, 'I think the sheets are late because of the rains.')).toBeNull();
  });

  it('a yes to something that was not an offer writes nothing', () => {
    const notAnOffer = [{ role: 'AI', content: 'Is the Kano report the one that is late?' }, { role: 'PERSON', content: IDEA }];
    expect(whatTheAnswerAgreedTo(notAnOffer, 'Yes')).toBeNull();
    expect(whatTheAnswerAgreedTo([], 'Yes')).toBeNull();
  });

  it('knows when the one offer has been made', () => {
    expect(hasAlreadyOffered(offered)).toBe(true);
    expect(hasAlreadyOffered(offered.slice(2))).toBe(false);
  });
});

describe('the guidance gives them the lead, says what happened, and never praises', () => {
  it('asks what they think could happen, and offers only what is theirs', () => {
    expect(THE_AGENCY_GUIDANCE).toContain('ask what THEY think could happen next');
    expect(THE_AGENCY_GUIDANCE).toContain('Nothing is written down until they say yes.');
    expect(THE_AGENCY_GUIDANCE).toContain('Never offer something that is not theirs');
    expect(THE_AGENCY_GUIDANCE).toContain('do not call it good');
    expect(ANCHOR_PARTICIPANT_PROMPT).toContain(THE_AGENCY_GUIDANCE);
  });
});

const person = { id: 'p1', groundId: 'g1', partyType: PartyType.PARTICIPANT, managingOnly: false, roleAsDescribed: null, createdAt: new Date('2026-01-02'), nameGiven: null, email: 'tunde@example.test', user: { firstName: 'Tunde', lastName: 'Okafor' } };
const lead = { ...person, id: 'p0', partyType: PartyType.INITIATOR, user: { firstName: 'Amina', lastName: 'Yusuf' } };

function aWeek(o: { answer: string; turns: { role: string; content: string }[]; switchOn?: boolean; startedFrom?: string | null; failWrite?: boolean }) {
  const ground = { id: 'g1', organizationId: 'org1', scenario: GroundScenario.NEW_PROJECT, moment: null, label: 'Programme', mode: 'SHARED', timelineDays: 30, brief: null, status: 'ACTIVE', initiatorId: 'p0', startedFrom: o.startedFrom === undefined ? 'anchor' : o.startedFrom, expectThemToUnblock: true, objectives: [], report: null, leadContextNotes: [], participants: [lead, person] };
  const checkIn = { id: 'ci2', groundId: 'g1', participantId: 'p1', sessionNumber: 2, status: CheckInStatus.IN_PROGRESS, isClarification: false, isSelfCorrection: false, isFinal: false, participant: { id: 'p1', userId: 'u1', groundId: 'g1', partyType: PartyType.PARTICIPANT, roleAsDescribed: null, user: person.user } };
  const created: any[] = [];
  const seed: Record<string, any> = {
    ground: { findUnique: jest.fn(async () => ground), findFirst: jest.fn(async () => ground) },
    platformSetting: { findUnique: jest.fn(async () => (o.switchOn === false ? null : { value: { on: true } })) },
    checkIn: { findUnique: jest.fn(async () => checkIn), findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), count: jest.fn(async () => 0), update: jest.fn(async () => ({})) },
    groundCommitment: {
      findMany: jest.fn(async () => []),
      create: jest.fn(async (a: any) => { if (o.failWrite) throw new Error('down'); created.push(a.data); return { id: 'c1', ...a.data }; }),
    },
    groundParticipant: { count: jest.fn(async () => 2), findUnique: jest.fn(async () => ({ specificityHistory: [] })), findFirst: jest.fn(async () => person), findMany: jest.fn(async () => [lead, person].map((p) => ({ ...p, checkIns: [] }))) },
    conversationTurn: {
      count: jest.fn(async () => 1),
      findMany: jest.fn(async (a: any) => { const t = o.turns.map((x, n) => ({ id: `t${n}`, createdAt: new Date(2026, 9, 1, 9, n), ...x })); return a?.orderBy?.createdAt === 'desc' ? [...t].reverse().slice(0, a.take ?? 99) : t; }),
      create: jest.fn(async (a: any) => ({ id: 't9', content: a.data.content })),
    },
  };
  const prisma: any = new Proxy(seed, { get: (target: any, model: string) => new Proxy(target[model] ?? {}, { get: (m: any, method: string) => m[method] ?? (async () => (String(method).endsWith('Many') || method === 'groupBy' ? [] : null)) }) });
  const seen: string[] = [];
  const promptStore: any = { getActiveContent: jest.fn(async (k: string) => (k === 'system' ? 'SYS' : null)), getActive: jest.fn(async () => { throw new Error('none'); }) };
  const nothing: any = { get: () => undefined };
  const service = new ConversationService(prisma, promptStore, { respond: jest.fn(async (s: string) => { seen.push(s); return 'Thank you. What is next?'; }) } as any, new ConversationContextService(prisma), nothing, nothing, nothing, nothing, nothing, nothing);
  return { say: async () => { const out = await service.sendMessage('ci2', 'u1', o.answer); return { out, prompt: seen[0] ?? '' }; }, created };
}

const history = [{ role: 'AI', content: 'What moved since we last spoke?' }, { role: 'PERSON', content: IDEA }, { role: 'AI', content: OFFER }];

describe('anchor piece 17: through a real turn of the person\'s check-in', () => {
  it('their yes writes their own words as something they will do, once, and the model is told so', async () => {
    const w = aWeek({ answer: 'Yes', turns: [history[0], history[1], history[2]] });
    // the offer follows their idea in the record
    const { prompt } = await w.say();
    expect(w.created).toHaveLength(1);
    expect(w.created[0]).toMatchObject({ groundId: 'g1', participantId: 'p1', status: 'UNKNOWN', source: 'CHECK_IN', explicit: true, statedInSession: 2, saidWordForWord: true });
    expect(w.created[0].text).toBe(IDEA.slice(IDEA.indexOf('ask Ngozi'), IDEA.indexOf('ask Ngozi') + 'ask Ngozi for the Kano attendance sheets before Friday'.length));
    expect(prompt).toContain('# They said yes, and it has been written down');
    expect(prompt).toContain('"ask Ngozi for the Kano attendance sheets before Friday"');
    expect(prompt).toContain('do not call it good');
  });

  it('their no writes nothing, and the model is told nothing was written', async () => {
    const w = aWeek({ answer: 'No', turns: history });
    const { prompt } = await w.say();
    expect(w.created).toEqual([]);
    expect(prompt).toContain('# They said no to having it written down');
    expect(prompt).toContain('Nothing was written down.');
  });

  it('a yes with a change in it, or an answer to something else, writes nothing', async () => {
    for (const answer of ['Yes but make it Monday', 'The sheets are late because of the rains.']) {
      const w = aWeek({ answer, turns: history });
      const { prompt } = await w.say();
      expect(w.created).toEqual([]);
      expect(prompt).not.toContain('# They said yes');
    }
  });

  it('a yes to a question that was not an offer writes nothing', async () => {
    const w = aWeek({ answer: 'Yes', turns: [history[0], history[1], { role: 'AI', content: 'Is the Kano report the one that is late?' }] });
    await w.say();
    expect(w.created).toEqual([]);
  });

  it('when the write fails the model is told it was not written down', async () => {
    const w = aWeek({ answer: 'Yes', turns: history, failWrite: true });
    const { prompt } = await w.say();
    expect(prompt).toContain('# They said yes, but it could not be written down just now');
    expect(prompt).not.toContain('# They said yes, and it has been written down');
  });

  it('writes nothing, and says nothing, when the anchor is not in play', async () => {
    for (const o of [{ switchOn: false }, { startedFrom: null as string | null }]) {
      const w = aWeek({ answer: 'Yes', turns: history, ...o });
      const { prompt } = await w.say();
      expect(w.created).toEqual([]);
      expect(prompt).not.toContain('# They said yes');
      expect(prompt).not.toContain(THE_AGENCY_GUIDANCE);
    }
  });

  it('once it has offered, the model is told not to offer again', async () => {
    const w = aWeek({ answer: 'Something else is taking my time.', turns: history });
    const { prompt } = await w.say();
    expect(prompt).toContain(YOU_HAVE_ALREADY_OFFERED);
  });
});
