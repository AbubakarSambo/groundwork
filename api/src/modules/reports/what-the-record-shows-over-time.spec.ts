import {
  commitmentsOverTime, dependenciesOverTime, patternsOverTime, gapsOverTime, theOnesStillOpen,
  whatThisCannotTellYou, toSettleFirst,
} from './what-the-record-shows-over-time';

const labelOf = (id: string | null) => (id === 'marcus' ? 'Marcus Oyelaran' : id === 'amina' ? 'Amina Bello' : 'a party');
const nameOf = (code: string) => (code === 'E2' ? 'Intro Evasion' : code);

describe('what the record shows over time', () => {
  describe('commitments', () => {
    it('says which session it was said in and which sessions it was said again in', () => {
      const [c] = commitmentsOverTime([{
        participantId: 'marcus', text: 'I will arrange meetings with the technical team',
        whenSaid: 'next week', explicit: true, status: 'UNKNOWN', source: 'CHECK_IN',
        statedInSession: 1, saidAgainIn: [2, 3, 5],
      }], labelOf, 6);
      expect(c.say).toContain('said in session 1');
      expect(c.say).toContain('said again in sessions 2, 3, 5');
      expect(c.say).toContain('open 5 sessions');
      expect(c.say).toContain('"I will arrange meetings with the technical team"');
    });

    it('never says anything happened, because only a person says that', () => {
      const [c] = commitmentsOverTime([{
        participantId: 'marcus', text: 'I will call her', whenSaid: null, explicit: true,
        status: 'UNKNOWN', source: 'CHECK_IN', statedInSession: 4, saidAgainIn: [],
      }], labelOf, 4);
      expect(c.say).toContain('nobody has said whether it happened');
    });

    it('says when the lead said it rather than them', () => {
      const [c] = commitmentsOverTime([{
        participantId: 'marcus', text: 'get the MOU signed', whenSaid: null, explicit: false,
        status: 'UNKNOWN', source: 'PASTE', statedInSession: null, saidAgainIn: [],
      }], labelOf, 3);
      expect(c.say).toContain('the lead said they would, not them');
    });

    it('puts the most-restated open one first', () => {
      const all = commitmentsOverTime([
        { participantId: 'marcus', text: 'one', whenSaid: null, explicit: true, status: 'UNKNOWN', source: 'CHECK_IN', statedInSession: 3, saidAgainIn: [] },
        { participantId: 'marcus', text: 'two', whenSaid: null, explicit: true, status: 'UNKNOWN', source: 'CHECK_IN', statedInSession: 1, saidAgainIn: [2, 3] },
        { participantId: 'marcus', text: 'three', whenSaid: null, explicit: true, status: 'DONE', source: 'CHECK_IN', statedInSession: 1, saidAgainIn: [2, 3, 4] },
      ], labelOf, 5);
      const open = theOnesStillOpen(all);
      expect(open.map((c) => c.what)).toEqual(['two', 'one']);
    });
  });

  describe('dependencies', () => {
    /* The direction, said out loud, because it kept being read backwards. */
    it('says whose work it is, when it is on somebody here', () => {
      const [d] = dependenciesOverTime([{
        what: 'a stakeholder map', fromParticipantId: 'amina', onParticipantId: 'marcus',
        onLabel: null, status: 'WAITING', escalatedAt: null, statedInSession: 2,
      }], labelOf, 6);
      expect(d.say).toContain('Amina Bello is waiting on Marcus Oyelaran');
      expect(d.say).toContain('This is work Marcus Oyelaran owes Amina Bello, not the other way round');
      expect(d.say).toContain('4 sessions');
      expect(d.say).toContain('Nothing on record says anybody has chased it since');
    });

    /*
     * AND IT READS LIKE A PERSON WROTE IT, which is the half a substring check keeps missing.
     *
     * This one sentence was on every dependency of every report and every board, and in a
     * twenty-four-scenario run it carried the word "escalating" 163 times - more than every other
     * banned word put together. It also joined four fragments with semicolons, which is the clipped
     * shape the wording rules exist to stop. Both are checked here rather than in the string above,
     * so a rewrite that drops the jargon and brings the fragments back still fails.
     */
    it('and says it in whole sentences, with no management words in it', () => {
      const [d] = dependenciesOverTime([{
        what: 'the signed lease', fromParticipantId: 'amina', onParticipantId: 'marcus',
        onLabel: null, status: 'WAITING', escalatedAt: null, statedInSession: 2,
      }], labelOf, 6);
      expect(d.say).toBe(
        'Amina Bello is waiting on Marcus Oyelaran for "the signed lease" for 4 sessions now. '
        + 'Nothing on record says anybody has chased it since. '
        + 'This is work Marcus Oyelaran owes Amina Bello, not the other way round.',
      );
      expect(d.say).not.toMatch(/\b(escalat\w*|bottleneck|alignment|leverage|stakeholder|deliverable|cadence|pipeline)\b/i);
      expect(d.say).not.toContain(';');
      for (const sentence of d.say.split(/(?<=\.)\s+/)) {
        expect(sentence).toMatch(/^[A-Z"]/);
        expect(sentence).toMatch(/\.$/);
      }
    });

    it('says so plainly when somebody did go back about it', () => {
      const [d] = dependenciesOverTime([{
        what: 'the signed lease', fromParticipantId: 'amina', onParticipantId: 'marcus',
        onLabel: null, status: 'WAITING', escalatedAt: new Date('2026-09-01'), statedInSession: 2,
      }], labelOf, 6);
      expect(d.say).toContain('Somebody went back about it after that.');
      expect(d.chased).toBe(true);
      expect(Object.keys(d)).not.toContain('escalated');
    });

    it('drops the ones that cleared', () => {
      expect(dependenciesOverTime([{
        what: 'x', fromParticipantId: 'amina', onParticipantId: 'marcus', onLabel: null,
        status: 'CLEARED', escalatedAt: null, statedInSession: 1,
      }], labelOf, 6)).toHaveLength(0);
    });
  });

  describe('patterns', () => {
    it('says which sessions, and that three with a gap is still a pattern', () => {
      const [p] = patternsOverTime([{
        participantId: 'marcus', code: 'E2', observationText: 'A commitment was replaced by a letter.',
        seenInSessions: [2, 4, 6], periodsObserved: 1, lastPeriodNumber: 6, status: 'SURFACED',
      }], nameOf, labelOf, 6);
      expect(p.name).toBe('Intro Evasion');
      expect(p.say).toContain('sessions 2, 4, 6 of 6');
      expect(p.say).toContain('not consecutively');
      expect(p.say).toContain('Enough sessions to be a pattern');
    });

    it('says plainly when one or two sessions is not yet a pattern', () => {
      const [p] = patternsOverTime([{
        participantId: 'marcus', code: 'K1', observationText: 'Documents instead of conversations.',
        seenInSessions: [2, 3], periodsObserved: 2, lastPeriodNumber: 3, status: 'CANDIDATE',
      }], nameOf, labelOf, 6);
      expect(p.say).toContain('not yet a pattern');
    });
  });

  describe('gaps', () => {
    it('puts a real remit beside what the record holds, and draws no conclusion', () => {
      const [g] = gapsOverTime([{
        participantId: 'marcus', label: 'Marcus Oyelaran',
        expected: 'Build the government relationships and confirm the real approval pathway independently.',
        lines: 44, checkable: 18, documented: 0, openCommitments: 5, owedToOthers: 9, sessions: 6,
      }]);
      expect(g.say).toContain('was taken on for: Build the government relationships');
      expect(g.say).toContain('44 lines of what they said');
      expect(g.say).toContain('0 backed by a document');
      expect(g.say).toContain('9 things somebody else here is waiting on them for');
      expect(g.say).not.toMatch(/fail|poor|should|underperform/i);
    });

    /*
     * AND A JOB TITLE IS NOT A REMIT. The first run of this printed "Government Liaison Consultant
     * was taken on for: Government Liaison Consultant", reading the title back as though it
     * explained what the person was for.
     */
    it('says plainly when the only thing on record is a job title', () => {
      const [g] = gapsOverTime([{
        participantId: 'marcus', label: 'Marcus Oyelaran', expected: 'Government Liaison Consultant',
        lines: 44, checkable: 18, documented: 0, openCommitments: 5, owedToOthers: 9, sessions: 6,
      }]);
      expect(g.say).toContain('is down as "Government Liaison Consultant" and nothing on record says what that covers');
      expect(g.say).not.toContain('taken on for: Government Liaison Consultant');
    });

    it('says nothing about somebody whose role nobody defined', () => {
      expect(gapsOverTime([{
        participantId: 'amina', label: 'Amina Bello', expected: '', lines: 47, checkable: 12,
        documented: 0, openCommitments: 0, owedToOthers: 0, sessions: 6,
      }])).toHaveLength(0);
    });
  });

  describe('what it cannot tell you', () => {
    it('says so when nothing is documented and nobody said who arranged anything', () => {
      const out = whatThisCannotTellYou({
        documentsAttached: 0, peopleWhoAnswered: 2, peopleInvited: 2, anybodyAskedWhoArrangedThings: false,
      });
      expect(out.join(' ')).toContain('Nothing here is backed by a document');
      expect(out.join(' ')).toContain('who secured them');
      expect(out.join(' ')).toContain('Most of what anybody did is not in here');
    });
  });

  describe('what to settle first', () => {
    /* Questions, and not one of them a conclusion about a person. */
    it('asks about the restated promise, the wait nobody chased, and the undocumented record', () => {
      const commitments = commitmentsOverTime([{
        participantId: 'marcus', text: 'I will arrange the technical team meetings', whenSaid: null,
        explicit: true, status: 'UNKNOWN', source: 'CHECK_IN', statedInSession: 1, saidAgainIn: [2, 3, 4],
      }], labelOf, 6);
      const dependencies = dependenciesOverTime([{
        what: 'a stakeholder map', fromParticipantId: 'amina', onParticipantId: 'marcus',
        onLabel: null, status: 'WAITING', escalatedAt: null, statedInSession: 2,
      }], labelOf, 6);
      const questions = toSettleFirst({
        commitments, dependencies, patterns: [], documentsAttached: 0, anybodySaidWhoArrangedThings: false,
      });
      const all = questions.join(' | ');
      expect(all).toContain('said again in 3 sessions');
      expect(all).toContain('nothing on record says anybody has gone back about it');
      expect(all).toContain('who arranged the meetings');
      expect(all).toContain('one thing in writing');
      for (const q of questions) expect(q).not.toMatch(/\b(failing|unreliable|should be (let go|replaced))\b/i);
      /* And no management words in any of them, including the "unescalated" this used to say. */
      for (const q of questions) expect(q).not.toMatch(/\b(escalat\w*|unescalated|bottleneck|cadence|pipeline)\b/i);
    });
  });
});
