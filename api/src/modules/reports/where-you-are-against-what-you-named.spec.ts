import { RecordEntryType } from '@prisma/client';
import {
  whereYouAreAgainstWhatYouNamed,
  speaksTo,
  whatThisIsAbout,
} from './where-you-are-against-what-you-named';

const base = { counting: 'everyone' as const };
const entry = (type: RecordEntryType, text: string, who = 'Zainab') => ({ type, text, who });

describe('where you are against what you named', () => {
  it('says so plainly when nobody has answered the question at all', () => {
    const r = whereYouAreAgainstWhatYouNamed({ ...base, stated: null, version: null, conditions: [], entries: [] });
    expect(r.sides).toBe('nobody');
    expect(r.saying).toContain('Nobody has said what success looks like yet');
    expect(r.conditions).toEqual([]);
  });

  it('puts the lead\'s statement and each person\'s own definition on the same page', () => {
    const r = whereYouAreAgainstWhatYouNamed({ ...base,
      stated: 'Margaret is closing her own deals by the end of the quarter.',
      version: 2,
      conditions: [],
      entries: [
        entry(RecordEntryType.SUCCESS_DEFINITION, 'I know the product well enough to demo it alone.', 'Margaret'),
        entry(RecordEntryType.SUCCESS_DEFINITION, 'She is not asking me to sit in on calls.', 'Zainab'),
      ],
    });
    expect(r.sides).toBe('both');
    expect(r.saying).toBeNull();
    expect(r.definitions.map((d) => d.who)).toEqual(['Margaret', 'Zainab']);
    expect(r.stated).toContain('closing her own deals');
  });

  it('keeps every distinct standard a person named, because almost nobody names only one', () => {
    /* This used to keep the latest per person. On a real check-in the lead had given two standards
       in one session - a meetings number and the CRM being current - and only the second survived. */
    const r = whereYouAreAgainstWhatYouNamed({ ...base,
      stated: 'x', version: 1, conditions: [],
      entries: [
        entry(RecordEntryType.SUCCESS_DEFINITION, 'Fifteen qualified meetings a month by month three', 'Margaret'),
        entry(RecordEntryType.SUCCESS_DEFINITION, 'The CRM kept current every Friday', 'Margaret'),
      ],
    });
    expect(r.definitions.map((d) => d.text)).toEqual([
      'Fifteen qualified meetings a month by month three',
      'The CRM kept current every Friday',
    ]);
  });

  it('but does not print the same standard twice when somebody restates it', () => {
    const r = whereYouAreAgainstWhatYouNamed({ ...base,
      stated: 'x', version: 1, conditions: [],
      entries: [
        entry(RecordEntryType.SUCCESS_DEFINITION, 'The CRM kept current every Friday.', 'Margaret'),
        entry(RecordEntryType.SUCCESS_DEFINITION, 'the CRM kept current every Friday', 'Margaret'),
      ],
    });
    expect(r.definitions).toHaveLength(1);
  });

  describe('a condition takes the state the record can support, and no more', () => {
    const conditions = ['Pricing approval comes from finance without escalation'];

    it('moving, when somebody has committed to something that speaks to it', () => {
      const r = whereYouAreAgainstWhatYouNamed({ ...base,
        stated: 's', version: 1, conditions,
        entries: [entry(RecordEntryType.COMMITMENT, 'I will get pricing signed off by finance on Friday.')],
      });
      expect(r.conditions[0].state).toBe('moving');
      expect(r.conditions[0].why).toContain('signed off by finance');
      expect(r.conditions[0].who).toBe('Zainab');
    });

    it('stuck, and the worry wins over the commitment', () => {
      const r = whereYouAreAgainstWhatYouNamed({ ...base,
        stated: 's', version: 1, conditions,
        entries: [
          entry(RecordEntryType.COMMITMENT, 'I will get pricing signed off by finance on Friday.'),
          entry(RecordEntryType.WORRY, 'Finance keeps sending pricing back up the chain.'),
        ],
      });
      expect(r.conditions[0].state).toBe('stuck');
      expect(r.conditions[0].why).toContain('back up the chain');
    });

    it('unspoken, which is the finding nothing else was making', () => {
      const r = whereYouAreAgainstWhatYouNamed({ ...base,
        stated: 's', version: 1, conditions,
        entries: [entry(RecordEntryType.COMMITMENT, 'I will rewrite the onboarding email.')],
      });
      expect(r.conditions[0].state).toBe('unspoken');
      expect(r.conditions[0].why).toBeNull();
      expect(r.spokenTo).toEqual({ count: 0, of: 1 });
    });

    it('never says met, however much the record contains', () => {
      const r = whereYouAreAgainstWhatYouNamed({ ...base,
        stated: 's', version: 1, conditions,
        entries: [entry(RecordEntryType.COMMITMENT, 'Finance approved the pricing yesterday.')],
      });
      expect(['moving', 'stuck', 'unspoken']).toContain(r.conditions[0].state);
    });
  });

  it('counts what has been spoken to at all, which is the number no surface was showing', () => {
    const r = whereYouAreAgainstWhatYouNamed({ ...base,
      stated: 's', version: 1,
      conditions: ['Pricing approved by finance', 'Territory handover from Daniel', 'Two references live'],
      entries: [entry(RecordEntryType.COMMITMENT, 'Daniel is walking me through the territory handover.')],
    });
    expect(r.spokenTo).toEqual({ count: 1, of: 3 });
  });

  describe('the matching is careful enough to be worth showing', () => {
    it('needs two subject words, so one shared noun does not attach everything to everything', () => {
      expect(speaksTo('Pricing approved by finance', 'The pricing page needs a rewrite')).toBe(false);
      expect(speaksTo('Pricing approved by finance', 'Finance have approved the new pricing')).toBe(true);
    });

    it('ignores words that carry no subject, so two stopwords are not a match', () => {
      expect(speaksTo('This should be done', 'That should be there')).toBe(false);
    });

    it('keeps acronyms, which are short because they are the most specific word there is', () => {
      /* Found on a real check-in: a condition about the CRM and a worry about the CRM did not
         match, because CRM is three letters, and the condition then read "nobody has spoken to
         it" about somebody who plainly had. */
      expect(whatThisIsAbout('The CRM kept current every Friday').has('crm')).toBe(true);
      expect(speaksTo('The CRM kept current every Friday', 'The CRM is not being kept current')).toBe(true);
      expect(whatThisIsAbout('Ship the API docs').has('api')).toBe(true);
    });

    it('keeps numbers, because a target is usually written as digits', () => {
      expect(whatThisIsAbout('15 qualified meetings a month').has('15')).toBe(true);
      expect(speaksTo('15 qualified meetings a month', 'She booked 15 meetings last month')).toBe(true);
    });

    it('a condition of nothing but stopwords matches nothing rather than everything', () => {
      expect(whatThisIsAbout('this should be there').size).toBe(0);
      expect(speaksTo('this should be there', 'anything at all really')).toBe(false);
    });
  });

  it('says whose accounts it was allowed to see, so "unspoken" cannot become a lie', () => {
    /* Caught on Zainab's own record: as a party before release she may read her own entries and
       nobody else's, so every condition came back "unspoken" while the lead had spoken to two of
       them. The read now carries what it was allowed to look at, and the page words it from that. */
    const asAParty = whereYouAreAgainstWhatYouNamed({
      counting: 'only-yours', stated: 's', version: 1,
      conditions: ['The CRM kept current every Friday'], entries: [],
    });
    expect(asAParty.counting).toBe('only-yours');
    expect(asAParty.conditions[0].state).toBe('unspoken');
    const asTheLead = whereYouAreAgainstWhatYouNamed({
      ...base, stated: 's', version: 1, conditions: ['The CRM kept current every Friday'], entries: [],
    });
    expect(asTheLead.counting).toBe('everyone');
  });

  it("carries a null name through as the reader's own, rather than printing Somebody at them", () => {
    /* The session report answers null for your own entries by design - your own report does not
       attribute your own lines back at you. Turned into "Somebody" it read as an unknown person;
       seen on the lead's own report while the board said his name for the same rows. */
    const r = whereYouAreAgainstWhatYouNamed({ ...base,
      stated: 'x', version: 1, conditions: [],
      entries: [{ type: RecordEntryType.SUCCESS_DEFINITION, text: 'Fifteen meetings a month', who: null }],
    });
    expect(r.definitions).toEqual([{ who: null, text: 'Fifteen meetings a month' }]);
  });

  it('does not tell a lead they have not stated it when they have said it in their check-in', () => {
    /* Seen on a real cohort board after twelve sessions: "The person running this has not stated
       theirs, so there is nothing to read them against" - directly above "Tunde Alabi - What I want
       by the end of the quarter is each of them at eight closed deals", which he had said every
       week for twelve weeks. True about the Setup field, false about the man, and the list
       underneath it proved so. */
    const said = whereYouAreAgainstWhatYouNamed({ ...base,
      stated: null, version: null, conditions: [], leadHasSaidIt: true,
      entries: [entry(RecordEntryType.SUCCESS_DEFINITION, 'Each of them at eight closed deals.', 'Tunde')],
    });
    expect(said.saying).toContain('has said what success looks like in their own check-in');
    expect(said.saying).not.toContain('has not stated theirs');
    /* And where the lead genuinely has not, the original sentence stands. */
    const notSaid = whereYouAreAgainstWhatYouNamed({ ...base,
      stated: null, version: null, conditions: [], leadHasSaidIt: false,
      entries: [entry(RecordEntryType.SUCCESS_DEFINITION, 'Getting to quota.', 'Kwame')],
    });
    expect(notSaid.saying).toContain('has not stated theirs');
  });

  it('names which sides have answered, and never judges whether they agree', () => {
    const onlyLead = whereYouAreAgainstWhatYouNamed({ ...base, stated: 'x', version: 1, conditions: [], entries: [] });
    expect(onlyLead.sides).toBe('only-the-lead');
    const onlyParties = whereYouAreAgainstWhatYouNamed({ ...base,
      stated: null, version: null, conditions: [],
      entries: [entry(RecordEntryType.SUCCESS_DEFINITION, 'Getting to quota.')],
    });
    expect(onlyParties.sides).toBe('only-the-parties');
    /* The shape has no field for a verdict: the report's own engine decides what agrees and what
       diverges, and a second answer from word overlap would be the worse of two. */
    expect(Object.keys(onlyLead)).not.toContain('agreement');
    expect(Object.keys(onlyLead)).not.toContain('score');
  });
});
