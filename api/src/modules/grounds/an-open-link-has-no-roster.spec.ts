import { answeredOnALink, aLinkRoundIsReady, cameThroughTheLink, ENOUGH_TO_MAKE_A_ROUND } from './an-open-link-has-no-roster';
import * as fs from 'fs';
import * as path from 'path';

const stranger = (finished: boolean) => ({ userId: null, invitedAt: null, managingOnly: false, finished });
const lead = (finished = false) => ({ userId: 'u1', invitedAt: null, managingOnly: true, finished });
const invited = (finished: boolean) => ({ userId: null, invitedAt: new Date(), managingOnly: false, finished });

describe('an open link has no roster', () => {
  it('knows somebody who came through the link from somebody who was invited', () => {
    expect(cameThroughTheLink(stranger(true))).toBe(true);
    expect(cameThroughTheLink(invited(true))).toBe(false);
    expect(cameThroughTheLink(lead())).toBe(false);
  });

  it('is a link ground once somebody who came through it has finished', () => {
    expect(answeredOnALink([lead(), stranger(true)])).toBe(true);
    expect(answeredOnALink([lead(), stranger(false)])).toBe(false);
    expect(answeredOnALink([lead(), invited(true)])).toBe(false);
  });

  /* The run this came from: ten finished, the lead never answers, and it stayed unreleased. */
  it('is ready on enough finished answers, whatever the lead has done', () => {
    const ten = Array.from({ length: 10 }, () => stranger(true));
    expect(aLinkRoundIsReady([lead(false), ...ten])).toBe(true);
  });

  it('does not count the lead who only reads what comes back', () => {
    expect(aLinkRoundIsReady([lead(true), stranger(true)])).toBe(false);
    expect(aLinkRoundIsReady([lead(true), stranger(true), stranger(true)])).toBe(true);
  });

  it('is not ready on one account, because there is nothing to compare', () => {
    expect(aLinkRoundIsReady([lead(), stranger(true)])).toBe(false);
    expect(ENOUGH_TO_MAKE_A_ROUND).toBe(2);
  });

  it('is not held up by somebody who is still typing', () => {
    expect(aLinkRoundIsReady([stranger(true), stranger(true), stranger(false), stranger(false)])).toBe(true);
  });

  /* And the roster rule is left alone for grounds that have one. */
  it('the service asks this only where people came through the link', () => {
    const src = fs.readFileSync(path.join(__dirname, 'grounds.service.ts'), 'utf8');
    expect(src).toMatch(/if \(answeredOnALink\(howTheyArrived\)\) return aLinkRoundIsReady\(howTheyArrived\);/);
  });
});
