import { PLAIN_WORDS, WRITTEN_ONCE_FOR_SEVERAL_READERS, EVERY_VERB_KEEPS_ITS_SUBJECT } from '../conversation/plain-words';
/**
 * A HUNDRED ACCOUNTS ARE NOT TWO.
 *
 * The report this product writes is shaped for alignment: a shared picture, what everybody agrees
 * on, where the accounts diverge, and the one question to settle. That is the right shape for two
 * people three months into working together, and it is the wrong shape for a hundred separate
 * organisations answering one question on one link.
 *
 * Proven on 23 September 2026: a hundred Friends of NABG members - agribusinesses, research
 * institutes, funders, traders, distributors and people building panels - answered the same open
 * link about where MarketView should expand. Squeezed into "agreements" and "divergences", a
 * hundred different businesses with different crops, states, volumes, seasons and failures come out
 * as a list of things most people happened to say. Hafsah: "The report should not just count
 * keywords. It should turn 100 individual conversations into a coherent picture."
 *
 * So this is a SECOND read, run beside the alignment one rather than instead of it, and only where
 * there are enough separate accounts for the question to make sense. Its sections are the questions
 * somebody actually has of a network: where people are going, what they need there, what they
 * already have, how they choose who to work with, what went wrong, how the kinds of organisation
 * differ, and where they do not want the same thing.
 *
 * WHAT IT IS NOT ALLOWED TO DO. Every claim carries who said it, in labels, and a count. A section
 * with nothing behind it is left empty rather than filled - "no consensus" said honestly beats a
 * consensus invented to fill a field, and on a hundred accounts an invented one is unfalsifiable.
 */

/**
 * WHEN THIS READ APPLIES.
 *
 * Eight is the smallest number where "how do the kinds of organisation differ" is a real question
 * rather than a way of describing three people. Below it the alignment report is the better read
 * and this one would be padding.
 */
export const ENOUGH_ACCOUNTS_TO_BE_A_NETWORK = 8;

export function readAsANetwork(howManyAnswered: number): boolean {
  return howManyAnswered >= ENOUGH_ACCOUNTS_TO_BE_A_NETWORK;
}

const whoAndHowMany = {
  type: 'object',
  properties: {
    who: {
      type: 'array',
      items: { type: 'string' },
      description: "The labels of the people who said this, exactly as the roster writes them (e.g. 'participant C'). Never a personal name, never an organisation's name - the reader's own copy substitutes those where they are entitled to them.",
    },
    howMany: { type: 'integer', description: 'How many separate accounts said it. Must equal the length of `who`.' },
  },
  required: ['who', 'howMany'],
};

