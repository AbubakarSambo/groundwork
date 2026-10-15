import { ConversationService } from './conversation.service';
import { GroundsService } from '../grounds/grounds.service';
import { openingWithASentence } from './the-private-summary-opens-with-a-sentence';

/**
 * REQUEST 60: A PERSON'S PRIVATE SUMMARY OPENS WITH A SENTENCE, NOT "WHAT YOU SHARED:".
 *
 * Read the way the person reads it: through the check-in's own summary route and through the
 * ground's "my summary" route, from a summary stored the old way.
 */
const STORED_THE_OLD_WAY = JSON.stringify({
  summary: 'What you shared: you are aiming for six shops by December.',
  whatToCarry: 'Ask Juma for the Westgate order before Friday.',
});

describe('the private summary opens with a sentence', () => {
  it('the check-in route serves "Here is what you shared." as its own sentence', async () => {
    const prisma: any = {
      groundParticipant: { findUnique: jest.fn(async () => ({ soloArtifact: STORED_THE_OLD_WAY, soloArtifactAt: new Date('2026-09-28T10:00:00Z') })) },
    };
    const service = new ConversationService(
      prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
      { sendParticipantBlockedNudge: () => Promise.resolve() } as any, { emit: () => Promise.resolve() } as any, { get: () => '' } as any,
    );
    (service as any).loadOwnedCheckIn = jest.fn(async () => ({ participantId: 'p1', status: 'COMPLETED' }));
    const served: any = await service.getSoloArtifact('c1', 'u1');
    expect(served.artifact.summary).toBe('Here is what you shared. You are aiming for six shops by December.');
    expect(served.artifact.whatToCarry).toBe('Ask Juma for the Westgate order before Friday.');
  });

  it('the ground route serves the same sentence', async () => {
    const prisma: any = {
      groundParticipant: { findFirst: jest.fn(async () => ({ soloArtifact: STORED_THE_OLD_WAY, soloArtifactShared: false })) },
    };
    const grounds = Object.create(GroundsService.prototype);
    grounds.prisma = prisma;
    const served: any = await grounds.getMySoloReport('g1', 'u1');
    expect(served.report.summary).toBe('Here is what you shared. You are aiming for six shops by December.');
  });

  it('leaves a summary that already opens properly exactly as it is', () => {
    const s = 'Here is what you shared. You said "we lost the Tuskys order", and you want it back by June.';
    expect(openingWithASentence(s)).toBe(s);
  });

  it('the prompt no longer asks for the colon opening', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, 'conversation.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(src).not.toContain('Open with the exact phrase "What you shared:"');
    expect(src).toContain('Open with the sentence "Here is what you shared." on its own');
  });
});
