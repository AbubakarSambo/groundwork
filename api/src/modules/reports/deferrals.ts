/**
 * Things named as still-to-do, session after session.
 *
 * WHY THIS IS NOT LEFT TO THE MODEL
 *
 * The leadership patterns the role map cares about most - a conversation that
 * keeps being deferred, a decision nobody makes while someone waits behind it -
 * are not visible in any single session. They are only visible in the shape of
 * the record over time: the same intention restated in session 4, then 5, then
 * 6, each time as though it were new.
 *
 * A twelve-session run contained a textbook example. One account said it still
 * needed to have a conversation in session 4, had not had it in session 6, and
 * finally had it in session 8; and named a pricing decision as nearly done in
 * sessions 4 and 5 before making it in session 7, with another party blocked on
 * it the whole time. The synthesis was asked to look for exactly this and found
 * nothing - not because the input was silent, but because spotting a repetition
 * spread over twenty pages is the kind of bookkeeping a model is worst at and
 * ordinary code is best at.
 *
 * So the counting happens here, deterministically, and the model is handed the
 * finding rather than asked to hunt for it. What the model still decides is
 * whether it means anything and how to say it without naming or quoting anyone.
 *
 * This produces a NOTICE, never a conclusion. "Named as still to do in sessions
 * 4, 6" is a fact about the record. Whether that is a leader who is overloaded,
 * one who is avoiding something, or one waiting on information they never got,
 * is not decidable from the count - and stating it as though it were is the
 * failure this whole product exists to avoid.
 */

export type DeferralEntry = {
  /** Stable display label for the party, as used everywhere else in the corpus. */
  label: string;
  sessionNumber: number | null;
  text: string;
};

export type Deferral = {
  label: string;
  /** The words the repeated mentions have in common - what is being deferred. */
  subject: string;
  /** Sessions where it was named as still outstanding, in order. */
  sessions: number[];
  /** Session where the record shows it finally happened, if it ever did. */
  resolvedAt: number | null;
};

/**
 * Language that marks something as the SPEAKER'S OWN intention, not yet acted on.
 *
 * Deliberately excludes "waiting", which is the opposite situation. Someone
 * saying they are waiting on a colleague is describing a dependency, and an
 * early version that treated the two alike reported the person waiting six
 * sessions for a sales deck as though they were the one who kept failing to
 * produce it. Waiting is counted separately, from the other side, in
 * findWaitingBehind.
 */
const OUTSTANDING =
  /\b(still need|still to|need to|going to|i will|i'?ll|have not|haven'?t|has not|hasn'?t|not yet|yet to|keeps slipping|on my list|on the list|next week|probably|soon|close to|nearly|almost there|owe[sd]?|outstanding|still open|not decided|undecided|have yet to|my call|down to me|sitting with me|pending (a |my |the )?decision|still (deciding|thinking|working out)|put(ting)? off|postponed|pushed (it )?back|another week)\b/i;

/*
 * "OWE" WAS MISSING, AND IT IS THE WORD PEOPLE ACTUALLY USE.
 *
 * A twelve-session ground had the lead say "I still owe the team the decision on
 * scope. It keeps slipping down my list" in eight separate sessions. The engine
 * recorded every one of them as a record entry and the deferral count came back
 * empty, because the list above had "still need" and "need to" but not "owe".
 * One of eight statements matched, the cluster never reached the three-session
 * bar, and the clearest leadership pattern in the run was invisible.
 *
 * The additions are the other plain ways a person says they have not done the
 * thing they said they would: it is outstanding, it is still open, it is my
 * call, it is sitting with me, I keep putting it off. Deliberately still no bare
 * "later" or "eventually" - those appear in ordinary planning talk and would
 * turn every forward-looking sentence into a deferral.
 */

/**
 * Language that marks the same thing as finally done.
 *
 * Checked BEFORE the outstanding test, because the sentence that closes a
 * deferral usually names the deferral: "I made the decision I had been putting
 * off" contains "putting off" and is the opposite of a deferral. Read the wrong
 * way round, the resolution becomes one more count against the person, and the
 * pattern never shows as resolved however long ago they fixed it.
 */
const DONE_WORDS =
  /\b(did finally|finally|i have now|decided|made the (decision|call)|sent|had that conversation|did speak|spoke to|shipped|signed|agreed|closed|resolved|sorted|done)\b/i;

/**
 * Negated, it is the opposite. "I have not decided pricing yet" contains
 * "decided" and is the plainest possible deferral; read as a completion it
 * cancels the very pattern it belongs to. The same blindness turned "nothing
 * closed" into an achievement elsewhere in this codebase, which is why it is
 * checked here rather than trusted to word choice.
 */
const NEGATED_DONE = /\b(not|never|yet to|have yet|still (need|to|have)|haven'?t|hasn'?t|didn'?t|no)\b[^.!?]{0,30}$/i;

const isDone = (text: string): boolean => {
  const m = DONE_WORDS.exec(text);
  if (!m) return false;
  // Look at the run-up to the done-word, not the whole sentence: "I owe them a
  // decision but I did finally speak to Tom" is a completion of the speaking.
  const before = text.slice(0, m.index);
  return !NEGATED_DONE.test(before);
};

const STOPWORDS = new Set([
  'that', 'this', 'with', 'have', 'been', 'from', 'they', 'them', 'then', 'than', 'what', 'when',
  'will', 'would', 'about', 'there', 'their', 'which', 'still', 'need', 'going', 'list', 'week',
  'next', 'thing', 'things', 'some', 'more', 'much', 'very', 'just', 'know', 'think', 'want',
  'down', 'keeps', 'slipping', 'yet', 'not', 'onto', 'into', 'over', 'also', 'said', 'says',
  'session', 'inferred', 'verifiability', 'high', 'medium', 'low',
]);

const keywords = (text: string): Set<string> =>
  new Set(
    text
      .replace(/\[[^\]]*\]/g, ' ')
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w)),
  );

