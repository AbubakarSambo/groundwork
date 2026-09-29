import { theStreamedRouteRunsThePlainRoute } from './__fixtures__/the-streamed-route-is-the-plain-route';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * WHERE THIS IS DECIDED IS THE POINT OF IT.
 *
 * The classification could be worked out anywhere the transcript is readable, and that is exactly
 * the problem: the marketing site promises the product never shows anyone's raw answers, and the
 * guard on that promise says the shared report may not touch a transcript AT ALL - not even to
 * derive something safe from it. A line that has to be argued about each time is not a line.
 *
 * So it is decided once, here, and what crosses into any shared surface is SKILL or CONFIDENCE.
 * This file exists to keep it that way, because the natural place to "just read the turns" is the
 * report, and it is one import away at any time.
 *
 * Comments stripped first - this explanation quotes the code it protects.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, '');
const at = (...p: string[]) => strip(readFileSync(join(__dirname, '..', '..', '..', ...p), 'utf8'));

const CONVERSATION = at('src', 'modules', 'conversation', 'conversation.service.ts');
const REPORTS = at('src', 'modules', 'reports', 'reports.service.ts');
const WHY = at('src', 'modules', 'reports', 'why-it-is-not-happening.ts');

describe('the words never leave the conversation they were said in', () => {
  it('the conversation decides it, on the person\'s own message', () => {
    expect(CONVERSATION).toContain('whatTheySaidAboutWhy');
    expect(CONVERSATION).toContain('await this.noteIfTheySaidWhy(checkIn as any, message);');
  });

  it('both paths that persist a person\'s turn call it, so neither can drift', () => {
    /* Changed 28 Sep 2026: the streamed route now runs sendMessage itself (the-streamed-route-is-the-plain-route), so a rule held on both paths is in sendMessage once, and the stream runs it. */
    const calls = CONVERSATION.match(/await this\.noteIfTheySaidWhy\(/g) ?? [];
    expect(calls.length).toBe(1);
    expect(theStreamedRouteRunsThePlainRoute(CONVERSATION)).toBe(true);
    /* And every place a PERSON turn is written is one of them. */
    const writes = CONVERSATION.match(/role: TurnRole\.PERSON, content: message/g) ?? [];
    expect(writes.length).toBe(calls.length);
  });

  it('stores the classification and never the sentence', () => {
    expect(CONVERSATION).toContain('data: { saidWhy: said.kind }');
    expect(CONVERSATION).not.toMatch(/saidWhy:\s*(message|said\.quote)/);
  });

  it('does not overwrite what somebody already said', () => {
    expect(CONVERSATION).toContain('if (checkIn.saidWhy) return;');
  });

  it('never costs somebody their turn when recording it fails', () => {
    const helper = CONVERSATION.slice(CONVERSATION.indexOf('private async noteIfTheySaidWhy'));
    expect(helper.slice(0, 800)).toMatch(/\.catch\(/);
  });

  it('and the report reads the verdict, never the transcript', () => {
    /* The bright line itself. no-surveillance.spec.ts asserts the same thing from the other side. */
    expect(REPORTS).not.toMatch(/conversationTurn\./);
    expect(REPORTS).toContain('where: { groundId, saidWhy: { not: null } }');
    expect(REPORTS).toContain('select: { participantId: true, saidWhy: true }');
  });

  it('so the explanation cannot be reached from words the report does not have', () => {
    expect(WHY).not.toContain('whatTheySaidAboutWhy');
    expect(WHY).toContain("known.saidWhy === 'SKILL'");
  });
});
