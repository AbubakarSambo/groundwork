import { readFileSync } from 'fs';
import { join } from 'path';
import { theContextWeHave, WHAT_A_DOCUMENT_HOLDS_PROMPT, aSentence } from './what-a-document-holds';
import { ONE_READ } from './what-a-document-says';

const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const DOCS = strip(readFileSync(join(__dirname, 'documents.service.ts'), 'utf8'));
const CONVO = strip(readFileSync(join(__dirname, '..', 'conversation', 'conversation.service.ts'), 'utf8'));

/**
 * "We need the best document reader ever, and once read, the conversation should go into the chat as
 * here is the context we have. Also the context tab, as well as the reports and board. It can pull
 * the targets." (Hafsah, 22 Sep 2026.)
 */
describe('what a document holds', () => {
  const held = {
    fileName: 'Sales team Q3 2026.xlsx',
    whatItIs: 'A quarterly sales target sheet, by rep.',
    forOnePerson: [
      { who: 'Dayo Adebayo', what: 'Q3 sales', target: 45_000_000, by: null },
      { who: 'Chika Nwosu', what: 'new dealers signed', target: 12, by: 'end of Q3' },
    ],
    forEverybody: [
      { what: 'Team sales', target: 153_000_000, kind: 'to reach', by: null },
      { what: 'Credit ceiling', target: 35, kind: 'not to exceed', by: null },
    ],
    dates: [{ what: 'Quarter ends', when: '30 September' }],
    unmatched: ['Musa Bello'],
  };

  it('says what we have, whose each number is, and which are the whole check-in’s, each as a plain sentence', () => {
    const said = theContextWeHave(held)!;
    /*
     * UPDATED (30 Sep 2026, the fragment fault): `whatItIs` used to be appended as the model wrote it,
     * so a bare noun phrase read as a second, clipped sentence straight after the first ("... A
     * quarterly sales target sheet, by rep."). `aSentence` now turns a phrase with no verb of its own
     * into a full sentence in the product's voice - see what-a-document-holds.ts.
     */
    expect(said.startsWith('Here is what I took from Sales team Q3 2026.xlsx. It looks like a quarterly sales target sheet, by rep.')).toBe(true);
    expect(said).toContain('For everyone in this check-in, the target for Team sales is 153m.');
    /* Changed (B-014): the limit's name opens the sentence, so its capital is never mid-sentence. */
    expect(said).toContain('Credit ceiling must stay at or under 35 for everyone in this check-in.');
    expect(said).toContain("Dayo Adebayo's target for Q3 sales is 45m.");
    expect(said).toContain("Chika Nwosu's target for new dealers signed is 12 by end of Q3.");
    expect(said).toContain('The date it sets for Quarter ends is 30 September.');
    expect(said).toContain('One name in it, Musa Bello, is not on this check-in. Add them, and their numbers will go on too.');
  });

  it('never a heading with a colon, a line that starts with a dash, or "by" said twice (request 40)', () => {
    const said = theContextWeHave({ ...held, forOnePerson: [{ who: 'Amani Wekesa', what: 'cookers delivered', target: 3, by: 'by 9 October' }], unmatched: ['Musa Bello', 'Ada Obi'] })!;
    expect(said).toContain("Amani Wekesa's target for cookers delivered is 3 by 9 October.");
    expect(said).not.toMatch(/by by/);
    expect(said).not.toMatch(/:\s*$|:\n|^- /m);
    expect(said).toContain('2 names in it are not on this check-in. They are Musa Bello and Ada Obi.');
  });

  it('asks whether that is right in the chat, and states it on a page', () => {
    expect(theContextWeHave(held, { asking: true })!.trimEnd().endsWith('Is that right?')).toBe(true);
    expect(theContextWeHave(held)).not.toContain('Is that right?');
  });

  it('turns whatItIs into a full sentence, never the model\'s fragment on its own (the fragment fault, 30 Sep 2026)', () => {
    /* A bare noun phrase gets a verb, in the product's voice. */
    expect(aSentence('A Q4 sales target sheet')).toBe('It looks like a Q4 sales target sheet.');
    expect(aSentence('A Q4 sales target sheet.')).toBe('It looks like a Q4 sales target sheet.');
    expect(aSentence('Quarterly sales target sheet, by rep')).toBe('It looks like quarterly sales target sheet, by rep.');
    /* A word that is a verb elsewhere but a noun here ("a price list") is not mistaken for one. */
    expect(aSentence('A price list for the 600L cookers')).toBe('It looks like a price list for the 600L cookers.');
    /* A phrase that already has a verb is kept exactly as it is, only with its full stop made certain. */
    expect(aSentence('This sheet sets the Q4 targets for each dealer.')).toBe('This sheet sets the Q4 targets for each dealer.');
    expect(aSentence('This sheet sets the Q4 targets for each dealer')).toBe('This sheet sets the Q4 targets for each dealer.');
    /* Empty or missing stays empty: no sentence is better than an invented one. */
    expect(aSentence('')).toBeNull();
    expect(aSentence('   ')).toBeNull();
    expect(aSentence(null)).toBeNull();
    expect(aSentence(undefined)).toBeNull();
    /* Trailing punctuation, however it arrives, ends up as one full stop. */
    expect(aSentence('A price list for the 600L cookers...')).toBe('It looks like a price list for the 600L cookers.');
    expect(aSentence('A price list for the 600L cookers;')).toBe('It looks like a price list for the 600L cookers.');
  });

  it('and says nothing about a document that holds nothing', () => {
    expect(theContextWeHave({ fileName: 'notes.docx', forOnePerson: [], forEverybody: [], dates: [], unmatched: [] })).toBeNull();
  });

  it('the prompt takes targets and leaves progress, totals rows and month splits alone', () => {
    expect(WHAT_A_DOCUMENT_HOLDS_PROMPT).toContain('TOTAL, SUM, TEAM or ALL is not a person');
    expect(WHAT_A_DOCUMENT_HOLDS_PROMPT).toContain('A column of progress so far, a percentage complete, or last year');
    expect(WHAT_A_DOCUMENT_HOLDS_PROMPT).toContain('take the total only');
    expect(WHAT_A_DOCUMENT_HOLDS_PROMPT).toContain('an empty answer is a correct answer');
    /* Its own number is gone: it reads one read, the number every reader of a document shares (22 November 2026). */
    expect(ONE_READ).toBeGreaterThanOrEqual(60_000);
  });

  it('is read once, on every path a file arrives by - and never while somebody waits', () => {
    /*
     * Both paths read it, and neither awaits it any more. Measured 23 September 2026: an upload took
     * 20.2 seconds to answer, 10ms of which was the file. The row is written, the person is answered,
     * and the read lands on the row - see readTheRestOfIt.
     */
    /* Two call sites - the chat's upload and an invite-link upload - plus the method itself,
       which the comment-stripped source does not count twice. */
    expect(DOCS.match(/this\.readTheRestOfIt\(/g)).toHaveLength(2);
    expect(DOCS).not.toMatch(/await this\.whatItHolds\(/);
    /* Only the lead may set somebody else's number; a participant's file is read for their own rows and the group's. */
    expect(DOCS).toContain('(isLead || p.id === participantId)');
    /* A name that matches nobody is carried back, never guessed onto the nearest person. */
    /* A colleague's name in a participant's own file is left out as the lead's to set (week 14); any other name is carried back. */
    expect(DOCS).toContain('if (!isLead && whoThisNameIs(name, onTheCheckIn as any)) { if (!notTheirsToSet.includes(name)) notTheirsToSet.push(name); continue; }');
    expect(DOCS).toContain('if (!unmatched.includes(name)) unmatched.push(name);');
    /* A number already on the board is never overwritten from here. */
    expect(DOCS).toContain("held.has(`${who.id}::${name.toLowerCase()}`)");
    expect(DOCS).toContain('await this.prisma.groundDocument.update({ where: { id: docId }, data: { holds: landed as any } })');
  });

  it('and every surface reads the same stored answer', () => {
    /* The card, so the Context tab says what the chat said. */
    /* Now with who is reading, so a person's own number reads "Your target" (request 92, point 7). */
    expect(DOCS).toContain('theContextWeHave: doc.holds ? theContextWeHave(doc.holds as any, { reader: { participantId: viewerParticipantId } }) : null');
    expect(DOCS.match(/holds: true/g)!.length).toBeGreaterThanOrEqual(3);
    /* The chat, once: stamped as the words go out. */
    expect(CONVO).toContain('data: { holdsSaidAt: new Date() }');
    expect(CONVO).toContain('holdsSaidAt: null');
    /* In front of the opener, in front of an ordinary reply, and in front of the stream. */
    expect(CONVO.match(/theContextNotYetSaid\(/g)!.length).toBeGreaterThanOrEqual(4);
  });
});

/** One name-matching rule, in one place: two copies is two answers to "is this Dayo". */
describe('who a name in a document is', () => {
  const { whoThisNameIs, theNameWeUseFor } = require('./what-a-document-holds');
  const dayo = { id: 'p1', email: 'dayo.adebayo@x.test', user: { firstName: 'Dayo', lastName: 'Adebayo' } };
  const chika = { id: 'p2', email: 'chika@x.test', user: { firstName: 'Chika', lastName: 'Nwosu' } };
  const openLink = { id: 'p3', email: 'open-abc@unclaimed.invalid', nameGiven: 'Sade Ogunleye', user: null };
  const byRole = { id: 'p4', email: 'x@y.test', roleAsDescribed: 'Head of Logistics', user: null };
  const people = [dayo, chika, openLink, byRole];

  it('matches a full name, a first name, the name they gave, the address and the role', () => {
    expect(whoThisNameIs('Dayo Adebayo', people)?.id).toBe('p1');
    expect(whoThisNameIs('  dayo  ', people)?.id).toBe('p1');
    expect(whoThisNameIs('dayo.adebayo', people)?.id).toBe('p1');
    expect(whoThisNameIs('Sade Ogunleye', people)?.id).toBe('p3');
    expect(whoThisNameIs('head of logistics', people)?.id).toBe('p4');
    expect(whoThisNameIs('Musa Bello', people)).toBeNull();
    expect(whoThisNameIs('', people)).toBeNull();
  });

  it('and a first name two people share matches neither, because the wrong person is worse than nobody', () => {
    const twoDayos = [dayo, { id: 'p9', email: 'dayo.k@x.test', user: { firstName: 'Dayo', lastName: 'Kalu' } }];
    expect(whoThisNameIs('Dayo', twoDayos)).toBeNull();
    expect(whoThisNameIs('Dayo Adebayo', twoDayos)?.id).toBe('p1');
  });

  it('matches the first name of a person added by name who has not opened the invitation yet', () => {
    const amani = { id: 'p5', email: 'amani.wekesa@x.test', nameGiven: 'Amani Wekesa', user: null };
    expect(whoThisNameIs('Amani', [dayo, amani])?.id).toBe('p5');
    /* and still not when two people share it */
    expect(whoThisNameIs('Amani', [amani, { id: 'p6', email: 'a.k@x.test', nameGiven: 'Amani Kalu', user: null }])).toBeNull();
  });

  it('names somebody back by their own name, the one they gave, else their address', () => {
    expect(theNameWeUseFor(dayo)).toBe('Dayo Adebayo');
    expect(theNameWeUseFor(openLink)).toBe('Sade Ogunleye');
    expect(theNameWeUseFor(byRole)).toBe('x@y.test');
  });
});

/** "Add them and their numbers go on too" - a promise nothing kept until the retry existed. */
describe('the numbers waiting for a name to arrive', () => {
  it('are retried against the roster as it now is, and only by the lead', () => {
    const fn = CONVO.slice(CONVO.indexOf('private async whatTheNewPeopleClaim('), CONVO.indexOf('private async theContextNotYetSaid('));
    expect(fn).toContain('if (!isLead) return null;');
    expect(fn).toContain('whoThisNameIs(name, people as any)');
    expect(fn).toContain('await this.putOwnedTargetsOnTheRecord(');
    /* A name that lands comes off the list, so it is not offered twice. */
    expect(fn).toContain('data: { holds: { ...holds, unmatched: stillWaiting } as any }');
    expect(CONVO).toContain('const nowMatched = await this.whatTheNewPeopleClaim(');
  });
});

describe('a first name finds somebody invited by address alone (found in the browser journeys)', () => {
  const { whoThisNameIs } = require('./what-a-document-holds');
  const invited = (email: string, id = email) => ({ id, email, nameGiven: null, user: null, roleAsDescribed: null, managingOnly: false } as any);
  it('"Amani" is Amani Wekesa when her address is amani.wekesa@..., and only one Amani is on the check-in', () => {
    const people = [invited('amani.wekesa@kito.test'), invited('baraka.mutua@kito.test')];
    expect(whoThisNameIs('Amani', people)?.email).toBe('amani.wekesa@kito.test');
    expect(whoThisNameIs('Baraka', people)?.email).toBe('baraka.mutua@kito.test');
  });
  it('two people sharing a first name match neither', () => {
    const two = [invited('amani.wekesa@kito.test'), invited('amani.bello@kito.test')];
    expect(whoThisNameIs('Amani', two)).toBeNull();
  });
});

describe('an action and a name, said properly (26 October 2026)', () => {
  const { aSentence } = require('./what-a-document-holds');
  it('"Hold this as a record" is something Groundwork will do, not a guess', () => {
    expect(aSentence('Hold this as a record of the transaction between the two parties')).toBe('I will hold this as a record of the transaction between the two parties.');
    expect(aSentence('use this to establish the cost of van hire')).toBe('I will use this to establish the cost of van hire.');
  });
  it('a company name keeps its capital', () => {
    expect(aSentence('Drop Access Ltd hired a delivery van from Kisumu Motors Ltd for 3 days')).toBe('It looks like Drop Access Ltd hired a delivery van from Kisumu Motors Ltd for 3 days.');
  });
  it('a fragment is still a guess, as before', () => {
    expect(aSentence('A price list for the 600L cookers')).toBe('It looks like a price list for the 600L cookers.');
  });
});