const overlap = (a: Set<string>, b: Set<string>) => [...a].filter((w) => b.has(w));

/**
 * Find what each party named as outstanding in three or more separate sessions.
 *
 * THREE SESSIONS, not two. The same bar every other negative read in this
 * product has to clear. Something mentioned twice is a person with a busy week;
 * something mentioned in three separate sessions is a pattern, and the
 * difference matters because only one of them is worth raising with someone.
 */
export function findDeferrals(entries: DeferralEntry[], minSessions = 3): Deferral[] {
  const out: Deferral[] = [];
  const byLabel = new Map<string, DeferralEntry[]>();
  for (const e of entries) {
    if (e.sessionNumber == null) continue;
    byLabel.set(e.label, [...(byLabel.get(e.label) ?? []), e]);
  }

  for (const [label, theirs] of byLabel) {
    const ordered = [...theirs].sort((a, b) => (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0));
    // Done beats outstanding. A completion that mentions what it completed is
    // still a completion.
    const outstanding = ordered.filter((e) => OUTSTANDING.test(e.text) && !isDone(e.text));

    // Cluster the outstanding mentions by what they are ABOUT, so "the pricing
    // decision" and "the conversation with a colleague" are counted as two
    // separate deferrals rather than one busy person.
    const clusters: { words: Set<string>; sessions: number[]; shared: string[] }[] = [];
    for (const e of outstanding) {
      const kw = keywords(e.text);
      if (kw.size === 0) continue;
      const hit = clusters.find((c) => overlap(c.words, kw).length >= 1);
      if (hit) {
        for (const w of kw) hit.words.add(w);
        hit.shared = overlap(hit.words, kw);
        if (!hit.sessions.includes(e.sessionNumber!)) hit.sessions.push(e.sessionNumber!);
      } else {
        clusters.push({ words: kw, sessions: [e.sessionNumber!], shared: [...kw].slice(0, 3) });
      }
    }

    for (const c of clusters) {
      if (c.sessions.length < minSessions) continue;
      const last = Math.max(...c.sessions);
      // Did it ever land? Only a LATER session counts, and only one that both
      // reads as done and is about the same thing.
      const resolved = ordered.find(
        (e) =>
          (e.sessionNumber ?? 0) > last &&
          isDone(e.text) &&
          overlap(c.words, keywords(e.text)).length >= 1,
      );
      out.push({
        label,
        subject: c.shared.slice(0, 3).join(', '),
        sessions: [...c.sessions].sort((a, b) => a - b),
        resolvedAt: resolved?.sessionNumber ?? null,
      });
    }
  }
  return out;
}

