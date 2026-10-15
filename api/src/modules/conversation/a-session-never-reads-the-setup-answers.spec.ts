import { ConversationService } from './conversation.service';
import { GroundsService } from '../grounds/grounds.service';
import { whatSomeoneWhoDoesNotRunItReads } from '../grounds/what-someone-who-does-not-run-it-reads';

/**
 * REQUEST 41: A PARTICIPANT'S SESSION NEVER FALLS BACK TO THE LEAD'S SETUP ANSWERS.
 *
 * The brief setup writes holds the situation, then the lead's answers: "When asked what the
 * questions should focus on, the answer was taken to mean this. Aisha is often late with stock
 * counts." Where the short version for participants (`toldToParticipants`) was missing, the session's
 * brief (`briefFor`, what `open()` and the transcript hand the person, and what the embed panel shows
 * as "What was written for you") fell back to the brief's sentences, and those answers passed every
 * filter. So Aisha could read, in her own session, what her lead wants her asked about.
 *
 * These read the brief each person is actually handed, and what the model is handed when the short
 * version is written.
 */

const SITUATION = 'Aisha joined the stock team in July and is on probation until the end of October.';
const ANSWERS =
  'When asked what the questions should focus on, the answer was taken to mean this. Aisha is often late with stock counts. ' +
  'When asked why this matters now, the answer was taken to mean this. The confirmation decision is due in four weeks.';
const BRIEF = `${SITUATION} ${ANSWERS}`;

const ground = (told: string | null) => ({
  label: 'Aisha’s probation',
  brief: BRIEF,
  toldToParticipants: told,
  objectives: [],
  whoSeesTargets: 'THEIR_OWN' as const,
});

const briefFor = (g: any, reader: { participantId: string | null; isLead: boolean }) =>
  (Object.create(ConversationService.prototype) as any).briefFor(g, reader);

const THE_LEADS_ANSWERS = [/often late/i, /stock counts/i, /confirmation decision/i, /when asked/i, /taken to mean/i];

describe('what Aisha is handed in her own session', () => {
  /* Changed with decision 75, item 13: with no short version written, she reads nothing of the brief, not even its
     situation sentences, which are the lead's words to the product. */
  it('with no short version written, nothing of the brief, and none of the lead’s answers', () => {
    const says = briefFor(ground(null), { participantId: 'p-aisha', isLead: false }).says;
    expect(says).toBeNull();
  });

  it('the same for a colleague in the check-in', () => {
    const says = briefFor(ground(null), { participantId: 'p-kofi', isLead: false }).says;
    expect(says).toBeNull();
  });

  it('with the short version written, that is what she reads', () => {
    const says: string = briefFor(ground('This check-in is about how your first months in the stock team are going.'), { participantId: 'p-aisha', isLead: false }).says;
    expect(says).toBe('This check-in is about how your first months in the stock team are going.');
  });

  it('a brief that is nothing but the lead’s answers gives her nothing, not the answers', () => {
    const says = briefFor({ ...ground(null), brief: ANSWERS }, { participantId: 'p-aisha', isLead: false }).says;
    expect(says).toBeNull();
  });
});

describe('the lead', () => {
  it('still reads their whole brief, answers included', () => {
    const says: string = briefFor(ground(null), { participantId: 'p-lead', isLead: true }).says;
    expect(says).toBe(BRIEF);
  });
});

describe('the check-in read and the list, through the one rule', () => {
  /* Changed with decision 75, item 13: nothing of the brief where no short version was written. */
  it('serve nothing of the brief where no short version was written', () => {
    expect(whatSomeoneWhoDoesNotRunItReads({ brief: BRIEF, toldToParticipants: null })).toBeNull();
  });
});

describe('what the model is handed when the short version is written', () => {
  it('is the situation, never the lead’s answers', async () => {
    const handed: string[] = [];
    const service: any = Object.create(GroundsService.prototype);
    service.prisma = {
      ground: { update: jest.fn(async () => ({})), findUnique: jest.fn(async () => ({ label: 'Aisha’s probation', timelineDays: 90, cadence: 'WEEKLY' })) },
      groundParticipant: { findMany: jest.fn(async () => []) },
    };
    service.anthropic = { respond: jest.fn(async (_prompt: string, msgs: any[]) => { handed.push(msgs[0].content); return 'Aisha is settling into the stock team.'; }) };
    service.logger = { log: () => undefined, warn: () => undefined };
    await service.tellParticipantsAboutThis('g1', BRIEF);
    expect(handed).toHaveLength(1);
    expect(handed[0]).toContain(SITUATION);
    for (const word of THE_LEADS_ANSWERS) expect(handed[0]).not.toMatch(word);
  });
});
