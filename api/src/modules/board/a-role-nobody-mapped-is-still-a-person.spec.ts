import { UniversalMode } from './role-maps';
import {
  theBehavioursAnybodyCanBeRead, universalSignalRead, UNIVERSAL_ORDER,
} from './a-role-nobody-mapped-is-still-a-person';

describe('a role nobody mapped is still a person', () => {
  it('offers behaviours to read when there is no role map at all', () => {
    const b = theBehavioursAnybodyCanBeRead();
    expect(b.length).toBe(UNIVERSAL_ORDER.length);
    expect(b.every((x) => x.trim().length > 20)).toBe(true);
  });

  it('returns a pair, never half of one', () => {
    const read = universalSignalRead(0, 'Three things were named and none had a date.');
    expect(read?.noticed).toBeTruthy();
    expect(read?.lookingLike).toBeTruthy();
    expect(read?.probe).toBeTruthy();
  });

  it('refuses a read with no reason, because a read without one is an accusation', () => {
    expect(universalSignalRead(0, '')).toBeNull();
    expect(universalSignalRead(0, '   ')).toBeNull();
  });

  it('refuses an index off the end', () => {
    expect(universalSignalRead(-1, 'something')).toBeNull();
    expect(universalSignalRead(99, 'something')).toBeNull();
    expect(universalSignalRead(1.5, 'something')).toBeNull();
  });

  it('never coaches on a mode nothing ever emits', () => {
    expect(UNIVERSAL_ORDER).not.toContain(UniversalMode.AVOIDANCE);
    expect(UNIVERSAL_ORDER).not.toContain(UniversalMode.DIFFUSION);
  });

  it('says nothing about the work itself, only about the account', () => {
    /* The whole point of the floor: without knowing the job we cannot read the work, and a line
       that judged the work would be the guess the role gate exists to prevent. */
    for (const line of theBehavioursAnybodyCanBeRead()) {
      expect(line).not.toMatch(/\b(good|bad|poor|strong|weak|underperform|behind|failing)\b/i);
    }
  });

  it('carries no label, only what was said and not said', () => {
    for (let i = 0; i < UNIVERSAL_ORDER.length; i += 1) {
      const read = universalSignalRead(i, 'because the transcript says so')!;
      expect(read.noticed).not.toMatch(/\byou are\b|\byou seem\b|\btend to\b|\balways\b|\bnever\b/i);
    }
  });
});
