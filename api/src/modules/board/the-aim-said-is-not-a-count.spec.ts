import { onlyWhatIsWorthOffering, whatToDoWithTheRead, theLineIsTheAim } from './what-the-record-says-a-number-is';

/**
 * REQUEST 65: "I want us to sign 12 shops by 20 December." WAS COUNTED "12 of 12" WITH 2 SIGNED.
 *
 * The lead's sentence setting the aim is on the record, holds the target's number, and a lead's
 * number on a target nobody has counted lands as the count. What the board then shows the lead is
 * `count` of `target`; this checks what reaches `count`.
 */
const target = { id: 'o1', name: 'Shops signed', target: 12, count: 0, prevCount: 0, ownerParticipantId: null } as any;
const lead = (text: string) => ({ text, who: 'p-lead', saidByTheLead: true });

describe('The aim, said, is not a count of it', () => {
  it('the lead stating the target does not make the board read 12 of 12', () => {
    const lines = [lead('I want us to sign 12 shops by 20 December.')];
    const worth = onlyWhatIsWorthOffering([{ objectiveId: 'o1', count: 12, said: 'I want us to sign 12 shops by 20 December.' } as any], [target], lines as any);
    expect(worth).toEqual([]);
  });

  it('the number that was actually reached still lands', () => {
    const lines = [lead('I want us to sign 12 shops by 20 December.'), lead('We have signed 2 shops so far.')];
    const read = { objectiveId: 'o1', count: 2, said: 'We have signed 2 shops so far.' } as any;
    const worth = onlyWhatIsWorthOffering([read], [target], lines as any);
    expect(worth).toEqual([read]);
    expect(whatToDoWithTheRead(read, target, lines as any)).toBe('land');
  });

  it('reaching the whole target, said as done, still counts', () => {
    expect(theLineIsTheAim(12, target, 'We have signed all 12 shops, as we aimed.')).toBe(false);
    expect(theLineIsTheAim(12, target, 'Our goal is 12 shops this quarter.')).toBe(true);
    expect(theLineIsTheAim(11, target, 'I want us to sign 11 more.')).toBe(false);
  });

  /*
   * REQUESTS 109 (a) AND 111 (b), the sales board, 2 October 2026: "Rukia Otieno wants us to sign 12 shops
   * by 20 December. 12 now, up from 0. The aim is 12. Up 12 this session.", with two shops signed (Tuskys
   * Westgate and Karen Hardware). The lead's line, as the board quoted it back: "Twelve signed supply
   * contracts ... and I want us to sign 12 shops." "signed" there describes the contracts.
   */
  const THE_LEADS_LINE = 'Twelve signed supply contracts with shops in Nairobi, and I want us to sign 12 shops.';
  const team = { id: 'o-team', name: 'Sign 12 shops for kitchen appliances in Nairobi.', target: 12, count: 0, prevCount: 0, ownerParticipantId: null } as any;

  it('"Twelve signed supply contracts ... and I want us to sign 12 shops." is the aim, not a count of 12', () => {
    const lines = [lead(THE_LEADS_LINE)];
    const worth = onlyWhatIsWorthOffering([{ objectiveId: 'o-team', count: 12, said: THE_LEADS_LINE } as any], [team], lines as any);
    expect(worth).toEqual([]);
  });

  it('a line saying what success looks like is never read as where things stand', () => {
    const line = { text: 'Success is 12 shops signed and stocking our cookers.', who: 'p-lead', saidByTheLead: true, kind: 'SUCCESS_DEFINITION' };
    const worth = onlyWhatIsWorthOffering([{ objectiveId: 'o-team', count: 12, said: line.text } as any], [team], [line] as any);
    expect(worth).toEqual([]);
  });

  it('what was really signed still lands: two shops', () => {
    const lines = [lead(THE_LEADS_LINE), lead('We have signed 2 shops so far, Tuskys Westgate and Karen Hardware.')];
    const read = { objectiveId: 'o-team', count: 2, said: 'We have signed 2 shops so far, Tuskys Westgate and Karen Hardware.' } as any;
    expect(onlyWhatIsWorthOffering([read], [team], lines as any)).toEqual([read]);
    expect(theLineIsTheAim(12, team, 'We have 12 signed shops now.')).toBe(false);
  });
});