export const THE_NETWORK_REPORT_SCHEMA = {
  name: 'emit_network_picture',
  description: 'Turn many separate accounts into one picture of what this network wants, needs and is afraid of.',
  /*
   * `input_schema`, NOT `parameters`, AND THE DIFFERENCE IS SILENT.
   *
   * `convertTool` reads `tool.input_schema`. Written as `parameters` the tool converted with no
   * schema at all, the model dutifully called it with no arguments, and the report stored
   * `networkPicture: {}` while the log said the read had succeeded in thirty-eight seconds. Nothing
   * failed; a hundred accounts were read and the answer was an empty object.
   */
  input_schema: {
    type: 'object',
    properties: {
      thePicture: {
        type: 'string',
        description: 'What these accounts add up to, in plain language, in four to eight sentences. Not a summary of the questions asked - a reading of what these organisations are collectively trying to do and what is in their way. Say plainly where the accounts do not add up to one thing.',
      },
      whereTheyWantToGrow: {
        type: 'array',
        description: 'The places people named as where they want to go next. One entry per place, most-named first. Only places somebody actually named.',
        items: {
          type: 'object',
          properties: {
            place: { type: 'string', description: 'The state, corridor, market or country, exactly as people named it.' },
            whatTheyWantThere: { type: 'string', description: 'What they are going there for, in plain language.' },
            whatIsStoppingThem: { type: 'string', description: 'What they said is in the way, or empty if nobody said.' },
            said: whoAndHowMany,
          },
          required: ['place', 'whatTheyWantThere', 'said'],
        },
      },
      whatMatters: {
        type: 'array',
        description: 'The products, crops, volumes, seasons, qualities and varieties that came up, with the numbers people actually gave. Never a number nobody said.',
        items: {
          type: 'object',
          properties: {
            thing: { type: 'string', description: 'The crop, product or commodity.' },
            volumesAndSeasons: { type: 'string', description: 'The volumes and seasons people gave, quoted as they gave them. Empty if nobody gave any.' },
            qualityThatDecidesIt: { type: 'string', description: 'The spec that decides whether a delivery is acceptable, where somebody named one.' },
            said: whoAndHowMany,
          },
          required: ['thing', 'said'],
        },
      },
      whoTheyNeedToReach: {
        type: 'array',
        description: 'The actors people said they need: farmers, aggregators, agents, distributors, millers, buyers, enumerators, participants. What they need from each.',
        items: {
          type: 'object',
          properties: {
            actor: { type: 'string' },
            whatFor: { type: 'string' },
            howManyOrWhere: { type: 'string', description: 'Numbers and locations where people gave them.' },
            said: whoAndHowMany,
          },
          required: ['actor', 'whatFor', 'said'],
        },
      },
      dataTheyNeed: {
        type: 'array',
        description: 'What people said they cannot currently see and would act on if they could. The single most useful section for deciding what to build; leave it empty rather than inferring it.',
        items: {
          type: 'object',
          properties: {
            whatTheyCannotSee: { type: 'string' },
            whatTheyWouldDoWithIt: { type: 'string', description: 'Only where they said. Empty otherwise.' },
            said: whoAndHowMany,
          },
          required: ['whatTheyCannotSee', 'said'],
        },
      },
      whatTheyAlreadyHave: {
        type: 'array',
        description: 'Networks, reach, members, agents, sites and capacity people said they already have. This is what the network can be asked for, not what it wants.',
        items: {
          type: 'object',
          properties: { what: { type: 'string' }, said: whoAndHowMany },
          required: ['what', 'said'],
        },
      },
      howTheyChooseWhoToWorkWith: {
        type: 'array',
        description: 'How people said they identify and vet the actors they work with, including where they said they have no way to.',
        items: {
          type: 'object',
          properties: { how: { type: 'string' }, said: whoAndHowMany },
          required: ['how', 'said'],
        },
      },
      whatWentWrong: {
        type: 'array',
        description: 'What failed in 2025-26 and what people said they will not repeat. Keep the specific failure, not the category.',
        items: {
          type: 'object',
          properties: {
            whatHappened: { type: 'string' },
            whatTheyWillNotRepeat: { type: 'string', description: 'Only where they said it in those terms.' },
            said: whoAndHowMany,
          },
          required: ['whatHappened', 'said'],
        },
      },
      byKindOfOrganisation: {
        type: 'array',
        description: 'How the kinds of organisation differ from each other. One entry per kind that is actually present. The point is the difference, not a description of each kind.',
        items: {
          type: 'object',
          properties: {
            kind: { type: 'string', description: "e.g. 'agribusinesses and processors', 'research institutes', 'funders', 'traders', 'distributors', 'organisations building a panel of people'." },
            whatTheyWant: { type: 'string' },
            howTheyDifferFromTheRest: { type: 'string', description: 'The thing this kind needs that the others do not, said plainly.' },
            said: whoAndHowMany,
          },
          required: ['kind', 'whatTheyWant', 'howTheyDifferFromTheRest', 'said'],
        },
      },
      whereTheyWantDifferentThings: {
        type: 'array',
        description: 'Real contrasts and disagreements, including ones where both sides are reasonable. Not everything is a consensus and a report that finds none on a hundred accounts has not read them.',
        items: {
          type: 'object',
          properties: {
            topic: { type: 'string' },
            onePosition: { type: 'string' },
            theOther: { type: 'string' },
            whyItMatters: { type: 'string' },
          },
          required: ['topic', 'onePosition', 'theOther', 'whyItMatters'],
        },
      },
      whereThisCouldBeUseful: {
        type: 'array',
        description: 'Where the thing this check-in was asked about could actually help, grounded in what people said rather than in what would be nice to build. Each one names who it serves and what it would take.',
        items: {
          type: 'object',
          properties: {
            opportunity: { type: 'string' },
            whoItServes: { type: 'string' },
            whatItWouldTake: { type: 'string' },
            said: whoAndHowMany,
          },
          required: ['opportunity', 'whoItServes', 'whatItWouldTake', 'said'],
        },
      },
      whatNobodySaid: {
        type: 'array',
        items: { type: 'string' },
        description: 'What this set of accounts cannot answer, said plainly, so nobody reads a gap as a finding. Include anything the question asked for that people did not give.',
      },
      whatToAskNextTime: {
        type: 'array',
        items: { type: 'string' },
        description: 'The questions that would have made this picture sharper, drawn from where the accounts ran out.',
      },
    },
    required: ['thePicture', 'whereTheyWantToGrow', 'whatMatters', 'byKindOfOrganisation', 'whatNobodySaid'],
  },
} as const;

/**
 * What the model is told before it reads a hundred accounts.
 *
 * The refusals come first and they are the whole design: on two accounts an invented consensus is
 * obvious to the two people who were there, and on a hundred nobody can check it.
 */
export function theNetworkInstruction(howManyAnswered: number, theQuestionAsked: string): string {
  return [
    `${howManyAnswered} separate organisations answered the same question on the same link. They do not know each other, they were not in a room together, and none of them saw anybody else's answer.`,
    '',
    `WHAT THEY WERE ASKED: ${theQuestionAsked}`,
    '',
    'Your job is to turn those accounts into one picture somebody can act on. Not a summary, and not a count of which words came up most.',
    '',
    'WHAT YOU MUST NOT DO.',
    '1. Never write a number, a state, a crop, a volume or a season that nobody said. If three accounts named a state, say three - do not round it into "many" and do not stretch it into "the majority".',
    '2. Never turn an opinion into a fact. "We think the roads are the problem" is what somebody thinks. "We lost a reefer load to a fourteen-hour checkpoint delay" is what happened. Keep them apart in how you write them.',
    '3. Never resolve a contradiction by picking a side. If two accounts cannot both be right, that is a finding and it goes in the contrasts.',
    '4. Never fill a section. An empty array is a true answer and a fabricated entry is not. `whatNobodySaid` is where the gaps go.',
    '5. Never use a personal name or an organisation\'s name. Use the roster labels exactly as they are given to you. The reader\'s own copy puts the real names back where that reader is entitled to them.',
    '',
    'WHAT MAKES THIS USEFUL.',
    'A person reading this should be able to say afterwards: I know where these organisations are going, what they need when they get there, what they already have that I could use, how they decide who to trust, what burned them last year, and where the different kinds of organisation want different things. If your picture does not let them say that, it is a summary and you have not done the work.',
    'Prefer the specific to the general every single time. "Aggregators default after prepayment, and three accounts now refuse to prepay without a guarantor" is worth more than "trust is a challenge in the value chain".',
    '',
    PLAIN_WORDS,
    '',
    WRITTEN_ONCE_FOR_SEVERAL_READERS,
    '',
    EVERY_VERB_KEEPS_ITS_SUBJECT,
  ].join('\n');
}
