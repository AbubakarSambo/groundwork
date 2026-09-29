import { theStreamedRouteRunsThePlainRoute } from './__fixtures__/the-streamed-route-is-the-plain-route';
import { readFileSync } from 'fs';
import { join } from 'path';
import { screen, SentenceGate } from './nothing-invented-reaches-them';

/**
 * "DOES SHE FACE THE SAME CHOICE?" - ASKED OF THE PERSON IT WAS ABOUT.
 *
 * Read on a live check-in with one person in it. The model holds the party labels and does not
 * reliably know which of them is the one reading, so it writes about the reader as though they were
 * being discussed by somebody else.
 *
 * The prompt has forbidden this for as long as it has existed - "address them directly as you and
 * your, never by name". An instruction is a request. This is the door.
 *
 * IT IS NOT THE INVENTED-NAME RULE, and could not be. That rule asks whether the name appears in
 * what the person said, and the reader's own name almost always does - they sign off with it, they
 * paste a message with it in. So it passes every time. This check does not consult what was said:
 * the reader's own name is wrong in a reply written TO them no matter who typed it.
 *
 * THE BARE PRONOUN IS DELIBERATELY NOT CAUGHT. A reply may legitimately be about another party, and
 * nothing in the sentence alone separates the two. Only the name is unambiguous, so only the name
 * is enforced - the pronoun case stays a prompt matter until there is something better than a guess.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const SERVICE = strip(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));

describe('a reply that names the person reading it', () => {
  /* Noted rather than removed now - see DELETES_WHAT_IT_FINDS. The detection is what this file is
     for, and it is unchanged: the count of how often the product says somebody's own name back at
     them is what decides whether this check earns its place. */
  it('is noticed', () => {
    const out = screen('Does Zainab face the same choice? ', [], 'Zainab');
    expect(out.hits.map((h) => h.check)).toContain('a name nobody said');
    expect(out.dropped).toHaveLength(1);
  });

  it('even though they typed their own name themselves', () => {
    /* The exact hole the invented-name rule leaves: personSaid contains it, so that rule allows it,
       and only the reader-name check catches it. Noted rather than removed - see
       DELETES_WHAT_IT_FINDS - so what is asserted is that the check still fires. */
    const out = screen('Does Zainab face the same choice? ', ['Signing off, Zainab'], 'Zainab');
    expect(out.hits.map((h) => h.check)).toEqual(['called the reader by name']);
    expect(out.dropped).toHaveLength(1);
  });

  it('while the same sentence about somebody else passes', () => {
    const out = screen('Does Nadia face the same choice? ', ['Nadia runs the ward team'], 'Zainab');
    expect(out.hits).toEqual([]);
    expect(out.text).toContain('Nadia');
  });

  it('and an ordinary word that happens to be a name does not cost them a sentence', () => {
    /* Case-sensitive on the capital: a person called Grace keeps "handled with grace". */
    const out = screen('That was handled with grace. ', [], 'Grace');
    expect(out.hits).toEqual([]);
    expect(out.text).toContain('handled with grace');
  });

  it('and a name too short to tell from a word is left alone', () => {
    const out = screen('Al the work landed on time. ', [], 'Al');
    expect(out.hits).toEqual([]);
    expect(out.text).toContain('landed on time');
  });

  it('with nothing passed, nothing changes', () => {
    /* Every other caller of screen() keeps its old behaviour exactly - a name the person did say
       still passes, which is precisely the hole the reader check exists to close. */
    const out = screen('Does Zainab face the same choice? ', ['Signing off, Zainab']);
    expect(out.text).toContain('Zainab');
  });
});

describe('and the streamed reply is held to the same rule', () => {
  it('notices the sentence, one sentence at a time', () => {
    const gate = new SentenceGate([], 'Zainab');
    /* push emits only sentences it knows are finished; the trailing one waits for flush. */
    const emitted = gate.push('Does Zainab face the same choice? And what would you do next? ') + gate.flush();
    expect(gate.hits).toHaveLength(1);
    expect(gate.dropped).toHaveLength(1);
    expect(emitted).toContain('what would you do next');
  });
});

describe('and the check-in knows who is reading', () => {
  it('passes the reader to both paths', () => {
    expect(SERVICE).toContain('screen(stripped.text, known, readerName, conversationSoFar)');
    /* Changed 28 Sep 2026: the streamed route now runs sendMessage itself (the-streamed-route-is-the-plain-route), so a rule held on both paths is in sendMessage once, and the stream runs it. */
    expect(SERVICE).toMatch(/new SentenceGate\(\s*known,\s*readerName,\s*turns\.map/);
    expect(theStreamedRouteRunsThePlainRoute(SERVICE)).toBe(true);
  });

  it('from the row it already loads, not a second query', () => {
    expect(SERVICE).toContain('awaitingOrgApproval: true, firstName: true');
  });
});
