import { readFileSync } from 'fs';
import { join } from 'path';
import { theReadBack, THE_READ_BACK_WAS_GIVEN } from './the-read-back';

/**
 * THE READ-BACK AT THE END OF A CHECK-IN, AS THE PERSON READS IT (F4 item 2, 3 November 2026; changed after plan round 32). What Mercy
 * reads at the end of her check-in is what she said, in her own words, from the conversation's own notes. It used to wait for the full
 * assessment (52 seconds, a 56-second reply); the assessment is now written at the close, with any correction in it, and every page
 * reads that. The file keeps its name, which the specs list knows it by.
 */
const claim = (id: string, kind: string, said: string) => ({ id, kind, said });
const mercysNotes = {
  claims: [
    claim('c1', 'FACT', 'Kilele Hotel paid KES 40,000 on Monday.'),
    claim('c2', 'PLAN', 'I will send the Westgate quote on Friday'),
    claim('c3', 'FACT', 'Still waiting for Joseph to send the samples.'),
    claim('c4', 'FACT', 'kilele hotel paid KES 40,000 on Monday.'),
  ],
  contradictions: [],
};

describe('the read-back at the end of a check-in', () => {
  it('Mercy reads what she said, in her own words, each thing once', () => {
    expect(theReadBack(mercysNotes as any)).toBe([
      'Here’s what I recorded.',
      'You said “Kilele Hotel paid KES 40,000 on Monday.”',
      'You said “I will send the Westgate quote on Friday.”',
      'You said “Still waiting for Joseph to send the samples.”',
      'Is anything wrong? Tell me and I will put it right.',
    ].join('\n'));
  });

  it('nothing of theirs to say back means no read-back, and the close goes on as before', () => {
    expect(theReadBack({ claims: [], contradictions: [] } as any)).toBeNull();
    expect(theReadBack(null)).toBeNull();
  });

  it('plain full sentences, no colon joining pieces', () => {
    for (const line of theReadBack(mercysNotes as any)!.split('\n')) expect(line).not.toMatch(/^[^“]*:\s/);
  });

  it('it waits for this turn\'s note and not for an assessment; the close is held once, and the next turn is told a fix is a claim', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const at = src.indexOf('const readBack = theReadBack(notes);');
    expect(at).toBeGreaterThan(-1);
    const before = src.slice(src.lastIndexOf('if (sessionComplete && !(checkIn as any).isSelfCorrection', at), at);
    expect(before).toContain('await this.theNoteFromTheLastTurnLands(checkIn.id);');
    expect(before).not.toContain('assessTheConversation');
    expect(src.indexOf('this.noteWhatTheySaid(checkIn.id, message)')).toBeLessThan(at);
    expect(src).toContain("data: { closeHeldAt: new Date() }");
    expect(src).toContain("(r?.closeHeldAt ? THE_READ_BACK_WAS_GIVEN : '')");
    expect(THE_READ_BACK_WAS_GIVEN).toMatch(/a correction is a claim like any other/);
    expect(THE_READ_BACK_WAS_GIVEN).toMatch(/ask for it once, naturally, without accusing anybody/);
    expect(THE_READ_BACK_WAS_GIVEN).toMatch(/Never read the list back again\./);
  });
});
