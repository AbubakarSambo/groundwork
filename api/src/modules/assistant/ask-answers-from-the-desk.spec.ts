import { AssistantService } from './assistant.service';
import { answerFromTheDesk, aReadableTitle, ANSWER_FROM_THE_DESK_PROMPT } from '../knowledge/the-desk';
import { whatEachCheckInFeeds } from '../grounds/what-a-check-in-feeds';

/**
 * ROUND 2, T4 (browser tests of 20 November 2026, web rows 5, 20 and 40). Wairimu, a lead at Msingi Foods, added
 * msingi-leave-policy.pdf to the Desk and asked "how many sick days do we get". Ask said "I looked at the sales team's
 * records ... there is nothing on record about sick days ... add a file with Choose a file". Grace, the admin, asked the
 * same and was given the whole document pasted under "msingi-leave-policy". Both now read the same sentence, from the
 * Desk, naming the document in plain words.
 */
const ORG = 'org-msingi';
const POLICY = { key: 'desk:msingi-leave-policy#2', title: 'msingi-leave-policy - Sick leave', body: 'Sick leave: everyone gets 10 paid sick days a year. After two days in a row, bring a note from a doctor.' };
const ANSWER = 'You get 10 paid sick days a year. This is from the leave policy.';

function deps(cards: any[] = [POLICY], said = ANSWER) {
  const prisma: any = { deskDocument: { findMany: jest.fn(async () => [{ key: 'desk:msingi-leave-policy', title: 'msingi-leave-policy' }]) } };
  const engine = { respond: jest.fn(async () => said) };
  const knowledge = { retrieve: jest.fn(async () => ({ cards })) };
  return { prisma, engine, knowledge };
}

describe('a company question is answered from the Desk', () => {
  it('in a sentence naming the document, from its passages and nothing else', async () => {
    const d = deps();
    expect(await answerFromTheDesk(d, { organizationId: ORG, who: 'wairimu-ext', question: 'how many sick days do we get' })).toBe(ANSWER);
    const [system, history] = (d.engine.respond as jest.Mock).mock.calls[0];
    expect(system).toBe(ANSWER_FROM_THE_DESK_PROMPT);
    expect(system).toContain('This is from the leave policy.');
    expect(history[0].content).toContain('Document: Msingi leave policy\nSick leave: everyone gets 10 paid sick days a year.');
    expect(history[0].content).not.toContain('msingi-leave-policy');
    expect(history[0].content).toMatch(/Question: how many sick days do we get$/);
  });

  it('says nothing when the passages do not answer it, and asks no model when the Desk has nothing', async () => {
    expect(await answerFromTheDesk(deps([POLICY], 'NOTHING'), { organizationId: ORG, who: 'x', question: 'who won the match' })).toBeNull();
    const empty = deps([]);
    expect(await answerFromTheDesk(empty, { organizationId: ORG, who: 'x', question: 'how many sick days' })).toBeNull();
    expect(empty.engine.respond).not.toHaveBeenCalled();
  });

  it('a file added with no title typed gets a readable one, not its slug', () => {
    expect(aReadableTitle('msingi-leave-policy.pdf')).toBe('Msingi leave policy');
    expect(aReadableTitle('Staff_handbook.docx')).toBe('Staff handbook');
  });
});

describe('what Wairimu, a lead, and Grace, an admin, read in Ask', () => {
  function assistant(role: string) {
    const s = Object.create(AssistantService.prototype) as any;
    const d = deps();
    s.prisma = { ...d.prisma, organizationMembership: { findUnique: jest.fn(async () => ({ role })) }, assistantProposal: { create: jest.fn() } };
    s.engine = d.engine;
    s.knowledge = d.knowledge;
    s.librarian = null;
    return s;
  }
  const textOf = (reply: any) => reply.blocks.filter((b: any) => b.type === 'text').map((b: any) => b.body).join('\n');

  for (const [who, role] of [['Wairimu', 'LEAD'], ['Grace', 'ADMIN'], ['Amani', 'MEMBER']]) {
    it(`${who} reads the Desk's answer, before any check-in's documents are read`, async () => {
      const docs = require('./a-question-is-answered-from-the-documents');
      const spy = jest.spyOn(docs, 'answerFromTheDocuments').mockResolvedValue("I looked at the sales team's records and there is nothing on record about sick days.");
      const reply = await assistant(role).aQuestionAnsweredFromTheDocuments(ORG, `${who.toLowerCase()}-ext`, `u-${who.toLowerCase()}`, 'g-sales-q4', 'how many sick days do we get');
      expect(textOf(reply)).toBe(ANSWER);
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  }

  it('the check-ins\' own documents are still read when the Desk does not answer', async () => {
    const docs = require('./a-question-is-answered-from-the-documents');
    const spy = jest.spyOn(docs, 'answerFromTheDocuments').mockResolvedValue('The brief says the target is 40 shops.');
    const s = assistant('LEAD');
    s.engine.respond = jest.fn(async () => 'NOTHING');
    expect(textOf(await s.aQuestionAnsweredFromTheDocuments(ORG, 'w', 'u-w', 'g', 'what is the target in the brief'))).toBe('The brief says the target is 40 shops.');
    spy.mockRestore();
  });
});

describe('which check-in feeds a priority (browser test row 40)', () => {
  const priorities = [
    { externalId: 'p1', ownerExternalId: 'wairimu', type: 'OBJECTIVE', parentExternalId: null },
    { externalId: 'p2', ownerExternalId: 'grace', type: 'OBJECTIVE', parentExternalId: null },
    { externalId: 'p3', ownerExternalId: 'grace', type: 'OBJECTIVE', parentExternalId: null },
  ];
  const people = new Map([['u-wairimu', 'wairimu'], ['u-grace', 'grace']]);

  it('Wairimu\'s "Sales team, Q4", tied to nothing, feeds the one priority she owns', () => {
    expect(whatEachCheckInFeeds([{ id: 'g-q4', initiatorId: 'u-wairimu', subjectExternalId: null }], priorities, people).get('g-q4')).toBe('p1');
  });

  it('a check-in tied to a priority feeds that one, and a lead who owns several is not guessed for', () => {
    const feeds = whatEachCheckInFeeds([
      { id: 'g-tied', initiatorId: 'u-wairimu', subjectExternalId: 'p3' },
      { id: 'g-grace', initiatorId: 'u-grace', subjectExternalId: null },
      { id: 'g-nobody', initiatorId: 'u-otieno', subjectExternalId: null },
    ], priorities, people);
    expect(feeds.get('g-tied')).toBe('p3');
    expect(feeds.get('g-grace')).toBeNull();
    expect(feeds.get('g-nobody')).toBeNull();
  });
});
