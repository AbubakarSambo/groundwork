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
  return /resource[ _]exhausted|rate limit|too many requests|overloaded|unavailable/i.test(said);
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

/** How long the chat waits for a stream to open before saying it could not. */
export const OPENING_A_STREAM_WAITS = 45_000;
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

  async respond(systemPrompt: string, history: ChatTurn[]): Promise<string> {
    const contents = history.map((t) => ({
      role: t.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: t.content }],
    }));

    const TIMEOUT_MS = 90_000;
    let res: Awaited<ReturnType<typeof this.client.models.generateContent>>;
    /* A 429 under load is "not this second", not an outage - see tryAgainIfItIsJustBusy. */
    try {
      res = await tryAgainIfItIsJustBusy(
        () => {
          const call = this.client.models.generateContent({
            model: this.conversationModel,
            contents,
            config: { systemInstruction: systemPrompt, maxOutputTokens: this.maxTokens, thinkingConfig: { thinkingBudget: this.conversationThinkingBudget() } },
          });
          const timeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Gemini respond() timed out after 90s')), TIMEOUT_MS),
          );
          return Promise.race([call, timeout]);
        },
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
    const TIMEOUT_MS = 90_000;
    let res: Awaited<ReturnType<typeof this.client.models.generateContent>>;
    try {
      const call = this.client.models.generateContent({
        model: this.model,
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType: media.mimeType, data: media.base64 } },
            { text: prompt },
          ],
        }],
        config: { systemInstruction: systemPrompt, maxOutputTokens: this.maxTokens, thinkingConfig: { thinkingBudget: THINKING_BUDGET } },
      });
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini respondWithMedia() timed out after 90s')), TIMEOUT_MS),
      );
      res = await Promise.race([call, timeout]);
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
    options: { thinkingBudget?: number; fast?: boolean } = {},
  ): Promise<T | null> {
    const contents = history.map((t) => ({
      role: t.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: t.content }],
    }));

    let res: Awaited<ReturnType<typeof this.client.models.generateContent>>;
    /* Same treatment as respond(): an extraction lost to a burst is a report built from less. */
    try {
      res = await tryAgainIfItIsJustBusy(() => this.client.models.generateContent({
        model: options.fast ? this.conversationModel : this.model,
        contents,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 8192,
          ...(options.thinkingBudget !== undefined ? { thinkingConfig: { thinkingBudget: options.thinkingBudget } } : {}),
          tools: [{ functionDeclarations: [this.convertTool(tool)] }],
          toolConfig: {
            functionCallingConfig: {
              mode: 'ANY' as any,
              allowedFunctionNames: [tool.name],
            },
          },
        },
      }), (n, err) => this.logger.warn(`extract() busy (${err?.message ?? err}); retry ${n}`));
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
    const first = withoutTheEmptyOnes(args as T);
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
        const second = withoutTheEmptyOnes(retryArgs as T);
        /* The better of the two, not simply the newer: a retry that is emptier is not an improvement. */
        if (second.dropped < first.dropped) return second.value;
      }
    } catch (err: any) {
      this.logger.warn(`extract(): the retry for empty items failed: ${err?.message ?? err}`);
    }
    return first.value;
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
