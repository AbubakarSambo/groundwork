import { aLastTimeInTheirOwnWords } from './a-last-time-is-their-own-words';

/** The four openings of polish round 1 (16 to 19 October 2026) that told somebody what they had said before, wrongly. */
const at = (s: string) => new Date(`${s}T09:00:00+03:00`);

describe('"last time you said" is their own words, or it is not said', () => {
  it('Peter: the receptionist at Upper Hill, not "a key account"', () => {
    const r = aLastTimeInTheirOwnWords('Last time, you said Upper Hill offices was a key account. What happened there this week?', [
      { text: 'I went to Upper Hill offices and spoke to the receptionist. She said to come back Monday.', at: at('2026-10-14') },
    ]);
    expect(r.changed).toBe(true);
    expect(r.text).toBe('On Wednesday 14 October you wrote: “I went to Upper Hill offices and spoke to the receptionist.” What happened there this week?');
    expect(r.text).not.toMatch(/key account/);
  });

  it('Brian: the reply waiting to be filed, not "already filed"; the question after the semicolon stays', () => {
    const r = aLastTimeInTheirOwnWords('Last time you said the reply in Kasarani Foods v Tumaini Traders has already been filed; what is the next step?', [
      { text: 'The reply in Kasarani Foods v Tumaini Traders is ready, waiting for the KES 3,500 filing fee.', at: at('2026-10-16') },
    ]);
    expect(r.text).toBe('On Friday 16 October you wrote: “The reply in Kasarani Foods v Tumaini Traders is ready, waiting for the KES 3,500 filing fee.” What is the next step?');
  });

  it('Wanjiru: words from the setup that she never wrote are cut, and the question stays', () => {
    const r = aLastTimeInTheirOwnWords('Last time, what you said would show it was identifying overdue bills and roadblocks. Which fee notes are paid this week?', [
      { text: 'Aisha is my strongest associate.', at: at('2026-10-14') },
    ]);
    expect(r.text).toBe('Which fee notes are paid this week?');
  });

  it('an opening that tells nobody what they said is left exactly as it was', () => {
    const t = 'Good morning. Which deals moved since Friday?';
    expect(aLastTimeInTheirOwnWords(t, [{ text: 'Westgate signed.', at: at('2026-10-16') }])).toEqual({ text: t, changed: false });
  });

  it('a quotation that is word for word theirs stays', () => {
    const t = 'Last time you said “Westgate will pay on Friday”. Did they?';
    expect(aLastTimeInTheirOwnWords(t, [{ text: 'Westgate will pay on Friday.', at: at('2026-10-14') }]).text).toBe(t);
  });
});
