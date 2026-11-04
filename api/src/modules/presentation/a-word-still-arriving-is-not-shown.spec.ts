import { forHumans, whatIsNewSince, theFinishedPart } from './outbound';

/*
 * The setup stream as the law firm lead read it in plan round 32: chunks of a reply arriving, cleaned and shown as they come. A chunk that
 * ended inside "check-in" showed "check, i" and nothing after it. What the lead reads now is the whole sentence.
 */
function whatTheyRead(chunks: string[]): string {
  let raw = '';
  let shown = '';
  let out = '';
  for (const c of chunks) {
    raw += c;
    const cleaned = forHumans(raw.slice(0, theFinishedPart(raw, 4)));
    const fresh = whatIsNewSince(shown, cleaned);
    if (fresh) { shown = cleaned; out += fresh; }
  }
  return out + whatIsNewSince(shown, forHumans(raw));
}

describe('a word still arriving is not shown', () => {
  it('reads the whole question when a chunk ends inside "check-in"', () => {
    const said = whatTheyRead(['What makes this the right time to set up a check-i', 'n on this? For instance, new issues', ' or needing the team lined up on it?']);
    expect(said).toBe('What makes this the right time to set up a check-in on this? For instance, new issues or needing the team lined up on it?');
  });

  it('shows nothing of a first word that is still arriving', () => {
    expect(theFinishedPart('Hello', 0)).toBe(0);
    expect(theFinishedPart('Hello there', 0)).toBe(5);
  });
});
