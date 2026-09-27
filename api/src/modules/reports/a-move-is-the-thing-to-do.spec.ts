import { readFileSync } from 'fs';
import { join } from 'path';
import { aMoveForTheReader } from './a-move-is-the-thing-to-do';
import { THE_LEADS_LABEL } from './party-labels';

/*
 * "TELL YOU TO GET CHIDI EZE AND SARA LINDQVIST IN A ROOM."
 *
 * run-7, workplan and project. The three moves the lead read, here as they are stored, with labels
 * rather than names. The label for the reader is "the initiator".
 */
describe('a move that tells the reader to do something is written as the thing to do', () => {
  const lead = THE_LEADS_LABEL;

  it('the reader\'s label is the one this is written for', () => {
    expect(lead).toBe('the initiator');
  });

  it('"Tell the initiator to ..." becomes the thing to do', () => {
    expect(aMoveForTheReader('Tell the initiator to get Participant A and Participant B in a room to compare the two plans line by line.', lead))
      .toBe('Get Participant A and Participant B in a room to compare the two plans line by line.');
  });

  it('"Instruct the initiator to ..." becomes the thing to do', () => {
    expect(aMoveForTheReader("Instruct the initiator to rebuild the quarter's plan around the one budget.", lead))
      .toBe("Rebuild the quarter's plan around the one budget.");
  });

  it('"Get the initiator, A, and B to agree" loses the reader from the list', () => {
    expect(aMoveForTheReader('Get the initiator, Participant A, and Participant B to agree on who owns the vendor contract.', lead))
      .toBe('Get Participant A and Participant B to agree on who owns the vendor contract.');
    expect(aMoveForTheReader('Get The initiator and Participant A to agree the launch date.', lead))
      .toBe('Get Participant A to agree the launch date.');
  });

  it('leaves a move that is already the thing to do alone', () => {
    const move = 'Speak with Participant A about the 11 applications before Friday.';
    expect(aMoveForTheReader(move, lead)).toBe(move);
  });

  it('leaves a move about somebody else alone, and never touches quoted words', () => {
    const aboutSomebodyElse = 'Ask Participant B to send the signed contract to Participant A.';
    expect(aMoveForTheReader(aboutSomebodyElse, lead)).toBe(aboutSomebodyElse);
    const quoted = 'Get "the initiator, and everyone" to read the brief, as Participant A put it.';
    expect(aMoveForTheReader(quoted, lead)).toBe(quoted);
  });

  it('runs where the judgement is stored, on every move', () => {
    const src = readFileSync(join(__dirname, 'reports.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(src).toMatch(/move: aMoveForTheReader\(x\.move, THE_LEADS_LABEL\)/);
  });
});
