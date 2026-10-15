import { readFileSync } from 'fs';
import { join } from 'path';
import { howLongAgo, splitBySession, isSameSession, SESSION_GAP_MINUTES } from './what-you-told-me-before';
import { route } from './the-router-is-deterministic';
import { STOPWORDS } from '../knowledge/knowledge.service';

/**
 * RECALL REACHES ONE PERSON'S OWN TURNS AND NOBODY ELSE'S.
 *
 * A recall that could reach another participant's would be the product quoting one colleague to
 * another - the exact thing it exists to prevent. Driven on the running server with two people who
 * had both mentioned the same subject: each got their own sentence back and neither saw the other's.
 */
const SRC = readFileSync(join(__dirname, 'assistant.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('recall is your own and nobody else’s', () => {
  it('scopes the query by person in the where clause, not afterwards', () => {
    /* A filter applied after the fact is one somebody can refactor away while the query still
       "works". The boundary belongs where the rows are chosen. */
    const q = SRC.slice(SRC.indexOf('FROM assistant_turns'), SRC.indexOf('ORDER BY created_at DESC'));
    expect(q).toContain('organization_id = ');
    expect(q).toContain('person_external_id = ');
  });

  it('and there is exactly one query against that table', () => {
    /* So the guard above cannot be true of one query and false of a second added later. */
    expect([...SRC.matchAll(/FROM assistant_turns/g)]).toHaveLength(1);
  });

  it('reads only what the person themselves said, never the assistant', () => {
    /* Quoting our own earlier reply back as something they told us would be the product treating
       its own words as evidence. */
    expect(SRC).toMatch(/role = 'person'/);
  });
});

describe('and what they said in their own check-ins is found only through their own place in each', () => {
  /* User journeys, F-13. The words of a check-in are searched too, and the boundary is again where the rows are chosen. */
  const q = SRC.slice(SRC.indexOf('FROM conversation_turns'), SRC.indexOf('ORDER BY t.created_at DESC'));
  it('the rows are chosen by the asker\'s own participant ids, found from their own sign-in', () => {
    expect(q).toContain('c.participant_id = ANY(');
    expect(SRC).toMatch(/groundParticipant\?\.findMany\?\.\(\{\s*where: \{ userId, ground: \{ organizationId, \.\.\.notAKeptCheckIn\(kept\) \} \}/);
  });
  it('only what the person said, never the assistant, and there is one such query', () => {
    expect(q).toContain("t.role = 'PERSON'");
    expect([...SRC.matchAll(/FROM conversation_turns/g)]).toHaveLength(1);
  });
});

describe('a search word has to carry meaning', () => {
  it('drops stopwords, because "the" is in every sentence anybody writes', () => {
    /*
     * FORGETTING THIS MADE RECALL ABSURD. Filtering on length alone left "the" as a search word, so
     * "did I mention the pricing model" came back with every turn the person had ever written - a
     * table scan with a confident sentence on top.
     */
    expect(STOPWORDS.has('the')).toBe(true);
    expect(SRC).toMatch(/!STOPWORDS\.has\(w\)/);
  });

  it('and answers honestly when nothing meaningful is left', () => {
    expect(SRC).toMatch(/About what, specifically\?/);
  });
});

describe('their own questions are not things they told me', () => {
  it('drops any recalled turn that is itself a question to the assistant', () => {
    /* Asking twice recalled the first asking, which is noise dressed as memory. */
    expect(SRC).toMatch(/route\(h\.content\)\.lane === 'unplaced'/);
  });

  it('and the router is what decides that, rather than a second list of patterns', () => {
    for (const q of ['did I mention the vendor comparison', 'what am I on?', 'how do we do expenses']) {
      expect(route(q).lane).not.toBe('unplaced');
    }
    for (const s of ['The vendor comparison is stuck waiting on legal.', 'I picked the migration back up.']) {
      expect(route(s).lane).toBe('unplaced');
    }
  });
});

describe('how long ago, in words somebody would use', () => {
  const now = new Date('2026-08-28T12:00:00Z');
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

  it('says it the way a colleague would', () => {
    expect(howLongAgo(daysAgo(0), now)).toBe('earlier today');
    expect(howLongAgo(daysAgo(1), now)).toBe('yesterday');
    expect(howLongAgo(daysAgo(3), now)).toBe('3 days ago');
    expect(howLongAgo(daysAgo(9), now)).toBe('last week');
    expect(howLongAgo(daysAgo(21), now)).toBe('3 weeks ago');
    expect(howLongAgo(daysAgo(45), now)).toBe('last month');
  });

  it('never a timestamp', () => {
    for (const d of [0, 1, 5, 20, 100, 400]) {
      expect(howLongAgo(daysAgo(d), now)).not.toMatch(/\d{4}|:/);
    }
  });
});

describe('where one conversation ends and the next begins', () => {
  const now = new Date('2026-08-28T12:00:00Z');
  const minsAgo = (n: number) => new Date(now.getTime() - n * 60_000);

  it('a gap, because a panel is opened and closed constantly', () => {
    /* A session that ended when somebody navigated would make "earlier in this conversation" a lie
       roughly every time. */
    expect(isSameSession(minsAgo(5), now)).toBe(true);
    expect(isSameSession(minsAgo(SESSION_GAP_MINUTES + 1), now)).toBe(false);
  });

  it('splits newest-first turns into this conversation and before it', () => {
    const turns = [
      { createdAt: minsAgo(2) },
      { createdAt: minsAgo(10) },
      { createdAt: minsAgo(600) },
      { createdAt: minsAgo(610) },
    ];
    const { current, earlier } = splitBySession(turns, now);
    expect(current).toHaveLength(2);
    expect(earlier).toHaveLength(2);
  });

  it('walks the chain rather than measuring everything from now', () => {
    /* Four turns five minutes apart are one conversation even though the last is twenty minutes
       old - measuring each from `now` would cut it in the middle. */
    const turns = [{ createdAt: minsAgo(5) }, { createdAt: minsAgo(40) }, { createdAt: minsAgo(80) }];
    expect(splitBySession(turns, now).current).toHaveLength(3);
  });
});
