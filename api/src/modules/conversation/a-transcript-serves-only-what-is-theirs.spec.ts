import { ForbiddenException } from '@nestjs/common';
import { TurnRole } from '@prisma/client';
import { ConversationService } from './conversation.service';

/**
 * A TRANSCRIPT NEVER CARRIES WHAT THE LEAD TYPED ABOUT THE PERSON (decision 30; screens requests 167 and 168).
 *
 * Juma takes part in Wairimu's check-in. When Wairimu added him she wrote "Lead installer. He finishes most of the jobs but does not
 * write them down." It is hers. Read as each person: Juma reads his own transcript without it (and without the rest of the row that is not
 * his: the lead's expectation of him, his invitation token); Wairimu reads her own transcript whole; a colleague and an admin who are not
 * that person are refused outright. The same words reach the fitted answer's kind, so that is left out for Juma too.
 */
const THE_LEADS_WORDS = 'Lead installer. He finishes most of the jobs but does not write them down.';
const THE_LEADS_EXPECTATION = 'Should write every job down by Friday.';

const juma = { id: 'p-juma', groundId: 'g1', userId: 'u-juma', email: 'juma@x.test', partyType: 'PARTICIPANT', managingOnly: false, nameGiven: 'Juma', organisationGiven: null, department: null, language: null, wantsTheReport: null, awaitingSeat: false, cameThroughTheLink: false, user: { firstName: 'Juma', lastName: 'Test', awaitingOrgApproval: false },
  roleAsDescribed: THE_LEADS_WORDS, remitAsGiven: THE_LEADS_EXPECTATION, inviteToken: 'secret-invite-token', stopRemindersToken: 'stop-token', specificityHistory: [0.4], soloArtifact: 'a summary', addedByUserId: 'u-wairimu' };
const wairimu = { ...juma, id: 'p-wairimu', userId: 'u-wairimu', email: 'wairimu@x.test', partyType: 'INITIATOR', nameGiven: 'Wairimu', user: { firstName: 'Wairimu', lastName: 'Test', awaitingOrgApproval: false }, roleAsDescribed: 'Runs sales.' };

function transcriptFor(participant: any) {
  const prisma: any = {
    checkIn: { findUnique: jest.fn(async () => ({ id: 'ci1', groundId: 'g1', participantId: participant.id, sessionNumber: 1, isSelfCorrection: false, status: 'IN_PROGRESS', participant,
      theirAnswerFitted: { participantId: participant.id, kind: THE_LEADS_WORDS, values: [{ field: 'jobs', value: 'finishes most jobs' }], completeness: 0.5 },
      /* The rest of the row, none of it the person's to read here. */
      sessionPlan: { leadBrief: THE_LEADS_WORDS, watchFor: ['PATTERN-WATCH-FOR'], coachingPath: { noticed: 'PATTERN-NOTICED' } },
      probeSources: ['pattern:B1'], specificityLevel: 'LOW', specificityDimensions: { who: 0.2 }, whatWeHave: { claims: ['CLAIM-HELD'], challenges: ['CHALLENGE-HELD'] },
      warningFiredAt: new Date(), patternsAnalyzedAt: new Date(), leadToldAt: new Date(), sessionReport: { yourRole: 'Installer' } })) },
    conversationTurn: { findMany: jest.fn(async () => [{ id: 't1', role: TurnRole.AI, content: 'What are you working on?', createdAt: new Date() }]) },
    ground: { findUnique: jest.fn(async () => ({ id: 'g1', label: 'Installs, Q3', scenario: 'NEW_PROJECT' })) },
  };
  const nothing: any = { get: () => undefined, emit: jest.fn(() => Promise.resolve()) };
  const service: any = new ConversationService(prisma, {} as any, { extract: jest.fn() } as any, {} as any, nothing, nothing, nothing, nothing, nothing, nothing);
  /* The real owner check, as it is: the check-in is theirs only if the participant's user is who asks. */
  service.loadOwnedCheckIn = jest.fn(async (id: string, who: string) => {
    const row = await prisma.checkIn.findUnique();
    if (row.participant.userId !== who) throw new ForbiddenException('This check-in does not belong to you');
    return row;
  });
  service.briefFor = () => null;
  service.whoIsReadingIt = () => 'participant';
  service.connectWhatsAppOn = async () => null;
  service.untoldGoalsOn = async () => [];
  return service;
}

describe('Juma reads his own transcript', () => {
  it('without what the lead typed about him, anywhere in it', async () => {
    const out = await transcriptFor(juma).getTranscript('ci1', 'u-juma');
    const wire = JSON.stringify(out);
    expect(wire).not.toContain(THE_LEADS_WORDS);
    expect(wire).not.toContain(THE_LEADS_EXPECTATION);
    expect(wire).not.toContain('secret-invite-token');
    expect(wire).not.toContain('stop-token');
    expect(out.checkIn.participant.roleAsDescribed).toBeUndefined();
    expect(out.checkIn.theirAnswerFitted.kind).toBeUndefined();
  });

  it('and the rest of the check-in row carries none of the lead\'s set-up, labels or ratings', async () => {
    const out = await transcriptFor(juma).getTranscript('ci1', 'u-juma');
    for (const key of ['sessionPlan', 'probeSources', 'specificityLevel', 'specificityDimensions', 'whatWeHave', 'warningFiredAt', 'patternsAnalyzedAt', 'leadToldAt']) {
      expect(out.checkIn).not.toHaveProperty(key);
    }
    const wire = JSON.stringify(out);
    expect(wire).not.toMatch(/PATTERN-WATCH-FOR|PATTERN-NOTICED|pattern:B1|CLAIM-HELD|CHALLENGE-HELD|LOW/);
    /* What the screen reads is all still there. */
    expect(out.checkIn).toMatchObject({ id: 'ci1', groundId: 'g1', sessionNumber: 1, status: 'IN_PROGRESS', groundLabel: 'Installs, Q3', scenario: 'NEW_PROJECT' });
    expect(out.checkIn.sessionReport).toEqual({ yourRole: 'Installer' });
  });

  it('and still reads what is his: his name, his turns, his own fitted answer', async () => {
    const out = await transcriptFor(juma).getTranscript('ci1', 'u-juma');
    expect(out.checkIn.participant).toMatchObject({ id: 'p-juma', nameGiven: 'Juma', partyType: 'PARTICIPANT', userId: 'u-juma' });
    expect(out.checkIn.theirAnswerFitted).toMatchObject({ values: [{ field: 'jobs', value: 'finishes most jobs' }], completeness: 0.5 });
    expect(out.checkIn.groundLabel).toBe('Installs, Q3');
    expect(out.turns).toHaveLength(1);
  });
});

describe('Wairimu, who runs it, reads her own transcript', () => {
  it('whole, as before', async () => {
    const out = await transcriptFor(wairimu).getTranscript('ci1', 'u-wairimu');
    expect(out.checkIn.participant.roleAsDescribed).toBe('Runs sales.');
    expect(out.checkIn.theirAnswerFitted.kind).toBe(THE_LEADS_WORDS);
    expect(out.checkIn.sessionPlan.watchFor).toEqual(['PATTERN-WATCH-FOR']);
  });
});

describe('nobody else reads it', () => {
  it('a colleague and an admin are refused, and read none of it', async () => {
    for (const who of ['u-miriam', 'u-grace-admin']) {
      await expect(transcriptFor(juma).getTranscript('ci1', who)).rejects.toBeInstanceOf(ForbiddenException);
    }
  });
});
