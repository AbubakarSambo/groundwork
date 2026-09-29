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
});
