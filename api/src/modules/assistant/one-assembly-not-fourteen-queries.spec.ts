/**
 * WHAT THE ASSISTANT KNOWS MUST NOT DEPEND ON WHICH QUESTION WAS ASKED.
 *
 * Every lane fetched its own facts. The cost showed up as duplication before it
 * showed up as a wrong answer: "what check-ins are waiting for this person" was
 * written three times in one day, and the copy furthest from the chat matched
 * only on the account — so it told somebody with a session in front of them
 * that nothing was waiting.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  MOST_OF_EACH,
  whatIsTrueFor,
  whatTheShapeOfItSays,
  type RawMaterial,
} from './what-is-true-for-this-person';

const raw = (over: Partial<RawMaterial> = {}): RawMaterial => ({
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

describe('every fact says where it came from', () => {
  it('on all four kinds', () => {
    /* An assistant that cannot cite is one nobody can check, and the first time
       it is wrong about somebody's target the question is where it got that. */
    const truth = whatIsTrueFor(raw());
    for (const part of [truth.objectives, truth.commitments, truth.sessions, truth.decisions]) {
      expect(typeof part.from).toBe('string');
      expect(part.from.length).toBeGreaterThan(4);
    }
  });

  it('and the source is said in words a person reads, not a table name', () => {
    const truth = whatIsTrueFor(raw());
    expect(truth.objectives.from).toBe('your organisation records');
    expect(truth.decisions.from).toBe('what your organisation has written down');
  });
});

describe('it is bounded', () => {
  it('by one number, so the bound cannot drift per lane', () => {
    const many = Array.from({ length: MOST_OF_EACH + 5 }, () => objective());
    const truth = whatIsTrueFor(raw({ objectives: many }));
    expect(truth.objectives.value.length).toBe(MOST_OF_EACH);
  });

  it('and says what it left out, so a bounded answer is not a whole one', () => {
    /* A bounded answer that does not say it is bounded is a whole answer that
       happens to be wrong. */
    const many = Array.from({ length: MOST_OF_EACH + 5 }, () => objective());
    const truth = whatIsTrueFor(raw({ objectives: many }));
    expect(truth.trimmed).toEqual(['5 more objectives']);
    expect(whatTheShapeOfItSays(truth).join(' ')).toContain('not showing everything');
  });
});

describe('what the shape of it says', () => {
  it('notices an objective with nothing committed under it', () => {
    const said = whatTheShapeOfItSays(whatIsTrueFor(raw({ objectives: [objective()] })));
    expect(said.join(' ')).toContain('The objective is the intention');
  });

  it('and that nothing records why its number is the number', () => {
    const bare = objective({ justification: null, approach: null });
    const said = whatTheShapeOfItSays(whatIsTrueFor(raw({ objectives: [bare] })));
    expect(said.join(' ')).toContain('why its number is the number');
  });

  it('and that the organisation has written nothing down', () => {
    /* The thing no single lane could see, because no single lane had all of it. */
    const said = whatTheShapeOfItSays(whatIsTrueFor(raw()));
    expect(said.join(' ')).toContain('written nothing down');
  });

  it('and says none of it when there is nothing to say', () => {
    const settled = whatIsTrueFor(
      raw({
        objectives: [objective()],
        commitments: [{ text: 'Two a week', dueSaid: 'Friday', state: 'OPEN' }],
        decisions: [{ key: 'the-moat', title: 'The moat' }],
      }),
    );
    expect(whatTheShapeOfItSays(settled)).toEqual([]);
  });
});

describe('the wall is the query, not a note about the query', () => {
  const service = fs
    .readFileSync(path.join(__dirname, 'what-is-true.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  it('every read is scoped to one organisation', () => {
    const finds = [...service.matchAll(/this\.prisma\.\w+\.findMany\(\{[\s\S]{0,400}?\}\)/g)].map((m) => m[0]);
    expect(finds.length).toBeGreaterThan(3);
    for (const q of finds) expect(q).toMatch(/organizationId/);
  });

  it('and reads nothing a person said in a check-in', () => {
    /**
     * What somebody said is theirs until a round is released. The assembly holds
     * that a session exists and what it is called — never its content — so there
     * is nothing to filter afterwards and nothing a model could be talked into
     * revealing.
     */
    expect(service).not.toMatch(/conversationTurn|\.turns\b|transcript/i);
  });

  it('and reads only the current version of what the company wrote down', () => {
    /* A superseded card would answer today's question with a decision the
       company has already changed. */
    expect(service).toMatch(/effectiveTo: null/);
  });
});
