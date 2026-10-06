import { readFileSync } from 'fs';
import { join } from 'path';
import { ParticipantsService } from '../participants/participants.service';
import { theLeadsWordsAbout } from './the-leads-words-about-someone';

/**
 * THE LEAD'S WORDS ABOUT A PERSON NEVER REACH A PARTICIPANT (U.6 review, a privacy fix).
 *
 * Read live on Daniel's invitation: "Your part in this: Daniel - Your sales manager, who you said is
 * not meeting his agreed targets for pipeline building and coaching." That sentence was typed by the
 * lead when she added him. It is served now only to whoever runs the check-in.
 */
const DANIEL = 'Daniel - Your sales manager, who you said is not meeting his agreed targets for pipeline building and coaching.';
const DAY = 24 * 60 * 60 * 1000;

describe('the lead\'s words about someone', () => {
  it('Daniel\'s invitation, as Daniel opens it, carries none of what the lead wrote about him', async () => {
    const row = { id: 'p1', groundId: 'g1', inviteToken: 'tok', email: 'daniel@x.test', userId: null, roleAsDescribed: DANIEL, inviteTokenExpiresAt: new Date(Date.now() + 5 * DAY) };
    const prisma: any = {
      groundParticipant: { findUnique: jest.fn(async () => row) },
      ground: {
        findUnique: jest.fn(async () => ({
          id: 'g1', label: 'Daniel, the next six weeks', scenario: 'PIP', cadence: 'WEEKLY', cadenceAnchorDay: null, workingDays: [],
          endsAt: null, initiator: { firstName: 'Hafsah', lastName: 'Jumare' }, organization: { name: 'Coamana' },
        })),
      },
      checkIn: { count: jest.fn(async () => 0) },
    };
    const preview: any = await new ParticipantsService(prisma, {} as any, {} as any, {} as any).preview('tok');
    expect(preview.roleAsDescribed).toBeUndefined();
    expect(JSON.stringify(preview)).not.toContain('sales manager');
    expect(JSON.stringify(preview)).not.toContain('who you said');
  });

  it('is kept for the check-in\'s lead, and is nothing for anybody else', () => {
    expect(theLeadsWordsAbout({ roleAsDescribed: DANIEL }, true)).toBe(DANIEL);
    expect(theLeadsWordsAbout({ roleAsDescribed: DANIEL }, false)).toBeNull();
  });

  /* Every other place a participant row is served to a reader goes through the same rule. */
  it('the check-in, the check-ins list and the board all narrow it by who is reading', () => {
    const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const grounds = strip(readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8'));
    /* U.7 review: the lead alone, not an admin, so each call is asked with "is this the lead". */
    expect(grounds).toContain('roleAsDescribed: theLeadsWordsAbout(p, isInitiator),');
    expect(grounds).toContain('roleAsDescribed: theLeadsWordsAbout(p, viewerIsInitiator),');
    const board = strip(readFileSync(join(__dirname, '..', 'board', 'board.service.ts'), 'utf8'));
    expect(board).not.toMatch(/role: p\.roleAsDescribed/);
    expect(board.match(/theLeadsWordsAbout\(p, isInitiator\)/g)).toHaveLength(3);
    expect(board).not.toMatch(/theLeadsWordsAbout\([^)]*runsThisGround\)/);
  });
});
