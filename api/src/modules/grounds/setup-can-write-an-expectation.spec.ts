import { proposalFrom, extractionToolFor } from './what-the-context-chat-heard';
import { whoTheyMeant } from './who-they-meant';
import { readFileSync } from 'fs';
import { join } from 'path';

const PARTIES = [
  { id: 'p1', email: 'dele@acme.test', name: 'Dele Okonkwo' },
  { id: 'p2', email: 'amaka@acme.test', name: 'Amaka Eze' },
];

describe('setup can write an expectation, once the lead confirms it', () => {
  it('proposes one when a person and something checkable were both said', () => {
    const p = proposalFrom('objectives', {
      expectationPerson: 'Dele',
      expectationText: 'Own the renewals for the twelve accounts that went quiet',
    }, PARTIES);
    expect(p.kind).toBe('expectation');
    expect((p as any).participantId).toBe('p1');
  });

  it('says it is the lead\'s expectation and not agreement, in the sentence they confirm', () => {
    const p = proposalFrom('objectives', {
      expectationPerson: 'Dele', expectationText: 'Own the renewals for the twelve quiet accounts',
    }, PARTIES) as any;
    expect(p.say).toContain('YOUR expectation');
    expect(p.say).toContain('not yet seen by them');
  });

  it('refuses when nobody was named', () => {
    /* An expectation with no person attached is a statement about the work, which `success` holds. */
    const p = proposalFrom('objectives', { expectationText: 'Get the renewals done properly' }, PARTIES);
    expect(p.kind).toBe('none');
  });

  /*
   * FIX 4, 30 September 2026 (inventory items 10-11). This used to assert `kind: 'none'` - nothing
   * proposed, nothing saved - while the model's own reply (contextChatPrompt rule 2) told the lead it
   * was being kept as their read regardless. Driven live: "Ben should be more proactive" got "I will
   * record this as your read of Ben... it will never be quoted to Ben", and nothing was recorded. What
   * is not checkable enough to hold somebody to is not nothing - it is the lead's own read of that
   * person, and it is now proposed as a private LEAD_ONLY note, said back and confirmed like
   * everything else here, never as an expectation the person is held to.
   */
  it('what is not checkable enough to hold somebody to becomes a private note about them, not nothing', () => {
    const p = proposalFrom('objectives', { expectationPerson: 'Dele', expectationText: 'be more proactive' }, PARTIES);
    expect(p.kind).toBe('lead_read');
    expect((p as any).participantId).toBe('p1');
    expect((p as any).text).toBe('be more proactive');
    expect((p as any).say).toContain('private note about Dele Okonkwo');
    expect((p as any).say).toContain('never quoted');
  });

  it('refuses a name that matches nobody, rather than picking somebody', () => {
    const p = proposalFrom('objectives', {
      expectationPerson: 'Tunde', expectationText: 'Own the renewals for the quiet accounts',
    }, PARTIES);
    expect(p.kind).toBe('none');
    expect((p as any).why).toContain('Nobody on this check-in matches');
  });

  it('offers the field to the model only on the objectives gap', () => {
    expect(Object.keys(extractionToolFor('objectives').input_schema.properties)).toEqual(['expectationPerson', 'expectationText']);
    expect(Object.keys(extractionToolFor('timeline').input_schema.properties)).not.toContain('expectationText');
  });
});

describe('matching a typed name to a real person', () => {
  it('takes an email exactly', () => {
    expect(whoTheyMeant('AMAKA@acme.test', PARTIES)?.id).toBe('p2');
  });

  it('takes a full name, and a first name where one person has it', () => {
    expect(whoTheyMeant('Dele Okonkwo', PARTIES)?.id).toBe('p1');
    expect(whoTheyMeant('amaka', PARTIES)?.id).toBe('p2');
  });

  it('refuses when two people share the first name', () => {
    /*
     * The case where guessing does the damage. A wrong expectation reads as a standard somebody is
     * being held to, and they have no idea where it came from - worse in kind than no expectation.
     */
    const twoSams = [
      { id: 'a', email: 'sam.taylor@x.test', name: 'Sam Taylor' },
      { id: 'b', email: 'sam.okafor@x.test', name: 'Sam Okafor' },
    ];
    expect(whoTheyMeant('Sam', twoSams)).toBeNull();
  });

  it('refuses an empty name and an empty ground', () => {
    expect(whoTheyMeant('', PARTIES)).toBeNull();
    expect(whoTheyMeant('Dele', [])).toBeNull();
  });
});

describe('and the write happens only on confirmation', () => {
  const CODE = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, '');

  it('creates the objective inside applyContextProposal, not in the chat turn', () => {
    /* To the end of the method, not a character count: the method grew past 4,000 characters on
       22 September 2026 and the pin silently stopped covering the write it names. */
    const apply = CODE.slice(CODE.indexOf('async applyContextProposal('), CODE.indexOf('private async writeWhatThePasteGave('));
    expect(apply).toContain('personObjective.create');
    const turn = CODE.slice(CODE.indexOf('async contextChat('), CODE.indexOf('async applyContextProposal('));
    expect(turn).not.toContain('personObjective.create');
  });

  it('records it unseen, which is what makes writing it safe', () => {
    /*
     * BOUNDED TO THE CREATE. My first version scanned the whole file, where `seenBySubject: false`
     * appears in other writes - so flipping THIS one to true left the guard green, which is the
     * exact defect it exists to catch. The flag is what the record reads to refuse pressing anybody
     * about something nobody showed them.
     */
    const create = CODE.slice(CODE.indexOf('personObjective.create'));
    const block = create.slice(0, create.indexOf('});') + 3);
    expect(block).toContain('seenBySubject: false');
    expect(block).toContain('authoredBy: AUTHORED_AT_SETUP');
    expect(block).not.toContain('seenBySubject: true');
  });

  /*
   * FIX 4, 30 September 2026. The lead's read of a person (a `lead_read` proposal) is written through
   * `addLeadContext` - the SAME function the note box on the Context page calls - not a second write
   * of `LeadContextNote` with a second set of rules. This is what makes the refusal-to-share-a-note-
   * about-a-person rule (item 9) apply here for free, rather than needing to be re-proven.
   */
  it('writes the lead\'s read of a person through addLeadContext, inside applyContextProposal, as a LEAD_ONLY note', () => {
    const apply = CODE.slice(CODE.indexOf('async applyContextProposal('), CODE.indexOf('private async writeWhatThePasteGave('));
    expect(apply).toContain("if (proposal.kind === 'lead_read')");
    const leadRead = apply.slice(apply.indexOf("if (proposal.kind === 'lead_read')"));
    const block = leadRead.slice(0, leadRead.indexOf('return { changed'));
    expect(block).toContain('this.addLeadContext(groundId, requestingUserId,');
    expect(block).toContain("audience: 'LEAD_ONLY'");
  });
});
