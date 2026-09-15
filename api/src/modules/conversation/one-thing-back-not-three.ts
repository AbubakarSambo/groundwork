/**
 * ONE THING BACK PER TURN. THREE IS A REPORT AGAIN.
 *
 * Three give-back blocks were built, each correctly refusing to hand over more than one fact. None
 * of them knew about the others. Run in a real turn, she said one sentence and got all three:
 *
 *   She: "we are at sixty now, but the real hold up is getting an organised supply side, and Rita is
 *         the one I am worried about"
 *
 *   It:  "You're at sixty, so that's sixty of your hundred and fifty. An organised supply side is the
 *         bottleneck, and Rita is the concern. Rita has also named 'an organised supply side' as
 *         being in the way. You said last time you expect Rita to own the pricing page end to end,
 *         but that she has not been told that. That's worth addressing if you want her focused on
 *         this. What specifically makes you worried about Rita?"
 *
 * Every fact in that is true and useful, and together they are a briefing document with a question
 * stapled to the end. The whole point of the trade is that it stays a conversation. Somebody who
 * wanted a briefing would open the board.
 *
 * Found by running one turn. Every block passed its own tests.
 *
 * THE ORDER. Their own number first: it is the most exact, it is theirs, and reporting progress is
 * usually why they said anything at all. Then the thing somebody has not been told, which is the one
 * fact with an action attached to it. Then what else the room is waiting on, which is worth knowing
 * and can wait for a turn where nothing better is on offer.
 */
export function oneThingBack(blocks: {
  againstTheirNumber?: string;
  alreadySaidAboutThem?: string;
  roomKnows?: string;
}): string {
  const inOrder = [blocks.againstTheirNumber, blocks.alreadySaidAboutThem, blocks.roomKnows];
  return inOrder.find((b) => (b ?? '').trim())?.trim() ?? '';
}
