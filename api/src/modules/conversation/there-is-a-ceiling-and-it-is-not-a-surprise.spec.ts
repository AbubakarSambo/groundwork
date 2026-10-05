import { theStreamedRouteRunsThePlainRoute } from './__fixtures__/the-streamed-route-is-the-plain-route';
/**
 * The twenty-first answer was refused with "Session turn limit reached. Please complete your
 * session." — a limit nobody had mentioned, arriving in the middle of somebody's account of their
 * work, with what they had just typed refused. Nothing warned them, and the sentence reads as a
 * fault rather than as "you have said plenty, finish up".
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  howMuchRoomIsLeft,
  theCeilingIsReached,
  A_CHECK_IN_TAKES_ANSWERS,
  MENTION_IT_WITH_LEFT,
} from './there-is-a-ceiling-and-it-is-not-a-surprise';

describe('how much room is left', () => {
  it('says nothing for most of a check-in', () => {
    for (const answers of [1, 5, 10, 16]) expect(howMuchRoomIsLeft(answers)).toBeNull();
  });

  it('mentions it before it arrives', () => {
    const first = A_CHECK_IN_TAKES_ANSWERS - MENTION_IT_WITH_LEFT;
    expect(howMuchRoomIsLeft(first)).toMatch(/3 more answers/);
  });

  it('and counts down', () => {
    expect(howMuchRoomIsLeft(18)).toMatch(/2 more answers/);
    expect(howMuchRoomIsLeft(19)).toMatch(/one more answer/);
  });

  it('stops once there is no room, because the refusal says the rest', () => {
    expect(howMuchRoomIsLeft(20)).toBeNull();
    expect(howMuchRoomIsLeft(21)).toBeNull();
  });

  it('invites the thing they have not said rather than hurrying them out', () => {
    expect(howMuchRoomIsLeft(17)).toMatch(/worth saying now/);
  });
});

describe('the refusal when it comes', () => {
  it('says their record is safe', () => {
    expect(theCeilingIsReached()).toMatch(/on the record/);
    expect(theCeilingIsReached()).toMatch(/nothing you have written is lost/i);
  });

  it('says what to do', () => {
    expect(theCeilingIsReached()).toMatch(/Finish the check-in/);
    expect(theCeilingIsReached()).toMatch(/another session/);
  });

  it('does not name a limit as though it were a rule they broke', () => {
    expect(theCeilingIsReached()).not.toMatch(/limit reached|not allowed|exceeded/i);
  });
});

describe('and the service uses both', () => {
  const src = fs
    .readFileSync(path.join(__dirname, 'conversation.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('has no bare turn-limit sentence left, on either path', () => {
    expect(src).not.toContain('Session turn limit reached');
    /* Changed 28 Sep 2026: the streamed route now runs sendMessage itself (the-streamed-route-is-the-plain-route), so a rule held on both paths is in sendMessage once, and the stream runs it. */
    expect((src.match(/theCeilingIsReached\(\)/g) ?? []).length).toBe(1);
    expect(theStreamedRouteRunsThePlainRoute(src)).toBe(true);
  });

  it('reads the ceiling from one place rather than a literal 20', () => {
    expect(src).not.toMatch(/personTurnCount >= 20/);
    expect((src.match(/personTurnCount >= A_CHECK_IN_TAKES_ANSWERS/g) ?? []).length).toBe(1);
  });

  it('and the warning rides on a reply, so it reaches somebody without a new screen', () => {
    expect(src).toContain('howMuchRoomIsLeft(personTurnCount + 1)');
  });

  it('and the refusal offers finishing rather than only refusing', () => {
    expect(src).toContain('canFinish: true');
  });
});
