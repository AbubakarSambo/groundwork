/**
 * WHAT THE TEAM BASELINE HAS LEARNED SO FAR, AND WHAT IT HAS NOT (anchor piece 14; section 15).
 *
 * The baseline is model-led. Nothing here picks the question. But "learn all nine before you close" is arithmetic over a growing transcript,
 * and a model that is asked to hold nine things in mind drifts into following one answer down (what makes that so, and what makes that so) and
 * never reaches who depends on whom. So, as for the lead's conversation, the count is made outside the model, from the person's own words, and
 * handed to it as context every turn: what is learned (not to be asked again), what is not (the only things to ask about), and, once all nine
 * are learned, that this turn closes.
 */
export const THE_NINE = [
  { key: 'workingOn', said: 'what they are working on' },
  { key: 'whatMatters', said: 'what matters most right now from where they sit' },
  { key: 'responsibleFor', said: 'what they are responsible for' },
  { key: 'successLooksLike', said: 'what success looks like to them' },
  { key: 'leadConcern', said: 'what they think their lead is most concerned about' },
  { key: 'whatMakesItHard', said: 'what makes their work difficult' },
  { key: 'dependOn', said: 'who they depend on' },
  { key: 'dependOnThem', said: 'who depends on them' },
  { key: 'teamCouldDoBetter', said: 'what they think the team could be doing better' },
] as const;

export type TheNineKey = (typeof THE_NINE)[number]['key'];
export type WhatIsLearned = Record<TheNineKey, boolean>;

export const THE_BASELINE_READ_SYSTEM = `You are reading the first conversation between Groundwork and a person on a lead's team. For each of nine things, say whether THE PERSON has told Groundwork about it, from what the person said, in any part of the conversation, even if they said it while answering a different question. Count only the person's own words, never Groundwork's, and never a guess from what they did not say.

The nine things:
- workingOn: what they are working on.
- whatMatters: what matters most to them right now from where they sit.
- responsibleFor: what they are responsible for.
- successLooksLike: what success looks like to them.
- leadConcern: what they think their lead is most concerned about.
- whatMakesItHard: what makes their work difficult.
- dependOn: who they depend on to get their work done.
- dependOnThem: who depends on them.
- teamCouldDoBetter: what they think the team could be doing better.

Say true only where the person has plainly told Groundwork. A passing mention of a person's name or of a thing they do is not enough unless it answers the thing.`;

export const THE_BASELINE_READ_TOOL = {
  name: 'what_the_person_has_told_us',
  description: 'For each of nine things, whether the person has told Groundwork about it.',
  input_schema: {
    type: 'object' as const,
    properties: Object.fromEntries(THE_NINE.map((n) => [n.key, { type: 'boolean' }])),
    required: THE_NINE.map((n) => n.key) as string[],
  },
};

export function whatIsLearnedFrom(read: unknown, before?: Partial<WhatIsLearned> | null): WhatIsLearned {
  const r = (read && typeof read === 'object' ? read : {}) as Record<string, unknown>;
  const out = {} as WhatIsLearned;
  for (const n of THE_NINE) out[n.key] = r[n.key] === true || before?.[n.key] === true;
  return out;
}

export const everythingIsLearned = (l: WhatIsLearned) => THE_NINE.every((n) => l[n.key]);

/** The context handed to the model every turn. Labels only: none of the person's words are put back in front of the model to echo. */
export function whatTheBaselineHasLearned(l: WhatIsLearned): string {
  const got = THE_NINE.filter((n) => l[n.key]).map((n) => `- ${n.said}`);
  const missing = THE_NINE.filter((n) => !l[n.key]).map((n) => `- ${n.said}`);
  const lines = ['# What you have learned from this person, and what you have not'];
  lines.push(got.length ? `Learned already. Do not ask about these again:\n${got.join('\n')}` : 'You have not yet learned any of the nine things.');
  if (missing.length) {
    lines.push(`Not learned yet. Ask about only these, one at a time, in the order that follows what they have just said:\n${missing.join('\n')}\nDo not ask why, what makes it so, or how they know. Take their answer and move to the next thing you have not learned. You must not close yet.`);
  }
  return lines.join('\n\n');
}

/** The turn on which all nine are learned. Read last. */
export const THE_BASELINE_CLOSING_REMINDER = `# For this person, all nine things are learned, so this turn closes

Do not ask a question in this turn. Do not use a question mark anywhere in it. In two short sentences, thank them in plain words for telling you how their work looks from where they sit, and say what happens next: the others on the team are being asked the same, so that Groundwork can see where people see the work the same way and where they do not. Do not repeat what they told you, do not praise it, and do not say what their lead wants or thinks.`;

/**
 * NO EXAMPLE ANSWER IS EVER PUT UNDER A BASELINE QUESTION (anchor piece 14; "I believe we are shipping the product." was offered as an
 * answer, and "for instance, something like invoices paid within five days" after it). The engine's own rules tell the model to offer two
 * or three concrete options from the person's world, which is right for a check-in about their work and wrong for the one conversation that
 * exists to learn what is in their head. A sentence of the model's that offers one is taken off, read-side and narrow: only a sentence that
 * begins as an example, and only where what is left still holds a question.
 */
const AN_EXAMPLE_SENTENCE = /^\s*(?:for (?:instance|example)|such as|e\.g\.|something like|maybe something like|perhaps something like|you could say|you might say|you might (?:say|answer|mention))\b/i;

export function withoutAnExampleAnswer(reply: string): { text: string; cut: string[] } {
  const cut: string[] = [];
  const paragraphs = String(reply ?? '').split(/\n{2,}/).map((p) => {
    const sentences = p.match(/[^.!?]+(?:[.!?]+["'”’)]*|$)/g) ?? [p];
    return sentences.filter((s) => {
      const hit = AN_EXAMPLE_SENTENCE.test(s);
      if (hit) cut.push(s.trim());
      return !hit;
    }).join('').trim();
  });
  const text = paragraphs.filter(Boolean).join('\n\n');
  /* Never leave a reply that asks nothing: if the cut took the only question, the reply stands as it was. */
  return text.includes('?') || !String(reply).includes('?') ? { text, cut } : { text: String(reply), cut: [] };
}
