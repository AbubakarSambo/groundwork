import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * THE ENGINE'S HALF OF THE YODA GUARD, CHECKED HERE BEFORE IT IS PUSHED (request 141).
 *
 * The screens workspace holds `client/src/lib/copy-does-not-sound-like-yoda.spec.ts`. It counts lines
 * that open on a long clause, put an abstract noun where a person should be, or leave the point until
 * the end, in BOTH `client/src` and `api/src`, against one ceiling. The engine workspace never runs
 * the client's tests, so a new engine line in that shape was found by the screens after a merge, and
 * the count kept coming back. This file runs the same scoring over `api/src` alone, in the engine's
 * own test run, and holds the engine's count where the 141 pass left it.
 *
 * The regexes and the list of files that are not copy are copied from the client guard on purpose,
 * so the two count the same lines. If the client guard changes its scoring, change this one with it.
 * Lowering the number below is always welcome. Raising it means a line was written in that shape:
 * rewrite the line instead, with the point first.
 */
const ROOT = __dirname;

/** Model instructions are not copy, and Hafsah's own sentence is quoted rather than rewritten. Same list as the client guard. */
const NOT_COPY = [
  'prompt-library.ts',
  'what-the-moat-is-made-of.ts',
  'one-line-one-link-one-report.ts',
  'reading-what-they-just-said.ts',
  'the-context-chat.ts',
  'what-a-complete-answer-holds.ts',
  'the-judgement-over-the-answers.ts',
  'fitting-an-answer-into-the-frame.ts',
  'what-a-participant-is-told-about-this.ts',
  /* Batch 1 (4 November 2026): the assessor's, the read-back's, setup's and the short day's instructions to the model. */
  'the-assessment.ts',
  'the-read-back.ts',
  'setup-is-the-first-check-in.ts',
  'a-short-day.ts',
  /* Model instructions read by the model and never by a person (CI after batch 1, 7 November 2026): each of these files is a prompt
     or a pattern's definition for the model. The two lists are one list again. */
  'ask-understands-with-the-model.ts',
  'what-they-said-they-would-do-next.ts',
  'a-verdict-is-not-a-question.ts',
  'giving-the-person-agency.ts',
  'the-ground-the-brief-asks-us-to-cover.ts',
  'the-record-holds-what-was-said.ts',
  'what-happened-to-what-they-said.ts',
  'you-have-already-said-this-about-them.ts',
  'what-the-context-chat-heard.ts',
  'the-detector-reads-their-own-earlier-record.ts',
  'what-counts-for-each-pattern.ts',
  'a-prompt-proposal.ts',
  'the-policy.ts',
];

const blankComments = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/^(\s*)\/\/.*$/gm, (_m, pre) => pre);

function everyFile(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) everyFile(full, out);
    else if ((full.endsWith('.ts') || full.endsWith('.tsx')) && !full.includes('.spec.')) out.push(full);
  }
  return out;
}

const LEADS_WITH_A_CLAUSE = /^(when|where|while|because|since|if|once|after|before|although|though|unless|given that|as soon as|whenever|wherever)\b[^,.!?]{12,},/i;
const ABSTRACT_SUBJECT = /^(the (thing|things|work|way|part|point|answer|reason|question|account|record|difference|fact)\b|what [a-z]+ (did|said|was|is|are|were)\b|whether\b|the ones that\b)/i;
const POINT_BURIED = /^[^,.!?]{60,},/;
const NOMINALISED = /\b(the fact that|is what|which is what|it is (that|because)|there is nothing in (them|it)|is part of the)\b/i;
const INVERTED = /\b(and .{0,40}did not\b|, so (there is|nothing|somebody|nobody))/i;
const A_PROMPT = /\b(return (json|only|nothing)|do not invent|schema|JSON only|Emit |one sentence and under|ask what|Write one for every|use GROUND_STATE|candidate leadership pattern)\b/i;
const SHOUTING = /\b[A-Z]{4,}\b/g;

function score(text: string): number {
  let points = 0;
  for (const sentence of text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)) {
    const words = sentence.split(/\s+/).length;
    if (LEADS_WITH_A_CLAUSE.test(sentence)) points += 2;
    if (ABSTRACT_SUBJECT.test(sentence)) points += 2;
    if (POINT_BURIED.test(sentence)) points += 2;
    if (NOMINALISED.test(sentence)) points += 1;
    if (INVERTED.test(sentence)) points += 1;
    if (words >= 30) points += 2;
    else if (words >= 24) points += 1;
  }
  return points;
}

function proseIn(src: string): string[] {
  const out: string[] = [];
  const strings = src.match(/'(?:[^'\\]|\\.){12,400}'|"(?:[^"\\]|\\.){12,400}"|`(?:[^`\\$]|\\.){12,400}`/g) ?? [];
  for (const raw of strings) {
    const s = raw.slice(1, -1).trim();
    if (!s.includes(' ') || s.split(/\s+/).length < 6) continue;
    if (/https?:\/\/|\.\/|[{}<>]|\.(ts|tsx|json|css)\b/.test(s)) continue;
    if (!/\b(the|a|you|your|it|this|that|is|are|was|to|of|and)\b/i.test(s)) continue;
    if (A_PROMPT.test(s)) continue;
    if ((s.match(SHOUTING) ?? []).length >= 2) continue;
    out.push(s);
  }
  return out;
}

export function theEnginesYodaLines(): string[] {
  const offenders: string[] = [];
  for (const f of everyFile(ROOT)) {
    if (NOT_COPY.some((name) => f.endsWith(name))) continue;
    for (const line of proseIn(blankComments(readFileSync(f, 'utf8')))) {
      if (score(line) >= 3) offenders.push(`${f.replace(/^.*\/api\/src\//, 'api/src/')}  ${line.slice(0, 100)}`);
    }
  }
  return offenders;
}

/** Where the 141 pass left the engine's count, on 5 October 2026. The client guard counts these and the screens' together. */
const WHERE_THE_141_PASS_LEFT_THE_ENGINE = 35;

describe("the engine's copy does not sound like Yoda (request 141)", () => {
  it('no more lines in that shape in api/src than the 141 pass left behind', () => {
    const offenders = theEnginesYodaLines();
    if (offenders.length > WHERE_THE_141_PASS_LEFT_THE_ENGINE) {
      throw new Error(
        `Lines in api/src reading like Yoda went up to ${offenders.length}, from ${WHERE_THE_141_PASS_LEFT_THE_ENGINE}. ` +
          `Rewrite the new one with the point first. Every line that scores:\n${offenders.join('\n')}`,
      );
    }
    if (process.env.SHOW_YODA) console.log(offenders.join('\n'));
  });
});
