import { readFileSync } from 'fs';
import { oneThingBack } from './one-thing-back-not-three';

/**
 * THREE TRUE FACTS IN ONE TURN IS A BRIEFING, NOT A CONVERSATION.
 *
 * Three give-back blocks, each correctly refusing to hand over more than one fact, none of them
 * aware of the others. One sentence from a lead came back carrying all three. Found by running a
 * turn; every block passed its own tests.
 */
describe('one thing back, not three', () => {
  const number = 'WHAT THEY ARE TRACKING...';
  const person = 'ALREADY ON THE RECORD ABOUT SOMEBODY...';
  const room = 'SOMETHING THEY DO NOT KNOW...';

  it('takes their own number first, which is the most exact and the most theirs', () => {
    expect(oneThingBack({ againstTheirNumber: number, alreadySaidAboutThem: person, roomKnows: room })).toBe(number);
  });

  it('then the thing somebody has not been told, which is the one with an action on it', () => {
    expect(oneThingBack({ alreadySaidAboutThem: person, roomKnows: room })).toBe(person);
  });

  it('then what else the room is waiting on', () => {
    expect(oneThingBack({ roomKnows: room })).toBe(room);
  });

  it('and nothing when there is nothing worth saying', () => {
    expect(oneThingBack({})).toBe('');
    expect(oneThingBack({ againstTheirNumber: '   ', roomKnows: '' })).toBe('');
  });

  it('never returns two', () => {
    const out = oneThingBack({ againstTheirNumber: number, roomKnows: room });
    expect(out).not.toContain('SOMETHING THEY DO NOT KNOW');
  });

  it('and only the chosen one reaches the prompt', () => {
    const src = readFileSync(`${__dirname}/conversation.service.ts`, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(src).toMatch(/const theOneThingBack = oneThingBack\(\{ againstTheirNumber, alreadySaidAboutThem, roomKnows \}\)/);
    expect(src).toMatch(/patternProbeBlock, theOneThingBack,/);
    /* The three raw blocks must not also be in the list, which is the bug this file exists for. */
    expect(src).not.toMatch(/roomKnows, againstTheirNumber, alreadySaidAboutThem,/);
  });
});
