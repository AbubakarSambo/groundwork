import { whichRoundIsOpen } from './which-round-is-open';

const row = (sessionNumber: number, status: string) => ({ sessionNumber, status });

describe('which round is open', () => {
  it('is the highest round somebody has actually started', () => {
    expect(whichRoundIsOpen([row(1, 'COMPLETED'), row(2, 'NOT_STARTED')])).toBe(1);
  });

  it('moves on as soon as one person opens the next one', () => {
    expect(whichRoundIsOpen([row(1, 'COMPLETED'), row(2, 'IN_PROGRESS'), row(3, 'NOT_STARTED')])).toBe(2);
  });

  it('counts a declined round as met, because they answered it', () => {
    expect(whichRoundIsOpen([row(1, 'COMPLETED'), row(2, 'DECLINED')])).toBe(2);
  });

  it('is the first round where nothing anywhere has started yet', () => {
    /* Not zero and not the newest row: the run has not begun and round one is what is about to
       open. Reading the newest row here is what made a fresh board open in red. */
    expect(whichRoundIsOpen([row(1, 'NOT_STARTED'), row(2, 'NOT_STARTED')])).toBe(1);
  });

  it('says nothing about a check-in with no rounds at all', () => {
    expect(whichRoundIsOpen([])).toBe(0);
  });
});
