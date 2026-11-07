import { ConversationService } from './conversation.service';
import { ENGINE_RULES } from './prompt-library';

/**
 * THE VOICE WORK MUST NOT HAVE QUIETLY UNPLUGGED ANYTHING.
 *
 * A character sketch, three bans, a register and a rhythm rule all went into the same prompt that
 * carries the coaching step, the role probe, the behavioural patterns, the specificity read and
 * everything the earlier sessions taught. Those are separate entries in one array at the end of
 * `composeSystemPrompt`, and an entry can be dropped by a refactor with every unit test still green -
 * which is exactly the failure this file's neighbour was written after.
 *
 * So this asks the real composer for a real prompt and looks for each of them in it, alongside the
 * new voice. Hafsah's words: make sure we do not lose our wiring for coaching, role profiling,
 * behavioural patterns, specificity and over time.
 *
 * The other half of the risk is not wiring but dilution: a warmer voice that asks for less. That is
 * asserted at the bottom - the demands have to survive the charm.
 */
const stubPrisma = () => {
  const ground = {
    id: 'g1', organizationId: 'org1', scenario: 'PIP', moment: 'OFF_TRACK',
    label: 'Delivery is slipping', mode: 'SHARED', timelineDays: 90, objectives: [], brief: null,
    startsAt: null, endsAt: null, status: 'ACTIVE', leadRemit: null, cadence: null,
  };
  const answers: Record<string, any> = {
    'ground.findUnique': ground,
    'ground.findFirst': ground,
    /* Two earlier sessions, so the longitudinal path is exercised rather than skipped. */
    'checkIn.findMany': [
      { id: 'c-prev1', sessionNumber: 1, specificityDimensions: { who: 'low', when: 'high' } },
      { id: 'c-prev2', sessionNumber: 2, specificityDimensions: { who: 'high', when: 'high' } },
    ],
    'recordEntry.findMany': [{ id: 'r1', type: 'DELIVERY', text: 'Shipped the pricing band draft' }],
    'patternDetection.findMany': [{ id: 'pd1', code: 'REPEATED_SLIP' }],
    'patternDetection.count': 2,
    'person.findFirst': null,
    'personObjective.findMany': [],
    'interaction.findMany': [],
    'proposedChange.findMany': [],
    /* The gate is open for this spec: it is about the step reaching the prompt. */
    'platformSetting.findUnique': { key: 'coaching_live', value: true },
    /* The coach's own state, which is where the step actually comes from. */
    'coachingState.findUnique': {
      participantId: 'p1', currentStep: 'name the blocker out loud',
      /* A session number, not a timestamp - the column is an Int and the guard compares it to
         sessionNumber. Given in session 2, outstanding in session 3. */
      stepGivenAt: 2, staircase: 'ownership',
      staircasePosition: 1, history: [],
    },
  };
  return new Proxy({}, {
    get: (_t, model: string) => new Proxy({}, {
      get: (_t2, method: string) => async () => {
        const hit = answers[`${model}.${String(method)}`];
        if (hit !== undefined) return hit;
        if (String(method) === 'count') return 0;
        return String(method).endsWith('Many') ? [] : null;
      },
    }),
  }) as any;
};

const service = (coachStep: any) => {
  const s = Object.create(ConversationService.prototype) as any;
  /* The model service, as the product always has it: composing the prompt names its fixed rules to it, to be sent once (#408). */
  s.anthropic = { keepTheFixedInstructions: () => {} };
  s.prisma = stubPrisma();
  /*
   * The base prompt comes from the database at runtime, seeded from ENGINE_RULES. Returning null
   * here would test a product with no rules in it at all, which is the opposite of the point.
   */
  s.prompts = { getActiveContent: async (key: string) => (key === 'system' ? ENGINE_RULES : null) };
  s.logger = { log: () => {}, warn: () => {}, error: () => {}, debug: () => {} };
  s.config = { get: () => undefined };
  s.context = { build: async () => ({ block: 'DYNAMIC CONTEXT: the live board' }) };
  s.documents = { forPrompt: async () => '' };
  s.notes = { pendingFor: async () => [] };
  s.coach = { stepFor: async () => coachStep };
  return s;
};

const checkIn = {
  id: 'c1', groundId: 'g1', participantId: 'p1', sessionNumber: 3,
  participant: {
    partyType: 'PARTY', roleAsDescribed: 'Renewals owner', userId: 'u1',
    detectedFunction: 'SALES', detectedFunctionConfidence: 0.8,
  },
} as any;

