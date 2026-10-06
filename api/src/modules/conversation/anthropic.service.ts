import { Injectable, Logger, OnApplicationBootstrap, ServiceUnavailableException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { whyThisModelIsNotAllowed } from './a-preview-model-has-no-data-terms';
import { withoutTheEmptyOnes } from './an-item-the-model-left-empty-is-not-an-item';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';


/**
 * What the person in the check-in is allowed to be told when the engine fails.
 *
 * The provider's own error used to travel all the way to the browser. During a
 * real outage a clinic manager opening their check-in link was shown a Google
 * Cloud 403 naming our internal project and linking to a billing console - our
 * infrastructure, in front of a customer, at the exact moment they were being
 * asked to trust the product with an account of their work.
 *
 * The real error is logged in full, because we need it. What is returned says
 * what happened, says it is not their fault, and says their answers are safe -
 * which is the thing they will actually worry about.
 */
/**
 * A RATE LIMIT IS NOT AN OUTAGE, AND WAS BEING TREATED AS ONE.
 *
 * Driven through a twelve-session cohort with four people, the provider answered 429
 * RESOURCE_EXHAUSTED under sustained load and the session simply stopped: the person was told "The
 * conversation could not be reached just now", mid-check-in, and two of the four never finished
 * their remaining sessions. Nothing was broken and nothing was retried.
 *
 * A 429 says "not this second", which is the one error worth waiting out. Two retries with a short
 * backoff cover the burst that a team checking in on the same morning actually produces. Anything
 * else - a bad request, a missing key, a malformed tool - is not going to improve by being sent
 * again, and retrying it would turn one clear failure into three slow ones.
 */
export function worthWaitingOut(err: any): boolean {
  const status = err?.status ?? err?.code ?? err?.response?.status;
  if (status === 429 || status === 503) return true;
  const said = String(err?.message ?? '');
  /* Space OR underscore: the provider sends the status as RESOURCE_EXHAUSTED and the human message
     as "Resource exhausted. Please try again later." - the underscore form alone missed the real
     one, which is the message this whole thing exists for. Caught by the spec, not by reading it. */
  /*
   * A CALL THAT RAN OUT OF TIME IS WORTH TRYING AGAIN, AND NEVER WAS.
   *
   * Every call already carried a ninety-second ceiling and not one of them was ever retried: the
   * deadline threw a plain Error whose words matched nothing here, so it went straight past the
   * retry and out to the person as "the conversation could not be reached".
   *
   * Measured on forty-one people answering at once: one of them waited seventy seconds for a reply
   * while the other forty were done inside six. Nothing was broken. One call was slow, and there
   * was no shorter ceiling to cut it off and no retry waiting to take it.
   *
   * A slow call and a busy one are the same fact from our side, and the same answer works for both:
   * stop waiting, ask again. The retry is ours, not theirs - they typed once.
   */
  return /resource[ _]exhausted|rate limit|too many requests|overloaded|unavailable|timed out|did not open|stalled/i.test(said);
}

/** Short, and short enough that nobody is left staring at a composer. */
export const BACKOFF_MS = [800, 2500];

export async function tryAgainIfItIsJustBusy<T>(
  attempt: () => Promise<T>,
  onRetry?: (n: number, err: any) => void,
): Promise<T> {
  let lastErr: any;
  for (let i = 0; i <= BACKOFF_MS.length; i++) {
    try {
      return await attempt();
    } catch (err: any) {
      lastErr = err;
      if (i === BACKOFF_MS.length || !worthWaitingOut(err)) break;
      onRetry?.(i + 1, err);
      await new Promise((r) => setTimeout(r, BACKOFF_MS[i]));
    }
  }
  throw lastErr;
}

export function engineUnavailable(err: any): ServiceUnavailableException {
  return new ServiceUnavailableException(
    'The conversation could not be reached just now, so this session cannot continue this minute. Nothing you have already said has been lost. Please try again shortly, and if it keeps happening tell the person who set this ground up - it is a problem on our side, not anything you did.',
  );
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Groundwork house style: no em/en dashes, straight quotes only, no ellipsis
 * character, no non-breaking spaces, no double hyphens. The model tends to echo
 * en-dashes back (our own prompts contain "3-5 sentence" phrasing), so we
 * normalize every AI response at the output boundary. This text is shown to
 * customers in check-ins and reports.
 */
/**
 * A CONDITIONAL WITH NOTHING IN FRONT OF IT.
 *
 * The engine has a template it uses often and well: "Does the new hire know that is how you see the
 * role? And if so, how did you describe it to them?" - two halves of one fact, which the ONE
 * QUESTION RULE explicitly allows.
 *
 * About one time in four it drops the first half. Read on a real setup:
 *
 *   "That third one, the behavioural change, is often the hardest and the most important.
 *    And if so, how was that communicated?"
 *
 * "And if so" refers to nothing. The person is left working out what they were asked, in the one
 * exchange where the product is supposed to be the clearest thing in the room. Counted across 1,901
 * AI turns: three well-formed, one orphaned.
 *
 * The connective is dropped rather than the question repaired - inventing the missing half would be
 * writing somebody a question nobody asked. "How was that communicated?" is complete and loses
 * nothing. Only when there is no question before it in the same turn: where the first half IS
 * there, this leaves it exactly alone.
 */
export function noDanglingConditional(text: string): string {
  if (!text) return text;
  return text.replace(
    /(^|[.!?]\s+)(And |But |So )?[Ii]f so,\s*(\w)/g,
    (whole, before: string, _connective: string, firstLetter: string, at: number) => {
      /* A question mark anywhere before this is the other half doing its job. */
      if (text.slice(0, at + before.length).includes('?')) return whole;
      /* The word that followed "if so," now starts the sentence, so it is capitalised - otherwise
         dropping the connective leaves "That is the hardest one. how was that communicated?" */
      return before + firstLetter.toUpperCase();
    },
  );
}

/**
 * THE PUNCTUATION HALF OF THE HOUSE STYLE, FOR STRUCTURED OUTPUT.
 *
 * `houseStyle` runs on every conversational reply and never ran on `extract`, which is what writes
 * reports - so a report reached a customer reading "The consultant's advice about the November
 * budget cycle was noted as useful" with a curly apostrophe, and the sentence before it ended
 * "...it is in their own session.]" with a bracket that had no opener anywhere in the text.
 *
 * Only punctuation here, deliberately. `noDanglingConditional` rewrites a sentence, which is right
 * for a chat turn being read once and wrong to do silently to every string in a structured result -
 * some of those strings are enum values and identifiers.
 *
 * THE ORPHANED BRACKET IS REMOVED ONLY WHERE IT NEVER OPENED. A closing bracket with a matching
 * opener is somebody's parenthesis and stays exactly as written.
 */
export function justThePunctuation(text: string): string {
  if (!text) return text;
  let out = text
    .replace(/[\u2014\u2013]/g, '-')
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u2026/g, '...')
    .replace(/\u00a0/g, ' ')
    .replace(/--+/g, '-');
  for (const [open, close] of [['[', ']'], ['(', ')'], ['{', '}']] as [string, string][]) {
    const opens = out.split(open).length - 1;
    let closes = out.split(close).length - 1;
    while (closes > opens) {
      const at = out.lastIndexOf(close);
      if (at < 0) break;
      out = out.slice(0, at) + out.slice(at + 1);
      closes -= 1;
    }
  }
  return out;
}

/** Every string in a structured result, punctuation normalised, shape untouched. */
export function punctuationEverywhere<T>(value: T): T {
  if (typeof value === 'string') return justThePunctuation(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => punctuationEverywhere(v)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = punctuationEverywhere(v);
    return out as T;
  }
  return value;
}

export function houseStyle(text: string): string {
  if (!text) return text;
  return noDanglingConditional(text)
    .replace(/[—–]/g, '-') // em/en dash -> hyphen
    .replace(/[“”]/g, '"') // curly double quotes -> straight
    .replace(/[‘’]/g, "'") // curly single quotes/apostrophes -> straight
    .replace(/…/g, '...') // ellipsis char -> three dots
    .replace(/ /g, ' ') // non-breaking space -> space
    .replace(/--+/g, '-'); // collapse double hyphens
}

// gemini-2.5-pro is a thinking model: reasoning tokens are drawn from the same
// budget as maxOutputTokens. Bound thinking so it cannot consume the whole
// budget and truncate the visible answer mid-sentence (observed in real
// transcripts, e.g. "...pipeline reviews. What" cut off cold).
const THINKING_BUDGET = 2048;

// Conversational turns (respond / respondStream) use a much smaller thinking budget.
// A chat reply does not need deep reasoning, and the 2048 budget was the dominant
// latency cost on live turns (20-37s): thinking tokens are generated before the
// visible answer, so they also block time-to-first-token. Report/synthesis (extract,
// which sets no explicit budget) and document vision (respondWithMedia) keep the
// deeper budget - a one-time spinner there is fine.
const CONVERSATION_THINKING_BUDGET = 256;

/**
 * HOW LONG ANYBODY WAITS, AND IT IS SHORTER THAN IT WAS.
 *
 * These were ninety seconds for a plain call and forty-five for a stream to open, chosen when a
 * missed deadline was a dead end. It is not one any more - a call that runs out of time is retried
 * now, usually landing fast on the second go - so the ceiling can be what a person will actually
 * sit through rather than the longest a call might conceivably take.
 *
 * Twenty seconds, three attempts at worst, and almost always one fast one.
 */
export const A_CALL_WAITS = 20_000;
/** Background reads nobody is sitting in front of get longer: a report is a bigger piece of work. */
export const A_BACKGROUND_CALL_WAITS = 60_000;
/**
 * AND ONE READ IS A DIFFERENT SIZE OF WORK ALTOGETHER.
 *
 * Sixty seconds is a report about two or three people. Reading a hundred separate organisations
 * into one picture is a much larger prompt and a much larger structured answer, and it timed out
 * three times in a row at sixty - which surfaced as a report that quietly had nothing in it.
 *
 * Given its own number rather than raising the background one, because every other background read
 * genuinely should give up at a minute: a slow two-party synthesis is a symptom, not a size.
 */
export const A_HUNDRED_ACCOUNTS_WAIT = 240_000;
/** How long the chat waits for a stream to open before saying it could not. */
export const OPENING_A_STREAM_WAITS = 20_000;
/** And how long it waits between chunks once one has opened. */
export const A_CHUNK_WAITS = 30_000;

/**
 * A promise with a clock on it, and the clock is always cleared.
 *
 * Written out rather than inlined because the version that leaks is the one that looks right: a
 * `Promise.race` against a bare `setTimeout` keeps the timer alive after the race is won, and in a
 * chat that is one dangling timer per answer.
 */
export async function withADeadline<T>(work: Promise<T>, ms: number, whatFailed: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${whatFailed} after ${Math.round(ms / 1000)}s`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

@Injectable()
export class AnthropicService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AnthropicService.name);
  private client: GoogleGenAI;
  private model: string;
  /** What a person in a conversation talks to. See geminiConfig.conversationModel. */
  private conversationModel: string;
  private maxTokens: number;

  constructor(private config: ConfigService) {
    const inlineJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (inlineJson) {
      const keyPath = path.join(os.tmpdir(), 'gcp-service-account.json');
      fs.writeFileSync(keyPath, inlineJson, { encoding: 'utf8' });
      process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;
    } else {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(process.cwd(), 'credentials/service-account.json');
    }

    this.client = this.buildClient();
    this.model = this.config.get<string>('gemini.model') || 'gemini-2.5-pro';
    this.conversationModel = this.config.get<string>('gemini.conversationModel') || 'gemini-2.5-flash';
    /*
     * A PREVIEW MODEL SITS OUTSIDE THE DATA PROCESSING TERMS. See
     * a-preview-model-has-no-data-terms.ts — Google's Service Specific Terms exclude Pre-GA
     * Offerings from the Cloud Data Processing Addendum, and the model is one environment variable.
     * Refused loudly at boot rather than logged: a deployment processing check-ins outside the DPA
     * should not start, and a warning in a log is a thing nobody reads until afterwards.
     */
    const notAllowed = whyThisModelIsNotAllowed(this.model) || whyThisModelIsNotAllowed(this.conversationModel);
    if (notAllowed) throw new Error(`Refusing to start: ${notAllowed}`);
    // Floor at 8192 (configuration.ts's own default). A low cap (e.g. a stale
    // GEMINI_MAX_TOKENS=2048) leaves too little room once thinking tokens are
    // counted, truncating the answer. NOTE: prod sets its own GEMINI_MAX_TOKENS;
    // this floor guarantees at least 8192 there too, so prod needs no env change.
    this.maxTokens = Math.max(this.config.get<number>('gemini.maxTokens') || 8192, 8192);
  }


  /**
   * A fresh client. Held in one place so it can be REBUILT, which is the whole
   * point of the recovery below.
   */
  private buildClient(): GoogleGenAI {
    return new GoogleGenAI({
      vertexai: true,
      project: this.config.get<string>('gemini.projectId') || 'groundwork-500011',
      location: this.config.get<string>('gemini.location') || 'us-central1',
    });
  }

  /**
   * A long-lived client can die while the process stays healthy.
   *
   * Observed twice in a 12-session run: after roughly 250 conversations every
   * AI call from the running app failed, while a brand new process on the same
   * credentials worked immediately. Process-local, so not quota and not the
   * network - most likely a pooled connection or a credential held inside the
   * client. Meanwhile /health kept returning "ok", because it never made an AI
   * call, so nothing would have alerted in production.
   *
   * Rather than guess at the cause, recover from it: after a few consecutive
   * failures, throw the client away and build a new one. Any single call can
   * still fail; what must not happen is the engine staying dead until someone
   * notices by hand.
   */
  private consecutiveFailures = 0;
  private static readonly REBUILD_AFTER_FAILURES = 3;
  private lastRebuildAt: Date | null = null;

  private noteSuccess() {
    this.consecutiveFailures = 0;
  }

  private noteFailure(where: string, err: unknown) {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= AnthropicService.REBUILD_AFTER_FAILURES) {
      this.logger.error(
        `${this.consecutiveFailures} consecutive AI failures (${where}). Rebuilding the client - a stale client is the known failure mode here.`,
      );
      this.client = this.buildClient();
      this.lastRebuildAt = new Date();
      this.consecutiveFailures = 0;
    }
  }

  /**
   * THE PROBE RUNS FROM INSIDE, ON A CLOCK, AND WRITES DOWN WHAT IT SAW.
   *
   * /health/ai used to make the real call on every request. That kept the lesson below and opened
   * the model budget to anyone on the internet, because the route sits outside every guard. Now the
   * same call happens here every five minutes - and once at boot, so a monitor is not told "no
   * probe yet" for the first five minutes of every deploy - and the route reads the record.
   */
  private lastProbe: { ok: boolean; at: Date; latencyMs: number; error?: string } | null = null;
  private static readonly PROBE_EVERY_MS = 5 * 60_000;

  onApplicationBootstrap() {
    this.probeTheEngine().catch((err) => this.logger.warn(`First engine probe failed to run: ${err?.message}`));
  }

  @Cron('*/5 * * * *', { timeZone: 'UTC' })
  async probeTheEngine(): Promise<void> {
    const result = await this.healthCheck();
    this.lastProbe = { ok: result.ok, at: new Date(), latencyMs: result.latencyMs, ...(result.error ? { error: result.error } : {}) };
    if (!result.ok) this.logger.error(`Engine probe failed: ${result.error ?? 'empty response'}`);
  }

  /**
   * What the last probe saw, for /health/ai. Not ok when the probe failed, has not run, or is more
   * than two intervals old - a stale "ok" is the exact thing the original incident taught us not to
   * trust.
   */
  lastProbeOutcome(): { ok: boolean; probedAt: Date | null; ageMs: number | null; latencyMs: number | null; model: string; models: { conversation: string; reports: string }; lastRebuildAt: Date | null; error?: string } {
    const common = { model: this.model, models: this.modelsInUse(), lastRebuildAt: this.lastRebuildAt };
    if (!this.lastProbe) return { ok: false, probedAt: null, ageMs: null, latencyMs: null, ...common, error: 'no probe has completed yet' };
    const ageMs = Date.now() - this.lastProbe.at.getTime();
    const stale = ageMs > 2 * AnthropicService.PROBE_EVERY_MS;
    return {
      ok: this.lastProbe.ok && !stale,
      probedAt: this.lastProbe.at,
      ageMs,
      latencyMs: this.lastProbe.latencyMs,
      ...common,
      ...(stale ? { error: `last probe is ${Math.round(ageMs / 60_000)} minutes old` } : this.lastProbe.error ? { error: this.lastProbe.error } : {}),
    };
  }

  /**
   * Is the engine actually reachable RIGHT NOW, from THIS process?
   *
   * Deliberately makes a real call. A health check that does not touch the model
   * cannot tell you the model is unreachable, which is exactly how this went
   * unnoticed. Called by the probe above and nothing else: an inbound request
   * must never be what triggers a model call on an unguarded route.
   */
  private async healthCheck(): Promise<{ ok: boolean; latencyMs: number; model: string; models: { conversation: string; reports: string }; lastRebuildAt: Date | null; error?: string }> {
    const started = Date.now();
    try {
      const res = await this.client.models.generateContent({
        model: this.model,
        contents: [{ role: 'user', parts: [{ text: 'Reply with the single word: ok' }] }],
        // Real headroom, and the LOWEST thinking budget this model accepts
        // (2.5-pro rejects 0). A tiny cap gets eaten by thinking tokens before
        // any text is produced, which makes a WORKING engine report unhealthy -
        // the same trap the maxTokens floor in the constructor guards against.
        config: { maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 128 } },
      });
      const ok = !!res?.text;
      if (ok) this.noteSuccess();
      else this.noteFailure('healthCheck', new Error('empty response'));
      return { ok, latencyMs: Date.now() - started, model: this.model, models: this.modelsInUse(), lastRebuildAt: this.lastRebuildAt };
    } catch (err: any) {
      this.noteFailure('healthCheck', err);
      return {
        ok: false,
        latencyMs: Date.now() - started,
        model: this.model,
        models: this.modelsInUse(),
        lastRebuildAt: this.lastRebuildAt,
        error: String(err?.message ?? err).slice(0, 300),
      };
    }
  }

  /**
   * Streaming variant of respond(). Yields answer text deltas as they arrive.
   * Each delta is passed through houseStyle() so nothing un-normalized reaches
   * the user live. Every banned character we normalize is a single code point
   * (em/en dash, curly quote, ellipsis, nbsp), so it cannot be split across two
   * chunks - per-delta sanitizing is safe for those. The only straddle-sensitive
   * rule is the "--" collapse; the caller still applies houseStyle() once to the
   * accumulated text at the end, which catches a double hyphen split across deltas.
   */
  async *respondStream(systemPrompt: string, history: ChatTurn[]): AsyncGenerator<string, void, unknown> {
    const contents = history.map((t) => ({
      role: t.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: t.content }],
    }));
    /*
     * A STREAM THAT NEVER ARRIVES USED TO WAIT FOR EVER.
     *
     * `respond()` has had a ninety-second ceiling since the hour every model call failed while
     * /health said ok. This one, the path the chat actually uses, had none - not on opening the
     * stream and not between chunks. Watched live: an answer typed into a check-in sat for over ten
     * minutes with the dots still going, because nothing was ever going to give up.
     *
     * Two clocks, because there are two ways to hang. One on opening the stream, and one between
     * chunks - a stream that opens and then stalls halfway through a sentence never trips a total
     * budget that a long healthy answer would also trip. Both throw, and a throw is something the
     * caller can say out loud. Waiting is not.
     */
    const stream = await withADeadline(
      this.client.models.generateContentStream({
        model: this.conversationModel,
        contents,
        config: { systemInstruction: systemPrompt, maxOutputTokens: this.maxTokens, thinkingConfig: { thinkingBudget: this.conversationThinkingBudget() } },
      }),
      OPENING_A_STREAM_WAITS,
      'Gemini respondStream() did not open',
    );
    /*
     * A CHUNK OF THE ANSWER WENT MISSING, MID-SENTENCE, AND WAS SAVED THAT WAY.
     *
     * Read off a real transcript: "That's a strong,waiting more than an hour in September" and "a
     * named on-call person published by Friday each week." A clause and an opening quote mark are
     * gone. Nothing in the join drops text; the only line here that discards a part is the one that
     * skips `thought` parts, and a thinking model interleaves thought and answer parts on one
     * stream. A part flagged thought that arrives AFTER the answer has started is not the model
     * thinking, whatever the flag says, and skipping it is how a sentence loses its middle.
     *
     * So thought parts are skipped only until the first answer text has been seen. From then on a
     * part with text is answer.
     */
    let answerHasBegun = false;
    const chunks = (stream as AsyncIterable<unknown>)[Symbol.asyncIterator]();
    for (;;) {
      const next = await withADeadline(chunks.next(), A_CHUNK_WAITS, 'Gemini respondStream() stalled mid-answer');
      if (next.done) break;
      const parts = (next.value as any)?.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if (part?.thought && !answerHasBegun) continue;
        if (part?.text) {
          answerHasBegun = true;
          yield houseStyle(part.text as string);
        }
      }
    }
  }

  /**
   * Flash answers fastest with no thinking at all (0.65s to the first word against 2.3s with a
   * 256 budget); pro cannot go below 128 and is slow to start regardless. The budget follows the
   * model so that swapping GEMINI_CONVERSATION_MODEL back to pro does not also swap in a budget
   * that model rejects.
   */
  private conversationThinkingBudget(): number {
    return /flash/.test(this.conversationModel) ? 0 : CONVERSATION_THINKING_BUDGET;
  }

  /** For logs and the health page. */
  modelsInUse() {
    return { conversation: this.conversationModel, reports: this.model };
  }

  /**
   * `options` is for callers that need a steadier answer than the default sampling gives, such as
   * the pattern detector's confirming call (see the-detector-read-twice.ts and the long comment
   * above `temperature` in extract() for why this is opt-in, not a change to what anybody already
   * gets). Every existing caller passes nothing and keeps the model's own default behaviour.
   */
  async respond(systemPrompt: string, history: ChatTurn[], options: { temperature?: number; seed?: number } = {}): Promise<string> {
    const contents = history.map((t) => ({
      role: t.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: t.content }],
    }));

    let res: Awaited<ReturnType<typeof this.client.models.generateContent>>;
    /* A 429 under load is "not this second", not an outage - see tryAgainIfItIsJustBusy. The
       deadline sits INSIDE the retry, so a slow call is cut off and asked again rather than
       being waited out once and handed to the person as a failure. */
    try {
      res = await tryAgainIfItIsJustBusy(
        () => withADeadline(
          this.client.models.generateContent({
            model: this.conversationModel,
            contents,
            config: {
              systemInstruction: systemPrompt,
              maxOutputTokens: this.maxTokens,
              thinkingConfig: { thinkingBudget: this.conversationThinkingBudget() },
              ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
              ...(options.seed !== undefined ? { seed: options.seed } : {}),
            },
          }),
          A_CALL_WAITS,
          'Gemini respond() timed out',
        ),
        (n, err) => this.logger.warn(`respond() busy (${err?.message ?? err}); retry ${n}`),
      );
      this.noteSuccess();
    } catch (err: any) {
      this.logger.error(`respond() Gemini call failed: ${err.message}`);
      this.noteFailure('respond', err);
      throw engineUnavailable(err);
    }

    const text = res.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('').trim() ?? '';
    if (!text) {
      throw engineUnavailable(new Error('AI returned an empty response'));
    }
    return houseStyle(text);
  }

  /**
   * Multimodal call: send Gemini a piece of raw media (image, PDF-as-image,
   * etc.) alongside a text prompt in the same turn. Used for document
   * assessment - Gemini can read images and PDFs directly rather than going
   * through separate OCR/parsing libraries.
   */
  async respondWithMedia(systemPrompt: string, prompt: string, media: { mimeType: string; base64: string }): Promise<string> {
    let res: Awaited<ReturnType<typeof this.client.models.generateContent>>;
    try {
      res = await tryAgainIfItIsJustBusy(
        () => withADeadline(
          this.client.models.generateContent({
            model: this.model,
            contents: [{
              role: 'user',
              parts: [
                { inlineData: { mimeType: media.mimeType, data: media.base64 } },
                { text: prompt },
              ],
            }],
            config: { systemInstruction: systemPrompt, maxOutputTokens: this.maxTokens, thinkingConfig: { thinkingBudget: THINKING_BUDGET } },
          }),
          /* A document read is bigger than a chat turn and nobody is watching a composer for it. */
          A_BACKGROUND_CALL_WAITS,
          'Gemini respondWithMedia() timed out',
        ),
        (n, err) => this.logger.warn(`respondWithMedia() busy (${err?.message ?? err}); retry ${n}`),
      );
    } catch (err: any) {
      this.logger.error(`respondWithMedia() Gemini call failed: ${err.message}`);
      throw engineUnavailable(err);
    }
    const text = res.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('').trim() ?? '';
    if (!text) throw engineUnavailable(new Error('AI returned an empty response'));
    return houseStyle(text);
  }

  /**
   * `thinkingBudget` is for the small, live extractions: the Setup turn pulls a handful of typed
   * fields out of a short conversation while a person waits, and with the model's default budget
   * that pull took longer than the reply it followed (28s observed, against 2s for the reply).
   * Report synthesis leaves it unset and keeps the deeper default.
   */
  async extract<T = any>(
    systemPrompt: string,
    history: ChatTurn[],
    tool: { name: string; description: string; input_schema: any },
    options: { thinkingBudget?: number; fast?: boolean; patient?: boolean; temperature?: number; seed?: number } = {},
  ): Promise<T | null> {
    const contents = history.map((t) => ({
      role: t.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: t.content }],
    }));

    let res: Awaited<ReturnType<typeof this.client.models.generateContent>>;
    /* Same treatment as respond(): an extraction lost to a burst is a report built from less. */
    try {
      /*
       * THIS ONE HAD NO CEILING AT ALL. `respond` and `respondWithMedia` each carried ninety
       * seconds and this carried nothing, so a hung extraction waited for as long as the socket
       * held - and some extractions run while a person is mid-check-in, not in the background.
       *
       * `fast` is the live one, pulled out while somebody waits, so it gets the short ceiling the
       * chat uses. Everything else is a report or a record read and gets the longer one.
       */
      res = await tryAgainIfItIsJustBusy(() => withADeadline(this.client.models.generateContent({
        model: options.fast ? this.conversationModel : this.model,
        contents,
        config: {
          systemInstruction: systemPrompt,
          /* A patient read is a big one: eight thousand tokens is not a hundred organisations laid
             out in ten sections, and a truncated tool call comes back as an empty object. */
          maxOutputTokens: options.patient ? 32768 : 8192,
          /*
           * TEMPERATURE, WHICH NO CALLER SETS, AND THE MEASUREMENT THAT SAYS SO.
           *
           * Added to answer a fair question: a lead should get the same judgement twice from the
           * same record, so would a lower temperature make the judgement steadier? Measured the
           * only way that settles it - the same material, five samples, at the model's default
           * and at zero, on five scenarios, scoring both how alike the answers were AND whether
           * they still reached the right answer:
           *
           *   scenario         default: alike / right      temperature 0: alike / right
           *   loans                38% / 5 of 5                35% / 5 of 5
           *   pip                  45% / 3 of 5                57% / 0 of 5
           *   contractreview       49% / 5 of 5                47% / 5 of 5
           *   workplan             41% / 1 of 5                56% / 0 of 5
           *   renewal              31% / 5 of 5                43% / 5 of 5
           *
           * Consistency rose about seven points. Correctness fell from 19 of 25 to 15 of 25, and
           * on the performance-plan scenario the five answers became MORE alike and all five
           * wrong: at zero it converged on "they are working to two different targets" every
           * time, and stopped saying the target was never written down, which is the finding.
           *
           * A steadier wrong answer is worse than a varying right one, so nothing sets this. The
           * option stays because it is what made the measurement possible; anybody switching it
           * on owes the same two columns, not just the first.
           */
          ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
          ...(options.seed !== undefined ? { seed: options.seed } : {}),
          ...(options.thinkingBudget !== undefined ? { thinkingConfig: { thinkingBudget: options.thinkingBudget } } : {}),
          tools: [{ functionDeclarations: [this.convertTool(tool)] }],
          toolConfig: {
            functionCallingConfig: {
              mode: 'ANY' as any,
              allowedFunctionNames: [tool.name],
            },
          },
        },
      }), options.patient ? A_HUNDRED_ACCOUNTS_WAIT : options.fast ? A_CALL_WAITS : A_BACKGROUND_CALL_WAITS, 'Gemini extract() timed out'), (n, err) => this.logger.warn(`extract() busy (${err?.message ?? err}); retry ${n}`));
    } catch (err: any) {
      this.logger.error(`extract() Gemini call failed: ${err.message}`);
      this.noteFailure('extract', err);
      throw engineUnavailable(err);
    }

    let fnCall = res.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall);

    /**
     * ONE RETRY WHEN THE MODEL DOES NOT CALL THE TOOL, AND HERE IS WHAT IT COST
     * NOT TO HAVE ONE.
     *
     * On a live twelve-session run, the CLOSING synthesis - the one that writes
     * the closing tiers, the end states and closingComplete - failed on exactly
     * this: the model returned prose instead of calling emit_report. One attempt,
     * no retry, the listener logged the error, and the ground's report kept its
     * mid-ground state permanently. Nothing told anybody, and the report looks
     * finished.
     *
     * The tool config is `mode: 'ANY'` with a single allowed name, so a missing
     * call is not the model disagreeing with the request - it is a transient
     * failure of the kind a second attempt fixes. Retrying once is the cheapest
     * honest fix, and it is at the seam rather than at the twelve call sites.
     *
     * One retry, not a loop: if the second attempt also comes back as prose,
     * something about the request is wrong and hammering it would just spend
     * money on the same answer.
     */
    if (!fnCall?.functionCall) {
      this.logger.warn(`extract(): model did not call tool ${tool.name}. Trying once more.`);
      try {
        const again = await this.client.models.generateContent({
          model: this.model,
          contents,
          config: {
            systemInstruction: systemPrompt,
            maxOutputTokens: 8192,
            tools: [{ functionDeclarations: [this.convertTool(tool)] }],
            toolConfig: {
              functionCallingConfig: {
                mode: 'ANY' as any,
                allowedFunctionNames: [tool.name],
              },
            },
          },
        });
        fnCall = again.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall);
      } catch (err: any) {
        this.logger.error(`extract() retry failed: ${err.message}`);
        this.noteFailure('extract', err);
      }
    }

    /*
     * PROSE THAT IS THE ANSWER IS THE ANSWER. Twenty-four discovery accounts, read in chunks of six:
     * on half the chunks the model wrote the eight lists as a JSON block in a text part instead of
     * calling the tool, twice, and the direction came back null (rerun, 20 Sep 2026). If what came
     * back parses and carries the tool's required fields, it is taken as the call it should have been.
     */
    if (!fnCall?.functionCall) {
      const asText = this.theJsonInTheText(res, tool);
      if (asText) {
        this.logger.warn(`extract(): tool ${tool.name} was answered as JSON text; taking it as the call.`);
        fnCall = { functionCall: { name: tool.name, args: asText } } as any;
      }
    }

    if (!fnCall?.functionCall) {
      this.logger.warn(`extract(): model did not call tool ${tool.name} on either attempt`);
      return null;
    }
    // Enum values are passed through untouched - only schema.type is uppercased.
    const args = fnCall.functionCall.args;
    if (args === null || args === undefined) {
      this.logger.warn(`extract(): tool ${tool.name} returned null/undefined args`);
      return null;
    }

    /*
     * AND ITEMS WITH NOTHING IN THEM ARE NOT ITEMS. See
     * an-item-the-model-left-empty-is-not-an-item.ts for the live report this was found on: three
     * headed cards on somebody's own report with no words under any of them.
     *
     * Asked again once when it happens, because the same request answered correctly on every
     * reproduction - so a second attempt is likely to have the content, and the count is the only
     * signal there is that the first one did not. Then whichever answer we keep is cleaned, so a
     * page can never be handed an item it has to draw and has nothing to draw.
     */
    /*
     * PUNCTUATION NORMALISED HERE, at the one boundary every structured result passes through.
     * `houseStyle` has always run on conversational replies and never on this, which is what writes
     * reports - see justThePunctuation for the two defects that reached a customer's report.
     */
    const first = withoutTheEmptyOnes(punctuationEverywhere(args) as T);
    if (first.dropped === 0) return first.value;
    /*
     * Only when cleaning took a whole array with it. A stray empty item among real ones costs the
     * reader nothing once it is gone, and this retry is a second call to the slowest step there is.
     */
    if (!first.emptiedAnArray) {
      this.logger.warn(`extract(): dropped ${first.dropped} empty item(s) from ${tool.name}; the rest stand.`);
      return first.value;
    }

    this.logger.warn(
      `extract(): tool ${tool.name} returned ${first.dropped} item(s) with nothing in them. Asking once more.`,
    );
    try {
      const cleaner = await this.client.models.generateContent({
        model: this.model,
        contents,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 8192,
          tools: [{ functionDeclarations: [this.convertTool(tool)] }],
          toolConfig: { functionCallingConfig: { mode: 'ANY' as any, allowedFunctionNames: [tool.name] } },
        },
      });
      const retryArgs = cleaner.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall)?.functionCall?.args;
      if (retryArgs) {
        const second = withoutTheEmptyOnes(punctuationEverywhere(retryArgs) as T);
        /* The better of the two, not simply the newer: a retry that is emptier is not an improvement. */
        if (second.dropped < first.dropped) return second.value;
      }
    } catch (err: any) {
      this.logger.warn(`extract(): the retry for empty items failed: ${err?.message ?? err}`);
    }
    return first.value;
  }

  /** A JSON object in the text parts of a response that has the tool's required fields, or null. */
  private theJsonInTheText(res: any, tool: { input_schema?: any }): Record<string, unknown> | null {
    const text = (res?.candidates?.[0]?.content?.parts ?? [])
      .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
      .join('\n');
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try {
      const parsed = JSON.parse(text.slice(start, end + 1));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
      const required: string[] = Array.isArray(tool?.input_schema?.required) ? tool.input_schema.required : [];
      return required.every((k) => k in parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private convertTool(tool: { name: string; description: string; input_schema: any }) {
    /*
     * A TOOL WITH NO NAME IS A CALL THAT CAN NEVER SUCCEED.
     *
     * Gemini answers `tools[0].function_declarations[0].name: [REQUIRED_FIELD_MISSING]` and the
     * whole extraction fails - every time, for as long as that caller exists. Seen repeatedly in a
     * real run's logs, where the only trace was the provider's own error and nothing said which of
     * the twenty-six extractions it belonged to.
     *
     * Thrown here rather than sent, with the description in the message, because the failure then
     * names its own caller instead of arriving as an anonymous 400 from somebody else's API.
     */
    if (!tool?.name?.trim()) {
      throw new Error(
        `extract() was given a tool with no name, so the call could never succeed. Description: "${tool?.description ?? '(none)'}".`,
      );
    }
    return {
      name: tool.name,
      description: tool.description,
      parameters: this.convertSchema(tool.input_schema),
    };
  }

  private convertSchema(schema: any): any {
    if (!schema || typeof schema !== 'object') return schema;
    const out: any = {};
    // JSON Schema allows a union type (["string","null"]) to mean nullable.
    // Gemini wants a single scalar type plus a nullable flag, and calling
    // toUpperCase() on the array threw - which silently killed the whole
    // extraction. Dependency extraction used union types, so "waiting on" never
    // populated from a real conversation.
    if (Array.isArray(schema.type)) {
      const nonNull = schema.type.filter((t: any) => t !== 'null');
      if (nonNull.length) out.type = String(nonNull[0]).toUpperCase();
      if (schema.type.includes('null')) out.nullable = true;
    } else if (typeof schema.type === 'string') {
      out.type = schema.type.toUpperCase();
    }
    if (schema.description) out.description = schema.description;
    if (schema.enum) out.enum = schema.enum;
    if (schema.required) out.required = schema.required;
    if (schema.properties) {
      out.properties = {};
      for (const [k, v] of Object.entries(schema.properties)) {
        out.properties[k] = this.convertSchema(v);
      }
    }
    if (schema.items) out.items = this.convertSchema(schema.items);
    return out;
  }
}
