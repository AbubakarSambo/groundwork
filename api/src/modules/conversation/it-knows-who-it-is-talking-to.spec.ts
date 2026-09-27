import { PartyType } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import { alreadyEstablished } from './setup-already-asked-this';

/**
 * IT REFERRED TO THE READER IN THE THIRD PERSON, TO THEIR FACE.
 *
 * Driven on a generic check-in a lead had opened about their own work: the intake block told the
 * model "The person who set it up wrote this about the situation: ..." and "The person who set this
 * up described this person's part in it as: ..." - about the person who was, at that moment, the
 * one reading the reply.
 *
 * Two things come of it. The obvious one is that it reads as the product not knowing who is in the
 * room. The worse one is that the model treats their own sentence as somebody else's account and
 * starts asking them to respond to it, which turns their own setup into a claim they must answer.
 *
 * The fact was never missing - `ctx.partyType` says whether this reader is the initiator. It just
 * was not being passed.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const LIB = strip(readFileSync(join(__dirname, 'prompt-library.ts'), 'utf8'));

const facts = {
  scenario: null,
  roleAsDescribed: 'holding the launch together',
  adminBrief: 'We are three weeks from the meeting and nobody has read the pack.',
};

describe('the setup block', () => {
  it('speaks to the person who wrote it in the second person', () => {
    const block = alreadyEstablished({ ...facts, readerSetItUp: true });
    expect(block).toContain('You wrote this about the situation');
    expect(block).toContain('You described your own part in it as');
    expect(block).not.toContain('The person who set');
    expect(block).not.toContain("this person's part");
  });

  /* The third person is the lead's name now, or "their lead", and never the label "the person who
     set this up": the model said the label back to a participant as the first line of her check-in
     (openread, run 10). See the-lead-has-a-name. */
  it('and about them in the third person to everybody else, by name', () => {
    const block = alreadyEstablished({ ...facts, readerSetItUp: false, setUpBy: 'Daniel' });
    expect(block).toContain('Daniel wrote this about the situation');
    expect(block).toContain("Daniel described this person's part");
    expect(block).not.toContain('The person who set this up wrote');
  });

  it('defaults to the third person when nobody said', () => {
    /* An unset flag must not silently address a stranger as the author of the brief. */
    expect(alreadyEstablished(facts as any)).toContain('Their lead wrote');
  });

  it('and the intake passes the fact it already holds', () => {
    expect(LIB).toContain('readerSetItUp: ctx.partyType === PartyType.INITIATOR');
  });

  it('which is the same test the rest of the intake uses for the initiator', () => {
    expect(PartyType.INITIATOR).toBeDefined();
  });
});
