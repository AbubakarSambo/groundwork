import { OpsServes } from '@prisma/client';

/**
 * WHAT THIS COMPANY DECIDED, IN THE SHAPE THE PRODUCT TAKES IT IN.
 *
 * The assistant has no memory of anything this company agreed, and it was never
 * the assistant's fault: it reads what was pushed to it, and we have only ever
 * pushed people, objectives, evidence and interactions. What the product is, the
 * moat, the phases, the resources register, the decisions — all of it sits in our
 * own system and has never been sent.
 *
 * The way in has existed the whole time. Knowledge cards are a published route
 * under `knowledge:write`, and this is us finally using it, on the same
 * credential as everything else.
 *
 * IT IS ALSO THE HONEST TEST OF THAT ROUTE. If our own material will not fit
 * through it — if a decision needs a field the card does not have — a customer's
 * will not fit either, and we would rather find that out on ourselves.
 *
 * WHAT DOES NOT GO. Anything about a named person's performance, anything a
 * person said, and anything not yet decided. A card is what the company agreed,
 * available to everybody in it — so a draft, an opinion, or somebody's record
 * would be a different kind of thing wearing this one's clothes.
 */

export interface Card {
  kind: string;
  key: string;
  title: string;
  body: string;
  sourceRef?: string;
  externalId: string;
  sourceSystem: string;
}

export const OUR_SOURCE_SYSTEM = 'coamana-ops';

/** Stable across edits, so a changed body supersedes rather than duplicating. */
const card = (kind: string, key: string, title: string, body: string, sourceRef?: string): Card => ({
  kind,
  key,
  title,
  body: body.trim(),
  sourceRef,
  externalId: key,
  sourceSystem: OUR_SOURCE_SYSTEM,
});

export interface WhatWeHold {
  statement: {
    version: number;
    headline: string;
    saidOutLoud: string;
    isIt: string[];
    isNotIt: string[];
  } | null;
  moat: { name: string; statement: string }[];
  phases: {
    name: string;
    intent: string;
    startsOn: Date;
    endsOn: Date;
    exitCondition: string;
    exitMetric: string | null;
  }[];
  freeze: { because: string; until: Date | null } | null;
  resources: { title: string; category: string; risks: string[] }[];
  serves: { label: string; description: string }[];
}

/**
 * The cards. One per decision, not one big handbook.
 *
 * Separate cards because retrieval scores a question against a card: a single
 * document containing the moat, the phases and the freeze scores badly against
 * "what are we not doing this month" and would lose to anything shorter. The
 * document route exists for genuine handbooks and this is not one — these are
 * five distinct decisions that happen to live in the same system.
 */
export function whatThisCompanyDecided(held: WhatWeHold): Card[] {
  const cards: Card[] = [];

  if (held.statement) {
    cards.push(
      card(
        'PRODUCT_MAP',
        'what-we-are',
        'What this product is, and what it is not',
        [
          held.statement.headline,
          '',
          held.statement.saidOutLoud,
          '',
          'It is:',
          ...held.statement.isIt.map((l) => `- ${l}`),
          '',
          'It is not:',
          ...held.statement.isNotIt.map((l) => `- ${l}`),
          '',
          `Version ${held.statement.version}. Every deck, campaign and page is measured against this.`,
        ].join('\n'),
        'Ops → What we are',
      ),
    );
  }

  if (held.moat.length) {
    cards.push(
      card(
        'DECISION_RECORD',
        'the-moat',
        'The moat: what our defensible advantage is made of',
        [
          'The moat is what makes this hard to copy and hard to leave. It has these parts:',
          '',
          ...held.moat.map((m) => `${m.name}\n${m.statement}`),
        ].join('\n\n'),
        'Ops → The moat',
      ),
    );
  }

  if (held.phases.length) {
    cards.push(
      card(
        'PLAYBOOK',
        'the-workplan',
        'The workplan: five phases, which overlap',
        [
          'A phase is a stretch of work, not a period. Two are routinely running at once, and that is the plan.',
          '',
          ...held.phases.map(
            (p) =>
              `${p.name} (${asADate(p.startsOn)} to ${asADate(p.endsOn)})\n${p.intent}\n`
              + `Done when: ${p.exitCondition}`
              + (p.exitMetric ? ` — read from ${p.exitMetric}.` : ' — not a number this system reads; somebody decides.'),
          ),
        ].join('\n\n'),
        'Ops → The workplan',
      ),
    );
  }

  if (held.freeze) {
    cards.push(
      card(
        'DECISION_RECORD',
        'the-freeze',
        'The freeze: what we are not doing, and until when',
        [
          held.freeze.because,
          '',
          held.freeze.until
            ? `In force until ${asADate(held.freeze.until)}.`
            : 'In force, with no end date set.',
          '',
          /*
           * THE WORDS PEOPLE ASK IN, NOT THE WORDS WE FILE IN.
           *
           * Retrieval scores a question against a card. "What are we not doing
           * this month" found nothing against a card titled "What is frozen" —
           * they share no words. Driving it is what showed that; reading the
           * card, it looks perfectly clear.
           */
          'This is what we are not doing, not building, and not adding this month. '
          + 'Work that is on hold, paused, or out of scope for now is covered by this.',
        ].join('\n'),
        'Ops → Decisions',
      ),
    );
  }

  if (held.serves.length) {
    cards.push(
      card(
        'DECISION_RECORD',
        'what-work-can-serve',
        'Whether a piece of work counts as a contribution',
        [
          'A product contribution counts only if it improves sales or the defensible advantage. Anything else is work, and work is not contribution.',
          '',
          ...held.serves.map((s) => `${s.label}: ${s.description}`),
        ].join('\n'),
        'Ops → Roadmap',
      ),
    );
  }

  if (held.resources.length) {
    cards.push(
      card(
        'RESOURCE',
        'what-we-put-in-front-of-people',
        'The decks, campaigns and copy we are using',
        held.resources
          .map((r) => `${r.title} (${said(r.category)})${r.risks.length ? `\nWatch for: ${r.risks.join('; ')}` : ''}`)
          .join('\n\n'),
        'Ops → Resources',
      ),
    );
  }

  return cards;
}

/** What each `serves` value means, for the card. Read from the enum so it cannot drift. */
export function whatServingMeans(): { label: string; description: string }[] {
  const said: Record<OpsServes, string> = {
    SALES: 'It unblocks a customer use case.',
    MOAT: 'It adds to one of the moat components.',
    UNLOCKS_A_CUSTOMER: 'It unlocks a customer we could not have taken before.',
    KEEPING_IT_UP: 'It keeps what exists working. Necessary, invisible, counted — and it needs somebody to agree it was.',
    MAKES_THE_COMPANY_OPERABLE:
      'It makes the company able to operate — hiring, onboarding, writing down how we work. Only during the phase that permits it.',
  };
  return (Object.keys(said) as OpsServes[]).map((k) => ({ label: k, description: said[k] }));
}

const asADate = (d: Date) => d.toISOString().slice(0, 10);
const said = (s: string) => s.replace(/_/g, ' ').toLowerCase();
