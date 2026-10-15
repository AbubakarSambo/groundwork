import { PartyType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { aNameInTheirWordsIsTheLabel } from './a-name-in-their-words-is-the-label';
import { labelsForParties, namesVisibleTo, readsWithNamesOf, viewerLabelOf, withNames, displayName } from './party-labels';

/**
 * THE DRIFT SCENARIO, END TO END: WHAT ZAINAB SAID, WHAT THE MODEL READS, WHAT EACH PERSON READS.
 *
 * Run fix6-1, drift. The lead is Nadia Haddad. Zainab said "as requested by Nadia", the models were
 * told about "the initiator" and never that she is Nadia, and the lead was served "Tell you that
 * Nadia has redirected Zainab" - about herself. See a-name-in-their-words-is-the-label.ts.
 *
 * These tests go through the same serve step the report read uses (readsWithNamesOf, namesVisibleTo,
 * viewerLabelOf, withNames, in that order, as applyNames calls them), so what is checked is what a
 * person reads, not only what the new function returns.
 */

const nadia = { id: 'p-nadia', partyType: PartyType.INITIATOR, createdAt: new Date('2026-03-01'), user: { firstName: 'Nadia', lastName: 'Haddad' } };
const zainab = { id: 'p-zainab', partyType: PartyType.PARTICIPANT, createdAt: new Date('2026-03-02'), user: { firstName: 'Zainab', lastName: 'Okafor' } };
const omar = { id: 'p-omar', partyType: PartyType.PARTICIPANT, createdAt: new Date('2026-03-03'), user: { firstName: 'Omar', lastName: 'Said' } };
const parties = [nadia, zainab, omar] as any[];
const labels = labelsForParties(parties);
/* Built the way reports.service builds it: displayName without the organisation, never the address. */
const people = parties.map((p) => ({ label: labels.get(p.id)!, name: displayName({ ...p, organisationGiven: null }, false) }));

/** What a reader is served, through the same steps as applyNames. */
function servedTo(viewerParticipantId: string, viewerIsLead: boolean, text: string, peersAreNamed = true): string {
  const asWhom = readsWithNamesOf({ viewerIsLead, viewerParticipantId, parties });
  const visible = namesVisibleTo(asWhom, parties, peersAreNamed);
  return withNames(text, visible, [...labels.values()], { viewerLabel: viewerLabelOf(asWhom, parties) });
}

const ZAINAB_SAID =
  "Since March 11th, I've been almost entirely focused on inbound sales support as requested by Nadia, which has meant no progress on the three partnerships.";

describe('a name in their words is the label', () => {
  it('the labels are the ones the report is stored with', () => {
    expect(labels.get('p-nadia')).toBe('the initiator');
    expect(labels.get('p-zainab')).toBe('Participant A');
  });

  it("Zainab's words reach the model with the lead as the lead, and nothing else changed", () => {
    expect(aNameInTheirWordsIsTheLabel(ZAINAB_SAID, people)).toBe(
      "Since March 11th, I've been almost entirely focused on inbound sales support as requested by the initiator, which has meant no progress on the three partnerships.",
    );
  });

  it('a sentence a model writes from it: the lead reads her own request as hers, and Zainab reads who asked', () => {
    /* A paraphrase, not a quote. A quote of Zainab's words is put back as she said it, "Nadia" and
       all, before anything is stored - see a-quote-is-what-they-said and the-quote-a-person-reads. */
    const written = 'Participant A has been focused on inbound sales support as requested by the initiator.';
    expect(servedTo('p-nadia', true, written)).toBe('Zainab Okafor has been focused on inbound sales support as requested by you.');
    expect(servedTo('p-zainab', false, written)).toBe('You have been focused on inbound sales support as requested by Nadia Haddad.');
  });

  it("a possessive: \"at Nadia's request\" is \"at your request\" for Nadia and her name for Zainab", () => {
    const labelled = aNameInTheirWordsIsTheLabel("I moved to sales at Nadia's request.", people);
    expect(labelled).toBe("I moved to sales at the initiator's request.");
    expect(servedTo('p-nadia', true, labelled)).toBe('I moved to sales at your request.');
    expect(servedTo('p-zainab', false, labelled)).toBe("I moved to sales at Nadia Haddad's request.");
  });

  it("the finding the run stored, written from labelled words, no longer has a stranger in it", () => {
    /* What the judgement wrote from raw words, and what the same sentence reads as once "Nadia" is the label. */
    const labelled = aNameInTheirWordsIsTheLabel('Tell Omar that Nadia has redirected Zainab to sales support.', people);
    expect(labelled).toBe('Tell Participant B that the initiator has redirected Participant A to sales support.');
    expect(servedTo('p-nadia', true, labelled)).toBe('Tell Omar Said that you have redirected Zainab Okafor to sales support.');
  });

  it('the full name first, so the surname does not hang off the label', () => {
    expect(aNameInTheirWordsIsTheLabel('Nadia Haddad asked me in March.', people)).toBe('The initiator asked me in March.');
  });

  it("the person's own name in their own words is swapped the same way", () => {
    expect(aNameInTheirWordsIsTheLabel('People here call me Zainab.', people)).toBe('People here call me Participant A.');
  });

  it('a first name two people share is left alone, and so is a surname on its own', () => {
    const twoNadias = [...people, { label: 'Participant C', name: 'Nadia Bello' }];
    expect(aNameInTheirWordsIsTheLabel('Nadia asked me, and Haddad agreed.', twoNadias)).toBe('Nadia asked me, and Haddad agreed.');
    /* The full names are still certain, so they still swap. */
    expect(aNameInTheirWordsIsTheLabel('Nadia Bello asked me.', twoNadias)).toBe('Participant C asked me.');
    expect(aNameInTheirWordsIsTheLabel('Haddad agreed.', people)).toBe('Haddad agreed.');
  });

  it('somebody who is not in this check-in keeps their name, and so does the CEO', () => {
    const said = "Victor's script was used, and the CEO signed it off.";
    expect(aNameInTheirWordsIsTheLabel(said, people)).toBe(said);
  });

  it('a whole word only, with its capital', () => {
    expect(aNameInTheirWordsIsTheLabel('Nadiana and nadia and Omari are not them.', people)).toBe('Nadiana and nadia and Omari are not them.');
  });

  it('a curly apostrophe is a possessive too, and comes out straight so it serves as "your"', () => {
    const labelled = aNameInTheirWordsIsTheLabel('At Nadia’s request.', people);
    expect(labelled).toBe("At the initiator's request.");
    expect(servedTo('p-nadia', true, labelled)).toBe('At your request.');
  });

  it('a peer whose name the reader may not see is not named to them by this', () => {
    /* Omar's name in Zainab's words, read by Zainab on a check-in that does not name peers. Before
       this change the raw "Omar" was in the text for any reader; now it is his label, and the serve
       step decides. */
    const labelled = aNameInTheirWordsIsTheLabel('Omar took the partnerships.', people);
    expect(servedTo('p-zainab', false, labelled, false)).not.toContain('Omar');
  });

  it('the report pipeline runs every record, and the judgement\'s own reads, through it', () => {
    const src = fs.readFileSync(path.join(__dirname, 'reports.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(src).toMatch(/const records = theRecordAsItIs\.map\(withTheDisputeAttached\)\s*\.map\(\(r\) => \(\{ \.\.\.r, text: aNameInTheirWordsIsTheLabel\(r\.text, namesInThisCheckIn\) \}\)\)/);
    /* And the quotes are put back from the record as it is, never from the labelled copy. */
    expect(src).toMatch(/theLinesAQuoteMayComeFrom\(\s*\[\s*\.\.\.\(theRecordAsItIs as any\[\]\)/);
    expect(src).toContain('.map((r) => theirWords(String(r.text ??');
    /* Changed with the judgement prompt work (25b2221f): an open promise now reaches the judgement as an action with its
       time, and both forms still go through theirWords. */
    expect(src).toContain('clause: theirWords(clause)');
    expect(src).toContain(': theirWords(String(c.text));');
    expect(src).toMatch(/leadName: \(parties as any\[\]\)[^\n]*\n\s*namesInThisCheckIn,/);
  });
});
