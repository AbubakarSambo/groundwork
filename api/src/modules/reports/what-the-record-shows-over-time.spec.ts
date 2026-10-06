import {
  commitmentsOverTime, dependenciesOverTime, patternsOverTime, gapsOverTime, theOnesStillOpen,
  whatThisCannotTellYou, toSettleFirst,
} from './what-the-record-shows-over-time';

/*
 * 30 September 2026, run 20 of the 24-scenario check: 6 of 604 served quotes were not, character for
 * character, in the record - all of them `overTime.commitments[].say`, built here. A commitment's
 * `text` and `whenSaid` are a model's reading of a check-in, not guaranteed to be the person's own
 * words, so from here on a test that wants a quote must say so with `saidWordForWord: true` (and
 * `whenSaidWordForWord: true` for the time). The tests below that already existed are updated to say
 * so explicitly, because until now the function quoted every commitment regardless - the defect this
 * closes - and new tests below cover the two real strings the run caught.
 */

const labelOf = (id: string | null) => (id === 'marcus' ? 'Marcus Oyelaran' : id === 'amina' ? 'Amina Bello' : 'a party');
const nameOf = (code: string) => (code === 'E2' ? 'Intro Evasion' : code);

describe('what the record shows over time', () => {
  describe('commitments', () => {
    it('says which session it was said in and which sessions it was said again in', () => {
      const [c] = commitmentsOverTime([{
        participantId: 'marcus', text: 'I will arrange meetings with the technical team',
        whenSaid: 'next week', explicit: true, status: 'UNKNOWN', source: 'CHECK_IN',
        statedInSession: 1, saidAgainIn: [2, 3, 5], saidWordForWord: true, whenSaidWordForWord: true,
      }], labelOf, 6);
      /* Changed 29 Sep 2026: full sentences, no colon, dash or semicolon joins (review, item 5). */
      expect(c.say).toBe('In session 1, Marcus Oyelaran said, "I will arrange meetings with the technical team". The time Marcus Oyelaran gave for it was "next week". Marcus Oyelaran said it again in sessions 2, 3 and 5. It has been open for 5 sessions, and nobody has said whether it happened.');
    });

    it('says "you" in lower case in the middle of a sentence when the person is the reader (request 87)', () => {
      const row = (over: Record<string, any> = {}) => commitmentsOverTime([{
        participantId: 'you', text: 'call the client', whenSaid: 'on Wednesday 30 September', explicit: true,
        status: 'UNKNOWN', source: 'CHECK_IN', statedInSession: 1, saidAgainIn: [], ...over,
      }], () => 'You', 1, 'Hafsah')[0].say;
      expect(row()).toBe('In session 1, you committed to call the client. The time you gave for it was on Wednesday 30 September. Nobody has said yet whether it happened.');
      expect(row({ source: 'PASTE', statedInSession: null })).toBe('In what Hafsah pasted in, you committed to call the client. The time you gave for it was on Wednesday 30 September. Nobody has said yet whether it happened.');
      expect(row({ status: 'DONE', settledBy: 'PROVEN' })).toContain('A document you added shows it was done.');
      expect(row({ explicit: false, saidWordForWord: false })).toContain('Hafsah committed you to call the client');
    });

    it('never says anything happened, because only a person says that', () => {
      const [c] = commitmentsOverTime([{
        participantId: 'marcus', text: 'I will call her', whenSaid: null, explicit: true,
        status: 'UNKNOWN', source: 'CHECK_IN', statedInSession: 4, saidAgainIn: [],
      }], labelOf, 4);
      expect(c.say).toContain('Nobody has said yet whether it happened.');
      expect(c.say).not.toMatch(/marked|done/);
    });

    it('says when the lead said it rather than them', () => {
      const [c] = commitmentsOverTime([{
        participantId: 'marcus', text: 'get the MOU signed', whenSaid: null, explicit: false,
        status: 'UNKNOWN', source: 'PASTE', statedInSession: null, saidAgainIn: [], saidWordForWord: true,
      }], labelOf, 3, 'Wairimu');
      expect(c.say).toBe('Wairimu said that Marcus Oyelaran would do this, "get the MOU signed". Marcus Oyelaran did not say it. Nobody has said yet whether it happened.');
    });

    it('says so plainly, without quote marks, when the lead\'s words for it are not word for word', () => {
      const [c] = commitmentsOverTime([{
        participantId: 'marcus', text: 'get the MOU signed', whenSaid: null, explicit: false,
        status: 'UNKNOWN', source: 'PASTE', statedInSession: null, saidAgainIn: [], saidWordForWord: false,
      }], labelOf, 3, 'Wairimu');
      expect(c.say).toBe('Wairimu committed Marcus Oyelaran to get the MOU signed. Marcus Oyelaran did not say it. Nobody has said yet whether it happened.');
      expect(c.say).not.toContain('"');
    });

    it('says truly how it was settled, never "somebody marked it done", in full sentences', () => {
      const row = (settledBy: string | null, status = 'DONE') => commitmentsOverTime([{
        participantId: 'marcus', text: 'I will continue to monitor client health closely.', whenSaid: 'next', explicit: true,
        status, source: 'CHECK_IN', statedInSession: 1, saidAgainIn: [], settledBy,
        saidWordForWord: true, whenSaidWordForWord: true,
      }], labelOf, 3)[0].say;
      expect(row('SAID')).toBe('In session 1, Marcus Oyelaran said, "I will continue to monitor client health closely." The time Marcus Oyelaran gave for it was "next". Marcus Oyelaran said later that it was done.');
      expect(row('PROVEN')).toMatch(/A document Marcus Oyelaran added shows it was done\.$/);
      expect(row('CONFIRMED')).toMatch(/The colleague who received it confirmed that it was done\.$/);
      expect(row('SAID', 'NOT_DONE')).toMatch(/Marcus Oyelaran said later that it was not done\.$/);
      expect(row(null)).toMatch(/It is marked done, and the record does not say who marked it\.$/);
      for (const by of ['SAID', 'PROVEN', 'CONFIRMED', null]) {
        expect(row(by)).not.toMatch(/somebody marked|; | - |Oyelaran:/);
        expect(row(by)).toContain('"I will continue to monitor client health closely."');
      }
    });

    /* The exact two strings run 20 served in quote marks that were nobody's own words. */
    it('never puts quote marks round a commitment the record does not confirm word for word', () => {
      const [c] = commitmentsOverTime([{
        participantId: 'marcus', text: 'lead that review with the team', whenSaid: null, explicit: true,
        status: 'UNKNOWN', source: 'CHECK_IN', statedInSession: 2, saidAgainIn: [], saidWordForWord: false,
      }], labelOf, 2);
      expect(c.say).toBe('In session 2, Marcus Oyelaran committed to lead that review with the team. Nobody has said yet whether it happened.');
      expect(c.say).not.toContain('"');
    });

    it('never quotes the time either, unless the record confirms those are their own words', () => {
      const [c] = commitmentsOverTime([{
        participantId: 'marcus', text: "I'll reach out to the InfoSec team to push the security review forward.",
        whenSaid: 'as soon as the 29th arrives', explicit: true, status: 'UNKNOWN', source: 'CHECK_IN',
        statedInSession: 1, saidAgainIn: [], saidWordForWord: false, whenSaidWordForWord: false,
      }], labelOf, 1);
      expect(c.say).toBe(
        'In session 1, Marcus Oyelaran committed to reach out to the InfoSec team to push the security review forward. '
        + 'The time Marcus Oyelaran gave for it was as soon as the 29th arrives. Nobody has said yet whether it happened.',
      );
      expect(c.say).not.toContain('"');
    });

    /*
     * ONE SENTENCE, IN THE PRODUCT'S OWN VOICE, NEVER A CLIPPED INSTRUCTION OR SOMEBODY ELSE'S "I".
     *
     * A first pass at this fix read "Priti Sharma committed to this. I'll reach out to the InfoSec
     * team..." - a clipped instruction for "lead that review with the team", and, worse, "I" left in
     * the product's own sentence belonging to nobody the reader is reading about. The leading
     * first-person frame ("I'll", "I will", ...) comes off and the rest becomes the object of
     * "committed to"; the exact strings from run 20 are checked here.
     */
    it("puts a commitment's own words into the product's sentence, in our voice, not theirs", () => {
      const priti = (id: string | null) => (id === 'priti' ? 'Priti Sharma' : 'a party');
      const [c1] = commitmentsOverTime([{
        participantId: 'marcus', text: 'lead that review with the team', whenSaid: null, explicit: true,
        status: 'UNKNOWN', source: 'CHECK_IN', statedInSession: 2, saidAgainIn: [], saidWordForWord: false,
      }], labelOf, 2);
      expect(c1.say).toContain('In session 2, Marcus Oyelaran committed to lead that review with the team.');

      const [c2] = commitmentsOverTime([{
        participantId: 'priti', text: "I'll reach out to the InfoSec team to push the security review forward.",
        whenSaid: null, explicit: true, status: 'UNKNOWN', source: 'CHECK_IN', statedInSession: 1, saidAgainIn: [],
        saidWordForWord: false,
      }], priti, 1);
      expect(c2.say).toContain('In session 1, Priti Sharma committed to reach out to the InfoSec team to push the security review forward.');

      /* "my" is said about the person ("their") rather than hiding what they committed to (request 123, item 9). */
      const [c3] = commitmentsOverTime([{
        participantId: 'priti', text: 'I will get my documents sorted out.', whenSaid: null, explicit: true,
        status: 'UNKNOWN', source: 'CHECK_IN', statedInSession: 1, saidAgainIn: [], saidWordForWord: false,
      }], priti, 1);
      expect(c3.say).toContain('In session 1, Priti Sharma committed to get their documents sorted out.');

      /* An "I" left deeper in the sentence still cannot be said safely in our voice. */
      const [c4] = commitmentsOverTime([{
        participantId: 'priti', text: 'I will ask the team after I have the figures.', whenSaid: null, explicit: true,
        status: 'UNKNOWN', source: 'CHECK_IN', statedInSession: 1, saidAgainIn: [], saidWordForWord: false,
      }], priti, 1);
      expect(c4.say).toContain('In session 1, Priti Sharma made a commitment, which is in the record.');
      for (const say of [c1.say, c2.say, c3.say]) {
        expect(say).not.toContain('"');
        expect(say).not.toMatch(/\bmy\b|\bI\b|\bI'll\b|\bme\b|\bour\b/);
      }
    });

    it('leaves the time out altogether when it does not read as a time or a date at all', () => {
      const [c] = commitmentsOverTime([{
        participantId: 'marcus', text: 'sign the lease', whenSaid: 'lead that review with the team',
        explicit: true, status: 'UNKNOWN', source: 'CHECK_IN', statedInSession: 1, saidAgainIn: [],
        saidWordForWord: true, whenSaidWordForWord: false,
      }], labelOf, 1);
      expect(c.say).not.toMatch(/The time .* gave for it/);
      expect(c.say).not.toContain('lead that review with the team');
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
      /* One sentence with the thing it is about since 1 October 2026: see the next test. */
      expect(d.say).toContain('and nothing on record says anybody has chased it since');
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
      /*
       * CHANGED 1 OCTOBER 2026 (review of 1 October, section 3). What was tried is now in the same
       * sentence as the thing it was tried on. As two sentences, the quote check could take the
       * first and leave "Nothing on record says anybody has chased it since." on its own, about
       * nothing, at the top of the lead's list of what is still open.
       */
      expect(d.say).toBe(
        'Amina Bello is waiting on Marcus Oyelaran for "the signed lease" for 4 sessions now, and nothing on record says anybody has chased it since. '
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
      /* In the same sentence as the thing, since 1 October 2026 (see above). */
      expect(d.say).toContain('for 4 sessions now, and somebody went back about it after that.');
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
      /* Whole sentences, no slot names: it read "was taken on for: ... What the record holds about
         it: ..." until 27 September 2026. */
      expect(g.say).toBe(
        'The role written down for Marcus Oyelaran is to build the government relationships and confirm the real approval pathway independently. '
        + 'Since then, the record holds 6 sessions, 44 lines of what was said, 18 with a name, a number or a date in them, '
        + 'none backed by a document, 5 commitments still open and 9 things somebody else here is waiting for.',
      );
      expect(g.say).not.toMatch(/fail|poor|should|underperform/i);
      expect(g.say).not.toMatch(/taken on for:|What the record holds/);
    });

    /*
     * THE LEAD'S FRAGMENTS BECOME ONE SENTENCE, IN THEIR OWN WORDS. Sales, run 10: "Ngozi Eze was
     * taken on for: Relationship officer, Ikeja. Target 14 approved facilities this quarter. What
     * the record holds about it: 1 session on reco...", on the lead's report and board.
     */
    it('reads a description written in fragments as one sentence', () => {
      const [g] = gapsOverTime([{
        participantId: 'ngozi', label: 'Ngozi Eze',
        expected: 'Relationship officer, Ikeja. Target 14 approved facilities this quarter.',
        lines: 6, checkable: 1, documented: 0, openCommitments: 1, owedToOthers: 0, sessions: 1,
      }]);
      expect(g.say).toBe(
        'Ngozi Eze is a relationship officer for Ikeja, with a goal of 14 approved facilities this quarter. '
        + 'Since then, the record holds 1 session, 6 lines of what was said, 1 with a name, a number or a date in it, '
        + 'none backed by a document and 1 commitment still open.',
      );
      /* tools/score_run.py, "role description used as a name", the same expression. */
      expect(g.say).not.toMatch(/\. Target \d+ [a-z ]+this quarter\.|(?<=[a-z])\. Target \d+/);
    });

    it('keeps the capital on a word that may be a name, and says what a verb-first remit is there to do', () => {
      const [g] = gapsOverTime([{
        participantId: 'femi', label: 'Femi', expected: 'Covers the mainland branches. Ikeja and Yaba are his.',
        lines: 1, checkable: 0, documented: 0, openCommitments: 0, owedToOthers: 0, sessions: 1,
      }]);
      expect(g.say).toContain('is to cover the mainland branches; Ikeja and Yaba are his.');
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
      expect(g.say).toContain('is down as "Government Liaison Consultant", and nothing on record says what that role covers.');
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

    it('asks about a restated commitment plainly, without quote marks, when it is not word for word', () => {
      const commitments = commitmentsOverTime([{
        participantId: 'marcus', text: 'lead that review with the team', whenSaid: null,
        explicit: true, status: 'UNKNOWN', source: 'CHECK_IN', statedInSession: 1, saidAgainIn: [2, 3, 4],
        saidWordForWord: false,
      }], labelOf, 6);
      const questions = toSettleFirst({
        commitments, dependencies: [], patterns: [], documentsAttached: 1, anybodySaidWhoArrangedThings: true,
      });
      expect(questions[0]).toBe(
        'Lead that review with the team has been said again in 3 sessions and nobody has said whether it happened. '
        + 'Ask Marcus Oyelaran what it is waiting on, and decide whether it is still wanted.',
      );
      expect(questions[0]).not.toContain('"');
    });
  });
});