export type WaitingBehind = {
  label: string;
  /** How many DIFFERENT people named them as what they were waiting on. */
  people: number;
  /** Distinct sessions in which someone did, in order. */
  sessions: number[];
};

/**
 * Who other people kept naming as the thing they were waiting on.
 *
 * This is the strongest leadership signal in the record and the one that needs
 * no interpretation at all, because it is not one person's opinion - it is a
 * count of how many separate colleagues, across how many separate weeks,
 * independently said their work was sitting behind the same person.
 *
 * It is also the only version of this read that is fair. Someone can defer a
 * decision for a month and it costs nothing if nobody is behind it; the same
 * month costs three people their quarter if they are. The count of who is
 * waiting is what tells those two apart, and it is the reason this is measured
 * from other people's accounts rather than from the leader's own.
 *
 * Deliberately NOT a verdict. Being what people wait on is also what being
 * accountable for a decision looks like, and a leader who is the bottleneck
 * because everything routes through them may be under-supported rather than
 * avoidant. The count goes to the synthesis; the reading does not.
 */
export function findWaitingBehind(
  mentions: { sourceParticipantId: string; aboutParticipantId: string; kind: string; sessionNumber: number }[],
  labelOf: (participantId: string) => string,
  minSessions = 3,
): WaitingBehind[] {
  const byAbout = new Map<string, { sources: Set<string>; sessions: Set<number> }>();
  for (const m of mentions) {
    if (m.kind !== 'BLOCKED_BY') continue;
    // Naming yourself as your own blocker is not someone waiting on you.
    if (m.sourceParticipantId === m.aboutParticipantId) continue;
    const cur = byAbout.get(m.aboutParticipantId) ?? { sources: new Set<string>(), sessions: new Set<number>() };
    cur.sources.add(m.sourceParticipantId);
    cur.sessions.add(m.sessionNumber);
    byAbout.set(m.aboutParticipantId, cur);
  }
  const out: WaitingBehind[] = [];
  for (const [id, v] of byAbout) {
    if (v.sessions.size < minSessions) continue;
    out.push({
      label: labelOf(id),
      people: v.sources.size,
      sessions: [...v.sessions].sort((a, b) => a - b),
    });
  }
  return out.sort((a, b) => b.sessions.length - a.sessions.length);
}

/**
 * The notice handed to the synthesis. Facts and their session numbers only -
 * the reading is the model's to make, under the leadership-pattern rules.
 */
export function buildDeferralNotice(deferrals: Deferral[], waiting: WaitingBehind[] = []): string {
  const blocks: string[] = [];

  if (waiting.length) {
    blocks.push(
      'WHO OTHER PEOPLE DESCRIBED WAITING ON (counted from their accounts, not interpreted):\n' +
        waiting
          .map(
            (w) =>
              `- ${w.label}: ${w.people} other part${w.people === 1 ? 'y' : 'ies'} described their work as sitting behind this one, across ${w.sessions.length} separate sessions (${w.sessions.join(', ')}).`,
          )
          .join('\n') +
        '\nThis is a leadership pattern and belongs in leadershipGaps. Do not read it as a fault before checking the record: being what people wait on is also what holding a decision looks like, and someone every thread routes through may be carrying too much rather than avoiding anything. Report what the record shows about how that landed on the people waiting, without quoting or naming anyone.\n',
    );
  }

  if (!deferrals.length) return blocks.length ? blocks.join('\n') + '\n' : '';
  const lines = deferrals.map((d) => {
    const where = `sessions ${d.sessions.join(', ')}`;
    const end = d.resolvedAt
      ? `The record shows it happening in session ${d.resolvedAt}.`
      : 'The record does not show it happening.';
    return `- ${d.label}: named something as still outstanding in ${where} (${d.subject}). ${end}`;
  });
  blocks.push(
    'THINGS NAMED AS STILL TO DO ACROSS SESSIONS (counted from the record, not interpreted):\n' +
    lines.join('\n') +
    '\nEach of these is a candidate leadership pattern and belongs in leadershipGaps, not in divergences - but only if it genuinely lands on someone else. Something one party keeps meaning to do that affects nobody is not a gap, it is a busy week. Check whether another party is waiting on it or describes it differently before reporting it, and never quote or name anyone.\n'
  );
  return blocks.join('\n') + '\n';
}
