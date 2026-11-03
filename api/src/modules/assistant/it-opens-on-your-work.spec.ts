/**
 * THE PANEL GREETED PEOPLE BY OFFERING TO ANSWER A QUESTION THEY HAD NOT ASKED.
 *
 * "Ask me about your objectives or what you owe this period" — from a thing that
 * already knew what was waiting for them. Somebody who has to think of the
 * question is somebody who closes the panel.
 */
import {
  whatIsWorthSayingWhenYouArrive,
  mayBeSaidEveryTime,
} from './what-is-worth-saying-when-you-arrive';
import { whatIsTrueFor, type RawMaterial } from './what-is-true-for-this-person';

const truth = (over: Partial<RawMaterial> = {}) =>
  whatIsTrueFor({
    person: { externalId: 'sam', displayName: 'Sam' },
    objectives: [],
    commitments: [],
    sessions: [],
    decisions: [],
    ...over,
  });

const objective = (over = {}) => ({
  title: 'Ten companies onboarded',
  measure: 'companies',
  target: '10',
  dueDate: null,
  justification: 'Ten is what the pipeline can carry.',
  approach: 'Two a week.',
  theirs: true,
  ...over,
});

const session = (standing: string, label = 'September sprint') => ({
  checkInId: 'c1',
  groundId: 'g1',
  label,
  standing,
});

describe('what it opens on', () => {
  it('a session waiting on them to start, before anything else', () => {
    /* The only item here that is holding other people up: until it happens,
       nothing on it exists for anybody. */
    const said = whatIsWorthSayingWhenYouArrive(
      truth({
        sessions: [session('open to you', 'Something else'), session('waiting on you to start')] as never,
        objectives: [objective({ justification: null, approach: null })],
      }),
      'Sam',
    );
    expect(said.source).toBe('session_to_start');
    expect(said.line).toContain('has not begun');
  });

  it('then a session open to them, with what it costs them', () => {
    const said = whatIsWorthSayingWhenYouArrive(truth({ sessions: [session('open to you')] as never }), 'Sam');
    expect(said.source).toBe('session_open');
    expect(said.line).toContain('about two minutes');
    expect(said.line).toContain('released with everybody');
  });

  it('then a target nobody explained, and only when NOT ONE is explained', () => {
    const none = whatIsWorthSayingWhenYouArrive(
      truth({ objectives: [objective({ justification: null, approach: null })] }),
      'Sam',
    );
    expect(none.source).toBe('target_unexplained');
    /* One objective is "it does not record", not "none of them records" — the
       sentence read as broken software in the live run before this. */
    expect(none.line).toContain('you own an objective, and it does not record');
    const two = whatIsWorthSayingWhenYouArrive(
      truth({
        objectives: [
          objective({ justification: null, approach: null }),
          objective({ justification: null, approach: null }),
        ],
      }),
      'Sam',
    );
    expect(two.line).toContain('you own 2 objectives, and none of them records');

    /* Where some carry a reason, the ones that do are already showing what a
       good one looks like. Saying it again is the product having an opinion
       about somebody's planning tool. */
    const some = whatIsWorthSayingWhenYouArrive(
      truth({ objectives: [objective(), objective({ justification: null, approach: null })] }),
      'Sam',
    );
    expect(some.source).toBe('orientation');
  });

  it('and the greeting when there is genuinely nothing', () => {
    expect(whatIsWorthSayingWhenYouArrive(truth(), 'Sam').source).toBe('orientation');
  });

  it('and never more than one thing', () => {
    /* A greeting that lists four is a to-do list nobody asked for, and the
       fourth item is what makes the first ignorable. */
    const said = whatIsWorthSayingWhenYouArrive(
      truth({
        sessions: [session('waiting on you to start'), session('open to you')] as never,
        objectives: [objective({ justification: null, approach: null })],
      }),
      'Sam',
    );
    expect(said.line.split('\n').length).toBe(1);
    expect(said.line).not.toContain('Also');
  });

  it('and a session nobody has accepted is not offered as though it were theirs', () => {
    /* It exists and is not theirs to open. Opening on it would be an invitation
       to press something that refuses. */
    const said = whatIsWorthSayingWhenYouArrive(
      truth({ sessions: [session('invitation not accepted')] as never }),
      'Sam',
    );
    expect(said.source).toBe('orientation');
  });
});

describe('what is a nudge and what is not', () => {
  it('stating what is waiting may be said every time', () => {
    /* Nobody resents being told a thing is ready. */
    expect(mayBeSaidEveryTime('session_open')).toBe(true);
    expect(mayBeSaidEveryTime('session_to_start')).toBe(true);
    expect(mayBeSaidEveryTime('orientation')).toBe(true);
  });

  it('and raising an unexplained target is rate limited, because it is chasing', () => {
    /* Useful once and corrosive on the fourth morning. */
    expect(mayBeSaidEveryTime('target_unexplained')).toBe(false);
  });
});
