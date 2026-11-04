import type { ChatTurn } from './anthropic.service';

/**
 * WHAT THE MODEL IS GIVEN OF THE CONVERSATION SO FAR (Hafsah, 29 October 2026). Their words in full, and Groundwork's last two turns as
 * they were written, so the conversation flows. An older turn of Groundwork's is given only as the question it asked: what was asked is
 * part of the record, the way it was worded is not, and a fixed sentence of ours left in the history is a sentence the model copies.
 */
const KEPT_AS_WRITTEN = 2;

export function theConversationSoFar(turns: readonly { role: string; content: string | null }[]): ChatTurn[] {
  const ours = turns.map((t, i) => (t.role === 'AI' ? i : -1)).filter((i) => i >= 0);
  const recent = new Set(ours.slice(-KEPT_AS_WRITTEN));
  return turns.map((t, i) => {
    if (t.role !== 'AI') return { role: 'user', content: t.content ?? '' };
    if (recent.has(i)) return { role: 'assistant', content: t.content ?? '' };
    const asked = String(t.content ?? '').split(/(?<=[.!?])\s+/).filter((x) => x.trim().endsWith('?')).join(' ');
    return { role: 'assistant', content: asked || String(t.content ?? '') };
  });
}
