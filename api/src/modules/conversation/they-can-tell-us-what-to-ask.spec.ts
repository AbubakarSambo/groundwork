import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { whatTheyWantAsked, theyAreSteeringUs, asSomethingToCover, followTheirLead } from './they-can-tell-us-what-to-ask';
import { aboutTheToolNotTheWork } from './a-remark-about-the-tool-is-not-the-work';
import { theyHaveTalkedAbout } from './the-ground-the-brief-asks-us-to-cover';

/**
 * "YOU CAN DIRECTLY TELL THE AI WHAT YOU WANT IT TO EXPLORE OR ASK YOU ABOUT. THE AI SHOULD FOLLOW
 * YOUR LEAD."
 *
 * The brief for the update scenario says that to the person answering, before they type anything.
 * The product could not do it: nothing read an instruction about what to ask, so somebody who said
 * "ask me about how I vet distributors" was asked about volumes instead. Promised and refused in
 * the same five minutes, which is worse than never offering.
 */
describe('what they asked us to ask about', () => {
  it('in the ways people actually say it', () => {
    expect(whatTheyWantAsked('ask me about my distribution network instead')).toBe('distribution network');
    expect(whatTheyWantAsked('can you ask me about how I find buyers')).toBe('how I find buyers');
    expect(whatTheyWantAsked('I want to talk about the risks I have had, not volumes')).toBe('risks I have had');
    expect(whatTheyWantAsked('explore my supplier vetting with me')).toBe('supplier vetting');
    expect(whatTheyWantAsked('focus on the vetting problem please')).toBe('vetting problem');
    expect(whatTheyWantAsked("let's talk about cold chain")).toBe('cold chain');
  });

  /**
   * THE SHAPE THAT WAS BEING THROWN AWAY. It opens with a complaint, so the remark filter took the
   * whole turn - answered politely, instruction discarded. And it is the commonest shape there is,
   * because people only steer once the questions have gone somewhere they do not want.
   */
  it('including one wrapped in a complaint', () => {
    expect(whatTheyWantAsked('you keep asking about volumes, ask me about distribution')).toBe('distribution');
    expect(aboutTheToolNotTheWork('you keep asking about volumes, ask me about distribution')).toBe(false);
  });

  /* One clause: the rest of the sentence is an answer and stays an answer. */
  it('and takes the subject, not the paragraph after it', () => {
    expect(whatTheyWantAsked('ask me about distribution, we lost three agents last year')).toBe('distribution');
  });
});

describe('and what is not a steer', () => {
  /*
   * "what about volumes" and "and the seasons?" are how people carry a conversation, not how they
   * redirect one. Treating them as steers would hand the conversation to whatever noun somebody
   * last mentioned - a false steer costs more than a missed one, which costs a single turn.
   */
  it('carrying the conversation on', () => {
    for (const said of [
      'what about volumes',
      'and the seasons?',
      'what I really need is help finding buyers in the southeast',
      'we aggregate maize in Kwara and want to move into Niger',
      'no volumes, just increase their incomes by 30%',
    ]) expect(theyAreSteeringUs(said)).toBe(false);
  });

  /* A subject we could not name back to them is not a subject. */
  it('and a pronoun', () => {
    expect(whatTheyWantAsked('ask me about it')).toBeNull();
    expect(whatTheyWantAsked('ask me about that')).toBeNull();
  });

  it('and nothing at all', () => {
    expect(whatTheyWantAsked('')).toBeNull();
    expect(whatTheyWantAsked(null)).toBeNull();
  });
});

describe('a steer becomes something to cover', () => {
  const s = asSomethingToCover('supplier vetting');

  it('named back in their words, because being followed is the point', () => {
    expect(s.ask).toContain('supplier vetting');
    expect(s.subject).toBe('supplier vetting');
  });

  /* Same phrase twice is one steer. */
  it('and the same phrase is the same subject', () => {
    expect(asSomethingToCover('supplier vetting').id).toBe(s.id);
  });

  /* Decided by the same coverage rule as the brief's own subjects - nothing new to disagree with. */
  it('and it is done when they have talked about it', () => {
    expect(theyHaveTalkedAbout(s as any, ['we vet suppliers on who our existing ones vouch for'])).toBe(true);
    expect(theyHaveTalkedAbout(s as any, ['about two thousand tonnes a quarter'])).toBe(false);
  });
});

describe('what the conversation is told', () => {
  const told = followTheirLead('supplier vetting');

  it('that it outranks whatever it was going to ask', () => {
    expect(told).toContain('OUTRANKS EVERYTHING ELSE');
    expect(told).toContain('supplier vetting');
  });

  /* The reason, so the instruction is not one a model talks itself out of. */
  it('and why: the brief promised them this before they typed anything', () => {
    expect(told).toMatch(/breaking a promise it made before they typed anything/);
  });
});

describe('and it is wired ahead of both the holes and the brief', () => {
  const SRC = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('a steer they have not had yet wins the turn', () => {
    expect(SRC).toMatch(/const theHole = stillOwed\.length\s*\?\s*followTheirLead\(stillOwed\[0\]\.subject\)/);
  });

  /* Dropped from the rank only once they have actually talked about it, not once we have asked. */
  it('and stays owed until they have talked about it', () => {
    expect(SRC).toMatch(/\.filter\(\(s\) => !theyHaveTalkedAbout\(s as any, theirAnswers\)\)/);
  });

  it('and is kept on the notes as they ask for it', () => {
    expect(SRC).toMatch(/const steer = whatTheyWantAsked\(theirTurn\)/);
    expect(SRC).toMatch(/asked: Array\.from\(new Set\(\[\.\.\.\(before\.asked \?\? \[\]\), steer\]\)\)|asked\b/);
  });
});
