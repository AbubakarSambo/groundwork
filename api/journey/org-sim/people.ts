/**
 * The people in this org, and how each of them actually behaves.
 *
 * A test where every actor is sharp, articulate and cooperative tells you
 * almost nothing, because that is not who uses the product. The person who
 * matters most here is the one who answers "yeah all good" for six weeks and
 * then is surprised at the end. So each person carries a LEVEL, a STYLE, and a
 * relationship to the product's own vocabulary, and those stay stable across
 * grounds the way a real colleague's would.
 *
 * Level is about how much scaffolding they need, never about their worth. A
 * BASIC user is not a bad employee - they are someone who did not read the
 * email, is answering on a phone between clinics, and will give you four words
 * unless you ask well. If the product only works for the HIGH people, it does
 * not work.
 */

export type Level = 'HIGH' | 'MEDIUM' | 'BASIC';
export type Style = 'cooperative' | 'rushed' | 'distracted' | 'defensive' | 'chatty' | 'terse';
/** What they do when the product uses its own words at them. */
export type Jargon = 'fluent' | 'tolerates' | 'confused' | 'put-off';

export interface Person {
  key: string;
  name: string;
  email: string;
  level: Level;
  style: Style;
  jargon: Jargon;
  /** One line, so a finding about them can be read in context. */
  note: string;
}

export const PEOPLE: Record<string, Person> = {
  sahar: {
    key: 'sahar', name: 'Sahar Ali', email: 'sahar@org.test',
    level: 'HIGH', style: 'cooperative', jargon: 'fluent',
    note: 'Ops lead who bought the tool. Reads the screen, follows instructions, will notice when something is inconsistent.',
  },
  hafsah: {
    key: 'hafsah', name: 'Hafsah Jumare', email: 'hafsah@org.test',
    level: 'HIGH', style: 'cooperative', jargon: 'fluent',
    note: 'Senior. Structured, gives specifics unprompted. The easiest possible user, and therefore the least informative.',
  },
  kennedy: {
    key: 'kennedy', name: 'Kennedy Obi', email: 'kennedy@org.test',
    level: 'MEDIUM', style: 'rushed', jargon: 'tolerates',
    note: 'Competent but always between things. Short answers first, will elaborate if asked once. Skims.',
  },
  abubakar: {
    key: 'abubakar', name: 'Abubakar Sambo', email: 'abubakar@org.test',
    level: 'MEDIUM', style: 'terse', jargon: 'tolerates',
    note: 'Does the work, describes it in the flattest words available. "Fine." The invisible-contributor risk.',
  },
  maureen: {
    key: 'maureen', name: 'Maureen Eze', email: 'maureen@org.test',
    level: 'HIGH', style: 'chatty', jargon: 'fluent',
    note: 'Talks a lot and buries the specific thing in paragraph three. Tests whether the engine can find the signal.',
  },
  ejiro: {
    key: 'ejiro', name: 'Ejiro Okon', email: 'ejiro@org.test',
    level: 'MEDIUM', style: 'cooperative', jargon: 'confused',
    note: 'Willing, but asks what the words mean. "What is a ground?" Tests whether the product explains itself.',
  },
  eric: {
    key: 'eric', name: 'Eric Mensah', email: 'eric@org.test',
    level: 'MEDIUM', style: 'defensive', jargon: 'put-off',
    note: 'Assumes this is surveillance. Answers, but guardedly, and pushes back on being measured.',
  },
  hafeezah: {
    key: 'hafeezah', name: 'Hafeezah Bello', email: 'hafeezah@org.test',
    level: 'BASIC', style: 'distracted', jargon: 'confused',
    note: 'Answers on a phone, half-reads the question, goes off-topic. The hardest user to get a usable account out of.',
  },
  kavon: {
    key: 'kavon', name: 'Kavon Badie', email: 'kavon@org.test',
    level: 'BASIC', style: 'cooperative', jargon: 'tolerates',
    note: 'Pleasant, positive, and says nothing checkable. Sounds fine every week. The one a concerned read is correct about.',
  },
  adam: {
    key: 'adam', name: 'Adam Grunewald', email: 'adam@org.test',
    level: 'HIGH', style: 'cooperative', jargon: 'fluent',
    note: 'Names dates, numbers and people without being asked. Any negative read on Adam is a false positive.',
  },
  nate: {
    key: 'nate', name: 'Nate Peterson', email: 'nate@org.test',
    level: 'HIGH', style: 'rushed', jargon: 'fluent',
    note: 'Specific and fast, and genuinely blocked by things outside his control. Blocked must never read as behind.',
  },
  rime: {
    key: 'rime', name: 'Rime Haddad', email: 'rime@org.test',
    level: 'MEDIUM', style: 'cooperative', jargon: 'confused',
    note: 'New manager, new to the tool, does not know the vocabulary or the team. Everything is unfamiliar at once.',
  },
};

export const person = (key: string): Person => {
  const p = PEOPLE[key];
  if (!p) throw new Error(`unknown person: ${key}`);
  return p;
};
