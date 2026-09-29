import { whereEachPersonIs, type PersonRow } from './where-each-person-is-against-their-number';
import { theVerbAgreesWithYou } from '../reports/party-labels';

/**
 * REQUEST 65: "Ask Amani Wekesa to speak to Rukia Otieno rather than write to them." WAS READ BY RUKIA.
 *
 * The board's row about Amani, read by the lead, Rukia, where the thing Amani waits on is with her.
 * The row now says it is with "you", and the ask is hers to answer.
 */
const amani = (over: Partial<PersonRow> = {}): PersonRow => ({
  participantId: 'p-amani', who: 'Amani Wekesa', target: null, count: 0,
  answeredThisRound: true, roundsSoFar: 2, saidAnythingCheckable: true,
  inTheWay: [{ what: 'the signed price list', owner: 'Rukia Otieno', days: 3, tried: 'nothing', onTheReader: true }],
  ...over,
});

describe('What they wait on is with you', () => {
  it('Rukia reads that Amani is waiting on her, in the second person, and never her own name', () => {
    const [row] = whereEachPersonIs([amani()], null);
    expect(row.ask).toBe('Amani Wekesa has been waiting 3 days on you for the signed price list. Give Amani Wekesa an answer, or say when you will.');
    expect(`${row.says} ${row.ask}`).not.toMatch(/Rukia/);
  });

  it('and on the day it comes up, no "0 days"', () => {
    const [row] = whereEachPersonIs([amani({ inTheWay: [{ what: 'the signed price list', owner: 'Rukia Otieno', days: 0, tried: 'nothing', onTheReader: true }] })], null);
    expect(row.ask).toBe('Amani Wekesa is waiting on you for the signed price list. Give Amani Wekesa an answer, or say when you will.');
  });

  it('a fortnight on, the row itself says it is with you', () => {
    const [row] = whereEachPersonIs([amani({ inTheWay: [{ what: 'the signed price list', owner: 'Rukia Otieno', days: 15, tried: 'asked-once', onTheReader: true }] })], null);
    expect(row.says).toBe('Amani Wekesa has been waiting 15 days on you for the signed price list.');
    expect(row.ask).toBe('Give Amani Wekesa an answer, or say when you will.');
  });

  it('somebody else, not the reader, is still the one to speak to', () => {
    const [row] = whereEachPersonIs([amani({ inTheWay: [{ what: 'the price list', owner: 'Kofi', days: 5, tried: 'nothing' }] })], null);
    expect(row.ask).toBe('Amani Wekesa has been waiting 5 days on the price list, and nobody has said yet what was tried. Ask Amani Wekesa to speak to Kofi rather than write to them.');
  });
});

describe('"You assumes" and "until you sends it" (request 65, already fixed for request 33)', () => {
  it('reads in the second person with its verb agreeing', () => {
    expect(theVerbAgreesWithYou('You assumes the price holds until you sends it.')).toBe('You assume the price holds until you send it.');
  });
});

import { isThisACascade } from './is-this-a-cascade';

describe('cascade.teamsNamed never serves a word that is not a team (request 65)', () => {
  it('"the attached team plan" names no team; "the sales team" still does', () => {
    const read = isThisACascade({
      scenario: 'OKR_ALIGNMENT' as any,
      objectiveNames: [],
      importedWithParents: [],
      entries: [
        { participantId: 'p1', text: 'I followed the attached team plan for the week.' },
        { participantId: 'p2', text: 'The sales team and the warehouse team both count shops signed.' },
      ],
    });
    expect(read.teamsNamed).not.toContain('attached');
    expect(read.teamsNamed).toEqual(expect.arrayContaining(['sales', 'warehouse']));
  });
});
