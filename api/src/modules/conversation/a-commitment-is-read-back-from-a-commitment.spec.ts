import { commitmentsTheyNeverMade } from './a-commitment-is-read-back-from-a-commitment';
import { whatIsLeftToSend } from './a-promise-they-never-made';

/** The exact words Ravi and Maria said and the exact sentences they were read back (snapshot and newmanager, run-21). */
describe('a commitment is read back from a commitment', () => {
  const RAVI = [
    "I've been told the integration project is on track. That's good news.",
    'The last report I saw indicated all key milestones were being met.',
    "I don't have that information with me right now. I just know it was before I left.",
    "I've been away for four weeks. So, more than a month ago.",
    "The feedback loop for customer issues was a bit slow. That's one area I recall needing attention.",
    "I don't have anything to share that the team wouldn't already know. I've been completely disconnected.",
  ];
  const READ_BACK = "You said you would track the integration project's status and the customer issue feedback loop.";

  it('does not read Ravi back a commitment he never made, though every topic in it is his', () => {
    expect(commitmentsTheyNeverMade(READ_BACK, RAVI, [])).toEqual([READ_BACK]);
  });

  it('what is left of his close is the close', () => {
    const live = `You have nothing new to share because you have been disconnected. ${READ_BACK}\n\nThat's all for today. Below is what I wrote down from your answers. Is anything wrong?`;
    const left = whatIsLeftToSend(live, READ_BACK, false) ?? '';
    expect(left).not.toMatch(/You said you would/);
    expect(left).toMatch(/That's all for today/);
  });

  it('does not tell Maria she committed to confirming expectations when she said she was sure he understood them', () => {
    const maria = ["I'm sure he understands the general expectations."];
    const s = 'You said you will confirm general expectations with Daniel.';
    expect(commitmentsTheyNeverMade(s, maria, [])).toEqual([s]);
  });

  it('keeps a commitment they made in the first person this session', () => {
    expect(commitmentsTheyNeverMade('You said you would send the rota by Friday.', ["I'll send the rota by Friday."], [])).toEqual([]);
  });

  it('keeps one in other words, where two of the things are theirs', () => {
    expect(commitmentsTheyNeverMade('You said you would speak to the Wuse distributor.', ["I am going to call the Wuse distributor on Monday."], [])).toEqual([]);
  });

  it('keeps a commitment row from an earlier session', () => {
    expect(commitmentsTheyNeverMade('Last time you said you would chase the credit committee.', [], ['Chase the credit committee weekly'])).toEqual([]);
  });

  it('is not a commitment when nothing forward was said', () => {
    expect(commitmentsTheyNeverMade('You said you were away for four weeks.', RAVI, [])).toEqual([]);
  });
});
