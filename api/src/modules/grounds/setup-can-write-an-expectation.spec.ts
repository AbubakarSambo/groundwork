import { proposalFrom, extractionToolFor, confirmedSay } from './what-the-context-chat-heard';
import { whoTheyMeant } from './who-they-meant';
import { withoutFraming, verbatimQuote, verbatimExpectation } from './what-setup-agreed';
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

  /*
   * FOUND LIVE, 30 September 2026, on the four live checks: this used to pin the fault -
   * "It goes down as YOUR expectation... and marked as not yet seen by them" - a colon-joined
   * sentence, capitals for emphasis, and "them" for a person named two words earlier. It is a
   * question now, in plain sentences, with Dele's own first name in place of "them".
   */
  it('asks whether to record it as the lead\'s expectation and not agreement, using the person\'s first name', () => {
    const p = proposalFrom('objectives', {
      expectationPerson: 'Dele', expectationText: 'Own the renewals for the twelve quiet accounts',
    }, PARTIES) as any;
    expect(p.say).toBe(
      'Shall I record "Own the renewals for the twelve quiet accounts" as what you expect of Dele? '
      + 'It is kept as your expectation, not as something Dele agreed to, and Dele has not seen it yet.',
    );
    expect(p.say).not.toContain(':');
    expect(p.say).not.toContain('YOUR');
    expect(p.say).not.toContain('them');
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
    /* Dele's first name, how the rest of the product names somebody in a sentence - not the fuller
       "Dele Okonkwo" form `label` still carries for telling two Deles apart. */
    expect((p as any).say).toContain('private note about Dele');
    expect((p as any).say).not.toContain('Dele Okonkwo');
    expect((p as any).say).toContain('never quoted');
  });

  /*
   * FIX (found live, the four live checks, 30 September 2026, item 10). Driven live, the exact
   * sentence: "Ben is struggling and honestly he is difficult to work with." The private note that
   * was said back and saved read "is struggling" - a bare verb, no subject, meaningless read on its
   * own - because the extractor's candidate started on the verb and the quote was located from
   * there. It is a readable phrase now: "Ben is struggling", the person's name pulled in from the
   * lead's own sentence because that sentence starts with it, still a literal substring of what the
   * lead typed, identical in the say-back and in what would be saved. And "their own check-in" -
   * which named nobody - is now Ben's own check-in, by his first name.
   */
  it('a lead_read quote reads as a phrase, with the person\'s name, not a clipped verb - the exact live sentence', () => {
    const PARTIES_WITH_BEN = [...PARTIES, { id: 'p3', email: 'ben@acme.test', name: 'Ben Okafor' }];
    const said = 'Ben is struggling and honestly he is difficult to work with.';
    const p = proposalFrom('objectives', { expectationPerson: 'Ben', expectationText: 'is struggling' }, PARTIES_WITH_BEN, said) as any;
    expect(p.kind).toBe('lead_read');
    expect(p.text).toBe('Ben is struggling');
    expect(p.text).not.toMatch(/^is /);
    /* A literal substring of what the lead typed. */
    expect(said).toContain(p.text);
    expect(p.say).toBe(
      'Shall I keep "Ben is struggling" as a private note about Ben that only you can see? '
      + "It guides how this check-in is run and is never quoted to Ben or put into Ben's own check-in.",
    );
    expect(p.say).not.toContain('their own check-in');
    /* Say-back and saved text are the same string. */
    expect(p.say).toContain(`"${p.text}"`);
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

/*
 * FIX 5, 30 September 2026 (inventory item 11's say-back). Driven live: propose's own sentence quoted
 * "want the update in by every Friday" - a fragment clipped mid-clause - while confirm's independent
 * extraction (a second model call) read "the update in by every Friday". `proposalFrom` now strips the
 * lead's framing deterministically in code, so both calls converge on the same text far more often
 * than leaving each one to decide on its own where the sentence starts.
 */
describe('the say-back quote never starts with a clipped verb fragment (FIX 5)', () => {
  it('the exact exchange the fix names: "I want the update in by every Friday" is quoted from its own start', () => {
    const p = proposalFrom('objectives', {
      expectationPerson: 'Dele',
      expectationText: 'I want the update in by every Friday',
    }, PARTIES) as any;
    expect(p.kind).toBe('expectation');
    expect(p.text).toBe('the update in by every Friday');
    expect(p.say).toContain('"the update in by every Friday"');
    expect(p.say).not.toContain('want the update in by every Friday');
  });

  /*
   * REGRESSION, found live again, 30 September 2026, on the four live checks: passing `said` - the
   * lead's actual sentence - is what makes propose and confirm converge even when the model has
   * already half-trimmed its own candidate to "want the update..." ("I " gone, "want" left). Without
   * `said` neither call has the lead's own sentence to anchor against, so this now exercises the real
   * path both `contextChat` and `applyContextProposal` use - see verbatimExpectation.
   */
  it('propose and confirm converge on the same text even when the model has already half-trimmed it', () => {
    const said = 'I want the update in by every Friday.';
    /* The model's two calls do not always agree on how much framing it already stripped - this is
       the point: whatever each one hands in, the deterministic strip lands on the same value, because
       both are anchored to the lead's own sentence and its own framing, not to whichever candidate a
       model call happened to return. */
    const propose = proposalFrom('objectives', { expectationPerson: 'Dele', expectationText: 'I want the update in by every Friday' }, PARTIES, said) as any;
    const confirm = proposalFrom('objectives', { expectationPerson: 'Dele', expectationText: 'want the update in by every Friday' }, PARTIES, said) as any;
    expect(propose.text).toBe('the update in by every Friday');
    expect(confirm.text).toBe('the update in by every Friday');
    expect(confirm.text).toBe(propose.text);
  });

  it('withoutFraming keeps the lead\'s own case, unlike the internal thin-check which lowercases', () => {
    expect(withoutFraming('I want The Update In By Every Friday')).toBe('The Update In By Every Friday');
  });

  /*
   * verbatimExpectation ITSELF: the quote starts after the lead's own framing in `said`, whatever the
   * candidate already had stripped off it.
   */
  it('verbatimExpectation: a candidate that still has "want" left over from the framing is pulled forward past it', () => {
    expect(verbatimExpectation('want the update in by every Friday', 'I want the update in by every Friday.'))
      .toBe('the update in by every Friday');
    /* A candidate that already starts after the framing is untouched. */
    expect(verbatimExpectation('the update in by every Friday', 'I want the update in by every Friday.'))
      .toBe('the update in by every Friday');
    /* A candidate that still has the whole framing on it is stripped in full, same as before. */
    expect(verbatimExpectation('I want the update in by every Friday', 'I want the update in by every Friday.'))
      .toBe('the update in by every Friday');
    /* "They should" framing, not just "I want". */
    expect(verbatimExpectation('should close 3 renewals by December', 'they should close 3 renewals by December.'))
      .toBe('close 3 renewals by December');
  });
});

/*
 * FOUND LIVE AGAIN, 30 September 2026, on the four live checks: fix 5 above converges the FRAMING
 * strip, but not a trailing full stop the confirm call alone added, nor a first letter the confirm
 * call alone lower-cased - both left the saved text different from the text the lead had already
 * been shown and said yes to.
 *
 *   said back: "the update in by every Friday"          saved: "the update in by every Friday."
 *   said back: "Every pipeline stage has an owner ..."   saved: "every pipeline stage ..."
 *
 * The fix locks the quoted text to the LITERAL characters of the lead's own sentence (`said`, now
 * threaded through into `proposalFrom`), so whatever either call's own wording happens to be, both
 * land on the identical substring of what the lead actually typed.
 */
describe('what is saved is exactly what was said back, character for character (found live again)', () => {
  it('the exact exchange the fix names: a full stop the confirm call alone added is never saved', () => {
    const said = 'He has missed the last two pipeline updates. I spoke to him once. I want the update in by every Friday.';
    const propose = proposalFrom('objectives', { expectationPerson: 'Dele', expectationText: 'the update in by every Friday' }, PARTIES, said) as any;
    /* confirm's own extraction added a full stop the lead never typed. */
    const confirm = proposalFrom('objectives', { expectationPerson: 'Dele', expectationText: 'the update in by every Friday.' }, PARTIES, said) as any;
    expect(propose.text).toBe('the update in by every Friday');
    expect(confirm.text).toBe('the update in by every Friday');
    expect(confirm.text).toBe(propose.text);
  });

  it('the exact exchange the fix names: a capital letter the confirm call alone dropped is never saved either', () => {
    const said = 'Good means every pipeline stage has an owner and nothing sits unowned for more than two days.';
    const propose = proposalFrom('success', { success: 'Every pipeline stage has an owner and nothing sits unowned for more than two days' }, PARTIES, said) as any;
    /* confirm's own extraction lower-cased the first letter, the same words otherwise. */
    const confirm = proposalFrom('success', { success: 'every pipeline stage has an owner and nothing sits unowned for more than two days' }, PARTIES, said) as any;
    expect(propose.text).toBe('every pipeline stage has an owner and nothing sits unowned for more than two days');
    expect(confirm.text).toBe(propose.text);
    /* And what is shown as said back quotes the very same string that gets saved. */
    expect(propose.say).toContain(`"${propose.text}"`);
  });

  it('a genuine paraphrase, not a substring of what they typed, still falls back to the trimmed candidate', () => {
    const p = proposalFrom('success', { success: 'Every stage owned, nothing stale' }, PARTIES, 'Good means each stage has somebody on it and the board never goes stale.') as any;
    expect(p.text).toBe('Every stage owned, nothing stale');
  });

  /*
   * FOUND LIVE, 30 September 2026, on the four live checks: after a lead said yes to a lead_read
   * proposal, the confirmation answer repeated the QUESTION -
   *   Shall I keep "should be more proactive" as a private note about Ben Okafor that only you can
   *   see? It guides how this check-in is run and is never quoted to Ben Okafor or put into their
   *   own check-in.
   * - rather than saying it had been done. `confirmedSay` is what `applyContextProposal` now returns
   * on every write instead of the propose-worded `proposal.say`.
   *
   * FOUND LIVE AGAIN, 30 September 2026: the full name "Ben Okafor" is now Ben's first name, how the
   * rest of the product names somebody in a sentence a person reads.
   */
  /*
   * UPDATED, found live again on the four live checks, 30 September 2026, item 10: "their own
   * check-in" named nobody - Ben's own check-in is Ben's, not "theirs". This test's expected string
   * is changed to match; the behaviour it checks (a past-tense statement, never the question again,
   * never the full name) is unchanged.
   */
  it('confirmedSay: a lead_read write says it was kept, not the question that was already answered', () => {
    const p = { kind: 'lead_read' as const, participantId: 'p1', personLabel: 'Ben Okafor', firstName: 'Ben', text: 'should be more proactive', say: 'unused' };
    expect(confirmedSay(p)).toBe(
      'I have kept "should be more proactive" as a private note about Ben that only you can see. '
      + "It guides how this check-in is run and is never quoted to Ben or put into Ben's own check-in.",
    );
    expect(confirmedSay(p)).not.toContain('Shall I');
    expect(confirmedSay(p)).not.toContain('Ben Okafor');
    expect(confirmedSay(p)).not.toContain('their own check-in');
  });

  /*
   * FOUND LIVE, 30 September 2026, on the four live checks: a colon joining "what you expect of
   * [name]" to the quote, capitals for emphasis ("YOUR"), and "them" for a person named two words
   * earlier.
   */
  it('confirmedSay: an expectation write says it was recorded, not "I will", in plain sentences with no colon', () => {
    const p = { kind: 'expectation' as const, participantId: 'p1', personLabel: 'Ben Okafor', firstName: 'Ben', text: 'close 3 renewals by the end of December', say: 'unused' };
    const said = confirmedSay(p);
    expect(said).toBe(
      'I have recorded "close 3 renewals by the end of December" as what you expect of Ben. '
      + 'It is kept as your expectation, not as something Ben agreed to, and Ben has not seen it yet.',
    );
    expect(said).not.toMatch(/^I will/);
    expect(said).not.toContain(':');
    expect(said).not.toContain('YOUR');
    expect(said).not.toContain('them');
  });

  it('confirmedSay: a timeline write says it was set, matching propose\'s own weeks-or-days choice', () => {
    expect(confirmedSay({ kind: 'timeline' as const, days: 84, say: 'unused' })).toBe('I have set this to run for 12 weeks.');
    expect(confirmedSay({ kind: 'timeline' as const, days: 90, say: 'unused' })).toBe('I have set this to run for 90 days.');
  });

  /*
   * FOUND LIVE AGAIN, 30 September 2026, on the four live checks: this used to assert the colon-
   * joined form - `I have recorded that as what doing well looks like: "..."` - two clauses glued
   * together rather than a sentence, exactly the shape CLAUDE.md's wording rule refuses ("no pieces
   * joined with colons"). The quote now sits inside the sentence as its own clause, matching every
   * other kind's confirmation here.
   */
  it('confirmedSay: a success write says it was recorded, quoting the same text that was saved, as one sentence with no colon', () => {
    const p = { kind: 'success' as const, text: 'every pipeline stage has an owner', say: 'unused' };
    expect(confirmedSay(p)).toBe('I have recorded "every pipeline stage has an owner" as what doing well looks like.');
    expect(confirmedSay(p)).not.toContain(':');
  });

  it('verbatimQuote itself: drops a trailing full stop the candidate had that the source does not need, and matches case from the source', () => {
    expect(verbatimQuote('the update in by every Friday.', 'I want the update in by every Friday.')).toBe('the update in by every Friday');
    expect(verbatimQuote('every pipeline stage has an owner', 'Good means every pipeline stage has an owner and nothing sits unowned.')).toBe('every pipeline stage has an owner');
    expect(verbatimQuote('EVERY PIPELINE STAGE', 'Good means every pipeline stage has an owner.')).toBe('every pipeline stage');
    /* Nothing typed at all: the trimmed candidate stands, so this is never a new way to refuse. */
    expect(verbatimQuote('a paraphrase', '')).toBe('a paraphrase');
    expect(verbatimQuote('', 'anything')).toBe('');
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
