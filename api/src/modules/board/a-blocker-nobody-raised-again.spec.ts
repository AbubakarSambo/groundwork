import { stillRaised, notRaisedAgain, sayingWhatWentQuiet } from './a-blocker-nobody-raised-again';

const latest = new Map([['ada', 4], ['lead', 4]]);
const row = (fromParticipantId: string, statedInSession: number | null, what = 'x') => ({ fromParticipantId, statedInSession, what });

describe('a blocker nobody raised again', () => {
  it('keeps what was said in the latest session somebody completed', () => {
    expect(stillRaised([row('ada', 4)], latest).length).toBe(1);
  });

  it('drops what was said three sessions ago and never mentioned since', () => {
    /* Read live on a closing report: "waiting for 6 things, starting with introductions", six weeks
       after the introductions happened. */
    expect(stillRaised([row('ada', 1, 'introductions')], latest)).toEqual([]);
    expect(notRaisedAgain([row('ada', 1, 'introductions')], latest).map((r) => r.what)).toEqual(['introductions']);
  });

  it('keeps a row that did not come from a check-in, and one from somebody with no sessions', () => {
    expect(stillRaised([row('ada', null)], latest).length).toBe(1);
    expect(stillRaised([row('nobody-here', 1)], latest).length).toBe(1);
  });

  it('says what went quiet, and says nothing when nothing did', () => {
    expect(sayingWhatWentQuiet(0)).toBeNull();
    expect(sayingWhatWentQuiet(1)).toMatch(/One thing/);
    expect(sayingWhatWentQuiet(3)).toMatch(/^3 things/);
  });
});
