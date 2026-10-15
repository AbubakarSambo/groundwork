import type { TheEndCard } from '@/api/conversation'

/**
 * THE CLOSING MESSAGE DOES NOT CLAIM A RECORD IT DID NOT SEND (screen fault 2, final walk).
 *
 * Groundwork's own closing line is "That’s all for today. Below is what I wrote down from your
 * answers. Is anything wrong?" - but the end card beneath it only ever lists a person's answers
 * when the engine actually sends `inYourRecord` lines (request 7; as of request 182 it often does
 * not). When it sends none, the card shows "Why answering matters" and "What happens next" only -
 * true, but the message above it still claimed "Below is what I wrote down from your answers.",
 * which was not true of what was on screen.
 *
 * This is screen-side wording only: the engine writes `reply`, and the screens workspace does not
 * touch the engine's prompts. What it can do is not repeat a claim on screen that the same response
 * does not keep - so the middle sentence is dropped, leaving the two sentences either side of it
 * true on their own: "That’s all for today. Is anything wrong?"
 */
const THE_RECORD_CLAIM = ' Below is what I wrote down from your answers.'

/** True once the end card actually has at least one real line for "What is now in your record". */
export function endCardHasRecordLines(endCard: Pick<TheEndCard, 'inYourRecord'> | null | undefined): boolean {
  return (endCard?.inYourRecord ?? []).some((l) => typeof l?.says === 'string' && l.says.trim().length > 0)
}

/**
 * The text to actually show for an AI message, given whatever end card came with it (or with the
 * conversation's close, for a reload). Only ever removes the one sentence, and only when it is
 * there and nothing backs it; every other message passes through unchanged.
 */
export function closingMessageText(content: string, endCard: Pick<TheEndCard, 'inYourRecord'> | null | undefined): string {
  if (!content.includes(THE_RECORD_CLAIM)) return content
  if (endCardHasRecordLines(endCard)) return content
  return content.replace(THE_RECORD_CLAIM, '')
}
