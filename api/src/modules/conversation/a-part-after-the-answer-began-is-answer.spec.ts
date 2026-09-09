/**
 * A CHUNK OF THE ANSWER WENT MISSING, MID-SENTENCE. See respondStream.
 *
 * The stream skipped every part flagged `thought`. A thinking model interleaves thought and answer
 * parts, and a part flagged thought arriving after the answer has begun carried answer text - so the
 * saved transcript read "That's a strong,waiting more than an hour". Thought parts are skipped only
 * until the first answer text; after that, text is text.
 */
import { houseStyle } from './anthropic.service';

async function* fakeStream(parts: { text?: string; thought?: boolean }[][]) {
  for (const p of parts) yield { candidates: [{ content: { parts: p } }] };
}

/** The same loop as respondStream, on a fake stream. Kept identical on purpose. */
async function collect(stream: AsyncIterable<any>): Promise<string> {
  let answerHasBegun = false;
  let out = '';
  for await (const chunk of stream) {
    const parts = (chunk as any).candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part?.thought && !answerHasBegun) continue;
      if (part?.text) { answerHasBegun = true; out += houseStyle(part.text as string); }
    }
  }
  return out;
}

describe('a part after the answer began is answer', () => {
  it('skips thoughts before the answer', async () => {
    const text = await collect(fakeStream([[{ text: 'planning...', thought: true }], [{ text: "That's a strong, " }]]));
    expect(text).toBe("That's a strong, ");
  });

  it('keeps a mid-answer part even when it is flagged as thought', async () => {
    const text = await collect(fakeStream([
      [{ text: 'planning...', thought: true }],
      [{ text: "That's a strong, " }],
      [{ text: 'checkable pair: "zero transfers ', thought: true }],
      [{ text: 'waiting more than an hour in September".' }],
    ]));
    expect(text).toBe("That's a strong, checkable pair: \"zero transfers waiting more than an hour in September\".");
  });
});
