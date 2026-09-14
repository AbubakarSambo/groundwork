import { theyPushedBackOnTheQuestions, asksTheSameThingAgain } from '../conversation/asked-twice-and-told-no-twice';

/**
 * SOMETHING SOMEBODY CHOSE NOT TO DO IS NOT AN OPEN GAP IN THEIR OWN REPORT.
 *
 * A lead came to set targets for her team. She was twice asked to connect them to the company's
 * wider strategy, and twice said that was not what she needed: "you are asking the wrong questions
 * which is annoying", then "this line of questioning does not align with what i need to do, please
 * just set targets for my team and track it".
 *
 * Her report carried an open item headed "Link to company strategy", with a line under it telling
 * her to connect the sales goal to the company's main priority in the next session. She had answered
 * that. Twice. Being handed it back as an outstanding task reads as not having listened, and then as
 * being marked down for it. Her words: "it looks a bit rude and will put off the lead."
 *
 * The prompt has been told. This is here because the prompt had already been told the adjacent rule
 * and followed a different one, and because the person reading this report is the lead deciding
 * whether the product is worth anything.
 *
 * NOT A CONTENT JUDGEMENT. It never asks whether a gap is worth raising. It asks one thing: did this
 * person refuse this subject out loud. Where they did, the item goes and everything else stands.
 */
export interface AnOpenItem {
  title: string;
  observation?: string;
  whyItMatters?: string;
  recommendedMove?: string;
}

export interface ATurn {
  role: string;
  content: string;
}

/** The questions somebody pushed back on, taken from what was asked just before they did. */
export function whatTheyDeclined(turns: ATurn[]): string[] {
  const out: string[] = [];
  turns.forEach((t, i) => {
    const theirs = t.role !== 'assistant' && t.role !== 'AI';
    if (!theirs || !theyPushedBackOnTheQuestions(t.content ?? '')) return;
    /* What was put to them immediately before, which is the thing they are refusing. */
    for (let j = i - 1; j >= 0; j -= 1) {
      const before = turns[j];
      if (before.role === 'assistant' || before.role === 'AI') {
        if (before.content?.trim()) out.push(before.content);
        break;
      }
    }
  });
  return out;
}

/**
 * WHAT SURVIVES. An item is dropped only when its subject is one they refused out loud.
 *
 * The comparison is the one the conversation guard uses: two pieces of text about mostly the same
 * things are the same subject. Measured on the real pair - a question asking her to name the wider
 * company objective, and an open item headed "Link to company strategy" whose body says the
 * connection to overall strategy was not explored.
 */
export function withoutWhatTheyDeclined<T extends AnOpenItem>(items: T[], turns: ATurn[]): T[] {
  const declined = whatTheyDeclined(turns);
  if (!declined.length) return items;
  return items.filter((item) => {
    const subject = [item.title, item.observation, item.recommendedMove].filter(Boolean).join(' ');
    return !declined.some((q) => asksTheSameThingAgain(q, subject));
  });
}