describe('the voice did not cost us the engine', () => {
  let prompt = '';
  beforeAll(async () => {
    prompt = await service({ step: 'name the blocker out loud', staircase: 'ownership' })
      .composeSystemPrompt(checkIn);
  });

  it('produces a real prompt at all', () => {
    expect(prompt.length).toBeGreaterThan(2000);
  });

  it('still carries the coaching step', () => {
    expect(prompt).toMatch(/name the blocker out loud/);
  });

  /*
   * THE ROLE, BUT ONLY IN THE PERSON'S OWN WORDS. Request 36, 27 September 2026: for somebody the
   * lead invited, `roleAsDescribed` is the lead's sentence about them, and it no longer reaches that
   * person's own session. The lead's own row is their own words, so the lead's session still carries
   * it - that is the wiring this test exists to keep.
   */
  it('still carries the role it is talking to, where the role is in their own words', async () => {
    expect(prompt).not.toMatch(/Renewals owner/);
    const theLeads = await service({ step: 'name the blocker out loud', staircase: 'ownership' })
      .composeSystemPrompt({ ...checkIn, participant: { ...checkIn.participant, partyType: 'INITIATOR' } });
    expect(theLeads).toMatch(/Renewals owner/);
  });

  it('still carries what earlier sessions established, which is the whole over-time claim', () => {
    /* Session 3 with two prior sessions: the longitudinal read has to be in here. */
    expect(prompt).toMatch(/Shipped the pricing band draft|SESSION 1|SESSION 2|prior/i);
  });

  it('still carries the specificity read from last time', () => {
    expect(prompt).toMatch(/specificity|specific/i);
  });

  it('still carries the live board that the context service builds', () => {
    expect(prompt).toMatch(/DYNAMIC CONTEXT: the live board/);
  });

  it('and the new voice is in the same prompt rather than instead of it', () => {
    expect(prompt).toMatch(/WHO YOU SOUND LIKE/);
    expect(prompt).toMatch(/REGISTER: heavy/);   /* PIP */
    expect(prompt).toMatch(/RHYTHM:/);
  });

  it('THE DILUTION CHECK: the demands survive the charm', () => {
    /*
     * The real risk of a voice change is not a missing block, it is a friendlier interview that
     * settles for less. These are the teeth, and they have to still be in the prompt that now also
     * tells it to be warm.
     */
    expect(prompt).toMatch(/pushback/i);
    expect(prompt).toMatch(/VAGUE/);
    expect(prompt).toMatch(/written down|evidence/i);
  });
});

/**
 * And the misquote guard is in the reply path rather than sitting in a file of its own. A rule
 * nothing calls is a comment - which is the lesson three separate prompt rules taught today.
 */
describe('the misquote guard is actually in the path', () => {
  /* Comments stripped first: a guard a comment can satisfy is not a guard. */
  const src = require('fs')
    .readFileSync(__dirname + '/conversation.service.ts', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ');

  it('is called on the reply before it is stored or shown', () => {
    expect(src).toMatch(/withoutQuotesTheyDidNotSay\(forHumans\(rawReply\), theirWords\)/);
    expect(src).toMatch(/const stripped = \{ text: honest,/);
  });

  it('compares against what the PERSON typed, never against the AI turns', () => {
    /* Checking a quote against the model's own previous words would validate its own invention. */
    expect(src).toMatch(/turns\.filter\(\(t\) => t\.role !== TurnRole\.AI\)/);
  });
});

/**
 * And the rhythm nudge is on the path, reading the real history rather than being a rule nobody
 * consults. Same reason as everything else in this file: a check that nothing calls is a comment.
 */
describe('the rhythm nudge reads what actually happened', () => {
  const src = require('fs')
    .readFileSync(__dirname + '/conversation.service.ts', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ');

  it('looks at this check-in\'s own last three AI turns', () => {
    expect(src).toMatch(/tooManyQuestionsInARow\(rows\.map\(\(r\) => r\.content\)\.reverse\(\)\)/);
    /* Asserted as two facts rather than one span: the first version wanted a comma straight after
       TurnRole.AI and the code closes a brace there, so it failed on punctuation, not on substance. */
    expect(src).toMatch(/checkInId: checkIn\.id, role: TurnRole\.AI/);
    expect(src).toMatch(/take: 3,/);
  });

  it('and the line it produces goes into the prompt', () => {
    expect(src).toMatch(/documentNotAsDescribed, rhythmNow, dynamicContext/);
  });

  it('never removes a question from a written turn, because that is the probe', () => {
    /* The tempting enforcement is the wrong one: a warmer chat that asks for less is the failure. */
    expect(src).not.toMatch(/replace\([^)]*\\\?[^)]*''\)/);
  });
});
