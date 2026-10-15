import { GroundScenario, PartyType, CheckInStatus } from '@prisma/client';
import { ConversationService } from './conversation.service';
import { ConversationContextService } from './context.service';
import { ANCHOR_PARTICIPANT_PROMPT } from './the-anchor-weekly-check-in';
import { THE_AGENCY_GUIDANCE, aPlainYes, aPlainNo, whatTheAnswerAgreedTo, hasAlreadyOffered, whatIsStillOwedToThem, hasAskedWhatTheyThinkCouldHappen, whatTheyJustSaidMayBeTheirOwnStep, withoutTheSecondTellingOfIt, YOU_HAVE_ALREADY_OFFERED } from './giving-the-person-agency';

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

  it('when the offer did not quote them, keeps the one sentence of theirs it is about, exactly as typed', () => {
    const several = 'The Kaduna and Nasarawa ones are finished, and I have the summary page done too. I could also ask Tunde to forward me the Kano photos the moment they arrive, so I can start the Kano tables on Thursday.';
    const turns = [{ role: 'AI', content: 'You have said you could ask Tunde to forward you the Kano photos the moment they arrive so you can start the Kano tables on Thursday. Would you like me to write that down as something you will do?' }, { role: 'PERSON', content: several }];
    expect(whatTheAnswerAgreedTo(turns, 'Yes')).toEqual({ kind: 'yes', text: 'I could also ask Tunde to forward me the Kano photos the moment they arrive, so I can start the Kano tables on Thursday.' });
  });

  it('keeps everything they said when no one sentence is what was offered', () => {
    const several = 'It is late. The office was shut. We will see.';
    const turns = [{ role: 'AI', content: 'Would you like me to write that down as something you will do?' }, { role: 'PERSON', content: several }];
    expect(whatTheAnswerAgreedTo(turns, 'Yes')).toEqual({ kind: 'yes', text: several });
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

describe('the question that gives them the lead is owed until it has been asked', () => {
  const t = (role: string, content: string) => ({ role, content });
  it('is not owed on their first answer', () => {
    expect(whatIsStillOwedToThem([t('AI', 'What moved since we last spoke?')])).toBe('');
  });
  it('is owed from their second answer on, until it has been asked', () => {
    const owed = whatIsStillOwedToThem([t('AI', 'What happened with Kano?'), t('PERSON', 'Nothing yet.'), t('AI', 'What moved since we last spoke?')]);
    expect(owed).toContain('You have not yet asked what THEY think could happen next.');
    expect(owed).toContain('until they have answered it');
  });
  it.each(['What do you think could happen next to get the Kano sheets in?', 'If you could change one thing about this, what would it be?', 'What could happen next?'])('is not owed once %s has been asked', (asked) => {
    const sofar = [t('AI', asked), t('PERSON', 'Nothing yet.'), t('AI', 'What happened?'), t('PERSON', 'It is late.')];
    expect(hasAskedWhatTheyThinkCouldHappen(sofar)).toBe(true);
    expect(whatIsStillOwedToThem(sofar)).toBe('');
  });
  it('is not owed once an offer has been made', () => {
    expect(whatIsStillOwedToThem([t('AI', 'Would you like me to write down "x" as something you will do?'), t('PERSON', 'Ok'), t('AI', 'What happened?')])).toBe('');
  });
  it('reaches the model last, in a real turn, once two answers have been given', async () => {
    const w = aWeek({ answer: 'It is three days late.', turns: [{ role: 'AI', content: 'What moved since we last spoke?' }, { role: 'PERSON', content: 'Kano is still missing.' }, { role: 'AI', content: 'What happened with Kano?' }] });
    const { prompt } = await w.say();
    expect(prompt.endsWith(whatIsStillOwedToThem([{ role: 'AI', content: 'What happened with Kano?' }, { role: 'PERSON', content: 'Kano is still missing.' }, { role: 'AI', content: 'What moved since we last spoke?' }]))).toBe(true);
    const first = aWeek({ answer: 'Kano is still missing.', turns: [{ role: 'AI', content: 'What moved since we last spoke?' }] });
    expect((await first.say()).prompt).not.toContain('# Still owed to them in this check-in');
  });
});

describe('when what they just said may be their own step', () => {
  const none: { role: string; content: string }[] = [{ role: 'AI', content: 'What happened with Kano?' }];
  it.each([
    'If they are not here by the 16th I will send the report with Kano marked as pending.',
    'I could ask the programme assistant to photograph the sheets.',
    'I think the quickest thing is to call the district office.',
  ])('is noticed in %s', (said) => {
    expect(whatTheyJustSaidMayBeTheirOwnStep(none, said)).toContain('may be something they could do themselves');
  });
  it.each(['I can not finish the tables without them.', "I couldn't reach anyone.", 'The sheets are three days late.', 'I would not know.'])('is not noticed in %s', (said) => {
    expect(whatTheyJustSaidMayBeTheirOwnStep(none, said)).toBe('');
  });
  it('is not noticed once an offer has been made', () => {
    expect(whatTheyJustSaidMayBeTheirOwnStep([{ role: 'AI', content: OFFER }], 'I will call her.')).toBe('');
  });
  it('reaches the model last, in a real turn, and leaves the choice to it', async () => {
    const w = aWeek({ answer: 'I will send the report with Kano marked as pending.', turns: [{ role: 'AI', content: 'What happened with Kano?' }] });
    const { prompt } = await w.say();
    expect(prompt).toContain('# What they just said may be something they could do themselves');
    expect(prompt).toContain('If it is theirs to do');
  });
});

describe('the product says it was written down once', () => {
  it('takes out the model\'s own telling of it and keeps the question', () => {
    expect(withoutTheSecondTellingOfIt('That is written down as something you will do. What would make it easier to get the sheets by Thursday?')).toBe('What would make it easier to get the sheets by Thursday?');
    expect(withoutTheSecondTellingOfIt("I've noted that. When will you ask her?")).toBe('When will you ask her?');
  });
  it('takes out a statement that gives their words back, even when it changed a word of them', () => {
    const theirs = 'ask the Kano programme assistant to photograph the sheets on her phone and send them to me by WhatsApp on Thursday morning';
    const echoed = 'Ask the Kano programme assistant to photograph the sheets on Kano\'s phone and send them to me by WhatsApp on Thursday morning. What else should I know?';
    expect(withoutTheSecondTellingOfIt(echoed, theirs)).toBe('What else should I know?');
    expect(withoutTheSecondTellingOfIt('What would make it easier to ask the Kano programme assistant by Thursday morning?', theirs)).toBe('What would make it easier to ask the Kano programme assistant by Thursday morning?');
  });
  it('leaves a reply that does not say it, and a reply that would be left with no question, as they are', () => {
    const plain = 'What would make it easier to get the sheets by Thursday?';
    expect(withoutTheSecondTellingOfIt(plain)).toBe(plain);
    expect(withoutTheSecondTellingOfIt('That is written down.')).toBe('That is written down.');
  });
});

describe('the guidance gives them the lead, says what happened, and never praises', () => {
  it('asks what they think could happen, and offers only what is theirs', () => {
    expect(THE_AGENCY_GUIDANCE).toContain('ask what THEY think could happen next');
    expect(THE_AGENCY_GUIDANCE).toContain('Nothing is written down until they say yes.');
    expect(THE_AGENCY_GUIDANCE).toContain('Never offer something that is not theirs');
    expect(THE_AGENCY_GUIDANCE).toContain('do not call it good');
    expect(THE_AGENCY_GUIDANCE).toContain('the product writes it down and tells them so itself');
    expect(ANCHOR_PARTICIPANT_PROMPT).toContain(THE_AGENCY_GUIDANCE);
  });
});

const person = { id: 'p1', groundId: 'g1', partyType: PartyType.PARTICIPANT, managingOnly: false, roleAsDescribed: null, createdAt: new Date('2026-01-02'), nameGiven: null, email: 'tunde@example.test', user: { firstName: 'Tunde', lastName: 'Okafor' } };
const lead = { ...person, id: 'p0', partyType: PartyType.INITIATOR, user: { firstName: 'Amina', lastName: 'Yusuf' } };

function aWeek(o: { answer: string; turns: { role: string; content: string }[]; switchOn?: boolean; startedFrom?: string | null; failWrite?: boolean; modelSays?: string }) {
  const ground = { id: 'g1', organizationId: 'org1', scenario: GroundScenario.NEW_PROJECT, moment: null, label: 'Programme', mode: 'SHARED', timelineDays: 30, brief: null, status: 'ACTIVE', initiatorId: 'p0', startedFrom: o.startedFrom === undefined ? 'anchor' : o.startedFrom, expectThemToUnblock: true, objectives: [], report: null, leadContextNotes: [], participants: [lead, person] };
  const checkIn = { id: 'ci2', groundId: 'g1', participantId: 'p1', sessionNumber: 2, status: CheckInStatus.IN_PROGRESS, isClarification: false, isSelfCorrection: false, isFinal: false, participant: { id: 'p1', userId: 'u1', groundId: 'g1', partyType: PartyType.PARTICIPANT, roleAsDescribed: null, user: person.user } };
  const created: any[] = [];
  const seed: Record<string, any> = {
    ground: { findUnique: jest.fn(async () => ground), findFirst: jest.fn(async () => ground) },
    platformSetting: { findUnique: jest.fn(async () => (o.switchOn === false ? { value: { on: false } } : { value: { on: true } })) },
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
      update: jest.fn(async (a: any) => ({ id: 't9', content: a.data.content })),
    },
  };
  const prisma: any = new Proxy(seed, { get: (target: any, model: string) => new Proxy(target[model] ?? {}, { get: (m: any, method: string) => m[method] ?? (async () => (String(method).endsWith('Many') || method === 'groupBy' ? [] : null)) }) });
  const seen: string[] = [];
  const promptStore: any = { getActiveContent: jest.fn(async (k: string) => (k === 'system' ? 'SYS' : null)), getActive: jest.fn(async () => { throw new Error('none'); }) };
  const nothing: any = { get: () => undefined };
  const service = new ConversationService(prisma, promptStore, { respond: jest.fn(async (s: string) => { seen.push(s); return o.modelSays ?? 'Thank you. What is next?'; }) } as any, new ConversationContextService(prisma), nothing, nothing, nothing, nothing, nothing, nothing);
  return { say: async () => { const out = await service.sendMessage('ci2', 'u1', o.answer); return { out, prompt: seen[0] ?? '' }; }, created };
}

const history = [{ role: 'AI', content: 'What moved since we last spoke?' }, { role: 'PERSON', content: IDEA }, { role: 'AI', content: OFFER }];

describe('anchor piece 17: through a real turn of the person\'s check-in', () => {
  it('their yes writes their own words as something they will do, once, and the model is told so', async () => {
    const w = aWeek({ answer: 'Yes', turns: [history[0], history[1], history[2]] });
    // the offer follows their idea in the record
    const { prompt, out } = await w.say();
    expect(w.created).toHaveLength(1);
    expect(w.created[0]).toMatchObject({ groundId: 'g1', participantId: 'p1', status: 'UNKNOWN', source: 'CHECK_IN', explicit: true, statedInSession: 2, saidWordForWord: true });
    expect(w.created[0].text).toBe(IDEA.slice(IDEA.indexOf('ask Ngozi'), IDEA.indexOf('ask Ngozi') + 'ask Ngozi for the Kano attendance sheets before Friday'.length));
    expect(prompt).toContain('# They said yes, and it has been written down');
    /* The product says it was written, not the model, and the model is told not to say it again. */
    expect(out.reply.startsWith('I have written that down as something you will do.')).toBe(true);
    expect(prompt).toContain('do not repeat their words, and do not call it good');
    /* About this turn alone, so it is read after everything else, including the anchor's short reminder. */
    expect(prompt.indexOf('# They said yes, and it has been written down')).toBeGreaterThan(prompt.indexOf('# For this person, these come first'));
  });

  it('an offer that follows a sentence giving their words back is not cut as "saying it back"', async () => {
    const theOffer = 'Ask Ngozi for the Kano attendance sheets before Friday so the report is not late. Would you like me to write down "ask Ngozi for the Kano attendance sheets before Friday" as something you will do?';
    const w = aWeek({ answer: IDEA, turns: [{ role: 'AI', content: 'What do you think could happen next?' }, { role: 'PERSON', content: IDEA }], modelSays: theOffer });
    const { out } = await w.say();
    expect(out.reply).toBe(theOffer);
  });

  it('says it was written down once even when the model says it again', async () => {
    const w = aWeek({ answer: 'Yes', turns: history, modelSays: 'That is written down as something you will do. What would make it easier by Friday?' });
    const { out } = await w.say();
    expect(out.reply).toBe('I have written that down as something you will do.\n\nWhat would make it easier by Friday?');
  });

  it('their no writes nothing, and the model is told nothing was written', async () => {
    const w = aWeek({ answer: 'No', turns: history });
    const { prompt, out } = await w.say();
    expect(w.created).toEqual([]);
    expect(out.reply).not.toContain('written that down');
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
    const { prompt, out } = await w.say();
    expect(out.reply.startsWith('I could not write that down just now.')).toBe(true);
    expect(out.reply).not.toContain('I have written that down');
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
    /* Read last, after the short reminder that says to offer, so the one offer is not made twice. */
    expect(prompt.endsWith(YOU_HAVE_ALREADY_OFFERED)).toBe(true);
  });
});
