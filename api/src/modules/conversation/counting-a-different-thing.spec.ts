import { whatDoesNotAddUp, sayWhatDoesNotAddUp } from './what-does-not-add-up';

/*
 * Four salespeople against a shared target of 40 approved credit facilities. Kwame said 22 in every
 * session and believed he was ahead; he was counting applications taken, not approvals. The whole
 * team had 11 approved. Nobody corrected him for three sessions and the report read his 22 as
 * pipeline like everybody else's.
 */
const sharedTarget = { name: '40 approved credit facilities this quarter', target: 40, count: 11, yours: false, setByThem: false };

const said = (text: string, session = 3) => ({ text, type: 'PROGRESS', session });
const base = { thisSession: 3, sessionsLeft: 0, aiTurnsThisSession: [] as string[] };

describe('counting a different thing', () => {
  it('catches one person claiming more than the whole check-in has recorded', () => {
    const out = whatDoesNotAddUp({ ...base, targets: [sharedTarget], said: [said('I have 22 credit facilities now. All of them are with the credit team.')] });
    const d = out.find((x) => x.kind === 'counting a different thing')!;
    expect(d).toBeTruthy();
    expect(d.lines.join(' ')).toContain('22');
    expect(d.lines.join(' ')).toContain('11 for everybody together');
    expect(d.lines.join(' ')).toContain('not counting the same thing');
  });

  it('says nothing when their number fits inside what is recorded', () => {
    const out = whatDoesNotAddUp({ ...base, targets: [sharedTarget], said: [said('I have 6 credit facilities approved.')] });
    expect(out.find((x) => x.kind === 'counting a different thing')).toBeUndefined();
  });

  /* A number in their week that is not about this target is not a contradiction. */
  it('ignores a big number about something else', () => {
    const out = whatDoesNotAddUp({ ...base, targets: [sharedTarget], said: [said('I drove 300 kilometres this week.')] });
    expect(out.find((x) => x.kind === 'counting a different thing')).toBeUndefined();
  });

  it('says nothing where the check-in has recorded nothing to compare against', () => {
    const out = whatDoesNotAddUp({ ...base, targets: [{ ...sharedTarget, count: 0 }], said: [said('I have 22 credit facilities.')] });
    expect(out.find((x) => x.kind === 'counting a different thing')).toBeUndefined();
  });

  it('only looks at what they said this session', () => {
    const out = whatDoesNotAddUp({ ...base, targets: [sharedTarget], said: [said('I have 22 credit facilities.', 1)] });
    expect(out.find((x) => x.kind === 'counting a different thing')).toBeUndefined();
  });

  /* It goes to the model as a question with both lines, like every other difference. */
  it('reaches the conversation as one question, not a verdict', () => {
    const block = sayWhatDoesNotAddUp({ ...base, targets: [sharedTarget], said: [said('I have 22 credit facilities now.')] });
    expect(block).toContain('counting a different thing');
    expect(block).toContain('ask which one stands now');
    expect(block).toContain('A question, not a verdict');
  });
});
