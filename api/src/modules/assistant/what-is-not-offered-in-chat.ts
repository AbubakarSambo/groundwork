/**
 * EVERYTHING THIS PRODUCT DOES IS EITHER REACHABLE BY ASKING, OR ON THIS LIST.
 *
 * "You can do everything through the assistant" is a claim, and a claim about a
 * growing product decays the week after somebody makes it. This is what turns it
 * into something with no unexplained gaps: every area of the product is either
 * mapped to a capability, or written here with the reason it is not.
 *
 * A guard fails on anything that is neither. So a new area of the product forces
 * a decision — expose it, or say why not — at the moment somebody builds it,
 * rather than a year later when a customer asks why they cannot do a thing by
 * asking for it.
 *
 * THE REASONS ARE NOT EXCUSES. Three are legitimate and everything here is one
 * of them:
 *
 *   NOT A PERSON'S QUESTION — it belongs to a machine, an operator or a
 *   platform administrator, and no employee would ever ask for it.
 *
 *   THE CHAT IS THE WRONG SHAPE — it is a document, a screen full of numbers, or
 *   a form with twenty fields, and a conversation would be a worse way to do it.
 *
 *   NOT YET, AND HERE IS WHAT IT WOULD TAKE — an honest backlog entry, which is
 *   the only kind of gap allowed to sit here permanently without embarrassment.
 */

export type WhyNot = 'not a person’s question' | 'the chat is the wrong shape' | 'not yet';

export interface NotOffered {
  area: string;
  why: WhyNot;
  because: string;
}

export const NOT_OFFERED_IN_CHAT: NotOffered[] = [
  {
    area: 'admin',
    why: 'not a person’s question',
    because: 'The platform console. It belongs to us running Groundwork, not to anybody inside a customer.',
  },
  {
    area: 'ops',
    why: 'not a person’s question',
    because: 'Our own back office. It is a customer of this product, not a part of it.',
  },
  {
    area: 'auth',
    why: 'not a person’s question',
    because: 'Signing in happens before there is anybody to ask. A chat that could authenticate you would be a chat that could be talked into it.',
  },
  {
    area: 'billing',
    why: 'not a person’s question',
    because: 'Money. Nobody should be able to change what an organisation pays by typing a sentence, and a mistake here is not recoverable by saying so.',
  },
  {
    area: 'webhooks',
    why: 'not a person’s question',
    because: 'Machine-to-machine plumbing, configured by whoever integrates rather than by anybody using the product.',
  },
  {
    area: 'email',
    why: 'not a person’s question',
    because: 'The sending itself. Asking for something to be sent is a capability; the mail service underneath it is not.',
  },
  {
    area: 'prompts',
    why: 'not a person’s question',
    because: 'How the product interviews people. Ours to change, and changing it from inside a conversation is how an interview gets talked out of its own questions.',
  },
  {
    area: 'patterns',
    why: 'not a person’s question',
    because: 'What the product learns across organisations. Nobody inside one of them can see it, so nobody can ask for it.',
  },
  {
    area: 'whatsapp',
    why: 'not a person’s question',
    because: 'A delivery channel we turn on or off, not something anybody asks for.',
  },
  {
    area: 'users',
    why: 'the chat is the wrong shape',
    because: 'Managing an organisation’s people is a list with roles on it. Doing it a sentence at a time is slower and easier to get wrong.',
  },
  {
    area: 'public-api',
    why: 'not a person’s question',
    because: 'Credentials and machine tokens. A secret shown in a conversation is a secret in a conversation.',
  },
  {
    area: 'embed',
    why: 'not a person’s question',
    because: 'The panel’s own handshake. It is how the conversation exists at all.',
  },
  {
    area: 'entry',
    why: 'the chat is the wrong shape',
    because: 'Signing up and setting an organisation up for the first time. It is already a guided conversation of its own, before this assistant exists for that person.',
  },
  {
    area: 'board',
    why: 'the chat is the wrong shape',
    because: 'A screen full of numbers that are read by scanning. There is a `board` block for showing one inside a reply; driving it by sentence is worse than looking.',
  },
  {
    area: 'reports',
    why: 'not yet',
    because:
      'Reading a released report by asking is item seven of the plan, and sending one is item four. Generating and releasing stays with whoever leads the check-in.',
  },
  {
    area: 'conversation',
    why: 'not yet',
    because:
      'Answering a check-in in the same box as the assistant. The panel routes between them today; doing it inside one conversation needs the two never to be confused, which is not a thing to get nearly right.',
  },
  {
    area: 'participants',
    why: 'not yet',
    because:
      'Inviting somebody onto a check-in is part of creating one, which is item six. Accepting an invitation stays with the person accepting it — that is the consent.',
  },
  {
    area: 'coach',
    why: 'not yet',
    because: 'Asking for an external coach. A small form today, and a capability once the coach network exists.',
  },
  {
    area: 'feedback',
    why: 'not yet',
    because: 'Telling us something is wrong with the product. Worth having as a capability and nobody has built it.',
  },
  {
    area: 'resolution',
    why: 'not yet',
    because: 'Proposing and countering a settlement between two people. High stakes and slow — it needs its own thinking, not a lane.',
  },
  {
    area: 'intelligence',
    why: 'not yet',
    because: 'Outcome feedback after the fact. It has no natural question somebody would ask yet.',
  },
];

export const NOT_OFFERED_AREAS = new Set(NOT_OFFERED_IN_CHAT.map((n) => n.area));

/**
 * The areas somebody CAN reach by asking, and the capability that reaches them.
 *
 * Kept as a map from the product's own module names, so the guard can read the
 * modules that exist rather than a list somebody remembered to update.
 */
export const REACHABLE_IN_CHAT: Record<string, string> = {
  grounds: 'start_a_check_in',
  /* Moved off the not-offered list on 6 September. A chat cannot carry a file;
     it can start the upload, ask who the document is for, and make the answer
     stick — which is the part that matters. */
  documents: 'add_a_document',
  drafts: 'set_an_objective',
  detectors: 'what_should_we_talk_about',
  knowledge: 'how_we_work',
};

/**
 * The honest backlog, in the words a person would hear it in.
 *
 * Only the "not yet" ones. Somebody asking what this can do does not need to be
 * told that billing is not a person's question — they need to know which of the
 * things they might reasonably want is not here.
 */
export function whatIStillCannotDo(): string[] {
  return NOT_OFFERED_IN_CHAT.filter((n) => n.why === 'not yet').map((n) => n.because);
}
