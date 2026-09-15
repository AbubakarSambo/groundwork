/**
 * WHICH BLOCKS ACTUALLY REACH A TURN, AND HOW BIG EACH ONE IS.
 *
 * The prompt is thirty blocks joined at run time and one of them is 116,527 characters. Twenty-nine
 * earn their place by firing only when they apply: coaching when there is a step, patterns when one
 * is surfaced, prior sessions from session two. The base prompt is the only piece sent
 * unconditionally, and it is forty-eight per cent of everything.
 *
 * The plan is to make the thirtieth behave like the other twenty-nine. Before any of it moves, this
 * says what is actually happening: which blocks never fire, which fire on every turn, which fire on
 * the turns somebody complained about.
 *
 * YOU CANNOT TUNE WHAT ALWAYS FIRES. That is the real return here, larger than the size saving. A
 * block nobody can show firing is a block nobody has to argue about.
 *
 * IT LOGS AND CHANGES NOTHING. The prompt returned is byte for byte what it was. This exists so the
 * review of the forty-four blocks is a decision with evidence behind it rather than a judgement
 * call, and so a block that has never fired in a week of real conversations can go without either of
 * us having to be right about it.
 */

export interface ABlockInTheTurn {
  name: string;
  text: string | undefined | null;
}

export interface WhatFired {
  /** Blocks that had content, largest first. */
  fired: { name: string; chars: number }[];
  /** Blocks that were empty this turn. */
  quiet: string[];
  totalChars: number;
}

export function whatFiredThisTurn(blocks: ABlockInTheTurn[]): WhatFired {
  const fired: { name: string; chars: number }[] = [];
  const quiet: string[] = [];
  for (const b of blocks) {
    const chars = (b.text ?? '').trim().length;
    if (chars) fired.push({ name: b.name, chars });
    else quiet.push(b.name);
  }
  fired.sort((a, b) => b.chars - a.chars);
  return { fired, quiet, totalChars: fired.reduce((s, f) => s + f.chars, 0) };
}

/**
 * One line, because this runs on every turn of every conversation.
 *
 * Names and sizes only. Nothing a person said, nothing from the record, nothing that would make a
 * log line something to be careful with.
 */
export function oneLine(what: WhatFired): string {
  const top = what.fired.slice(0, 8).map((f) => `${f.name}:${f.chars}`).join(' ');
  return `prompt ${what.totalChars}c from ${what.fired.length} block(s), ${what.quiet.length} quiet | ${top}`;
}
