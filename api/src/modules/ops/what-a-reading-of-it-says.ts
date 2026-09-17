import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { OneCheck, Verdict, WhatWeSayWeAre } from './what-a-resource-must-not-claim';

/**
 * THE READING PASS. The ops system's own, and it owns it for a boundary reason.
 *
 * The product has a model service. This does not use it — `ops/` may not import
 * from a product module, and the boundary is the point rather than an
 * inconvenience: this back office is a customer of the product, and a customer
 * does not reach inside it. So the ops register talks to the library directly.
 *
 * FAILING IS NORMAL HERE. No key, no network, a model that answers with prose —
 * every one of those returns null and leaves the words pass standing. A deck
 * going out on the day the model is down still gets checked; it just gets
 * checked less well, and the register says which.
 */
@Injectable()
export class WhatAReadingOfItSaysService {
  private readonly logger = new Logger(WhatAReadingOfItSaysService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * What a reading of this resource says about each claim.
   *
   * Null when no reading happened, which is a different fact from "it read
   * clean" and is kept different all the way to the screen.
   */
  async read(
    resource: { title: string; content: string },
    statement: WhatWeSayWeAre,
  ): Promise<{ checks: OneCheck[]; says: string } | null> {
    let client: GoogleGenAI;
    try {
      client = new GoogleGenAI({
        vertexai: true,
        project: this.config.get<string>('gemini.projectId') || 'groundwork-500011',
        location: this.config.get<string>('gemini.location') || 'us-central1',
      });
    } catch (error) {
      this.logger.warn(`No model available to read this: ${(error as Error).message}`);
      return null;
    }

    try {
      const response = await client.models.generateContent({
        model: this.config.get<string>('gemini.model') || 'gemini-2.5-pro',
        contents: [{ role: 'user', parts: [{ text: thePrompt(resource, statement) }] }],
        config: { responseMimeType: 'application/json', temperature: 0 },
      });

      const text = response.text ?? '';
      return readWhatItAnswered(text, statement);
    } catch (error) {
      this.logger.warn(`Reading this resource failed: ${(error as Error).message}`);
      return null;
    }
  }
}

/**
 * The prompt.
 *
 * It is given OUR OWN WORDS and asked to judge against them, never asked what
 * the product is. A model asked what a product is will answer from what it read
 * on the internet about products like it, and the whole reason the statement is
 * a stored, versioned record is that the answer must come from us.
 */
export function thePrompt(
  resource: { title: string; content: string },
  statement: WhatWeSayWeAre,
): string {
  return [
    'You are checking one piece of a company\'s marketing against what that company has decided its product is.',
    'Judge ONLY against the statements given below. Do not use anything you know about products like this one.',
    '',
    `WHAT WE SAY WE ARE: ${statement.headline}`,
    '',
    'WE ARE:',
    ...statement.isIt.map((c, i) => `  IS-${i}: ${c}`),
    '',
    'WE ARE NOT:',
    ...statement.isNotIt.map((c, i) => `  ISNOT-${i}: ${c}`),
    '',
    `THE PIECE - "${resource.title}":`,
    resource.content.slice(0, 20000),
    '',
    'For each claim above, answer whether this piece is consistent with it.',
    'Return JSON only: {"checks":[{"id":"ISNOT-0","verdict":"CLEAR"|"SAYS_WHAT_WE_ARE_NOT"|"NEEDS_A_LOOK","says":"one sentence, quoting the piece where you can"}],"says":"one sentence overall"}',
    'Use SAYS_WHAT_WE_ARE_NOT only where the piece actually claims the thing, including where it claims it without using the words.',
    'Use NEEDS_A_LOOK where you are unsure. Being unsure is a useful answer here; guessing is not.',
  ].join('\n');
}

/**
 * What came back, mapped onto the claims it is about.
 *
 * The model's ids are matched back to OUR list rather than trusted as text: a
 * check whose claim is whatever the model typed is a check about nothing, and
 * it would look identical to a real one on the page.
 */
export function readWhatItAnswered(
  raw: string,
  statement: WhatWeSayWeAre,
): { checks: OneCheck[]; says: string } | null {
  let parsed: { checks?: Array<{ id?: string; verdict?: string; says?: string }>; says?: string };
  try {
    parsed = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim());
  } catch {
    return null;
  }

  if (!Array.isArray(parsed.checks)) return null;

  const VERDICTS: Verdict[] = ['CLEAR', 'SAYS_WHAT_WE_ARE_NOT', 'NEEDS_A_LOOK'];

  const checks = parsed.checks
    .map((c): OneCheck | null => {
      const match = /^(IS|ISNOT)-(\d+)$/.exec(c.id ?? '');
      if (!match) return null;

      const list = match[1] === 'IS' ? statement.isIt : statement.isNotIt;
      const claim = list[Number(match[2])];
      if (claim === undefined) return null;

      const verdict = VERDICTS.includes(c.verdict as Verdict) ? (c.verdict as Verdict) : 'NEEDS_A_LOOK';
      return {
        claim,
        kind: match[1] === 'IS' ? 'IS' : 'IS_NOT',
        verdict,
        says: (c.says ?? '').trim() || 'Read, with nothing said about why.',
      };
    })
    .filter((c): c is OneCheck => c !== null);

  if (checks.length === 0) return null;

  return { checks, says: (parsed.says ?? '').trim() || 'Read against what we say we are.' };
}
