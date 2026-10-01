/**
 * WHERE A CUSTOMER STANDS, TAKEN FROM A SALES CHECK-IN (request 28, part a).
 *
 * When somebody in a sales check-in says where a customer they know stands (a quote sent, a buying date,
 * a yes, a deposit waiting), Groundwork writes it once, in a few plain words, against that customer. The
 * customers board shows the latest. Everything here that decides what is kept is code, not the model:
 *   - WHICH CUSTOMER: a name is matched to a customer the organisation already has, and only when exactly
 *     one customer matches. An unknown name or a name that fits two customers writes nothing.
 *   - WHAT IS KEPT: a fact about the customer. A line that names a person, speaks of "I" or "you", carries
 *     a label, or holds a date or a number that nobody said is dropped, never repaired.
 *   - WHAT IS READ: only the words the person said in their own check-in, never a report, never a question
 *     to Ask Groundwork, never a lead's private note.
 *
 * Part (b) of the request, "changing something on the board tells the person who owns the customer, in
 * their next check-in", is not built. It waits for Hafsah.
 */

export const CUSTOMER_STANDING_PROMPT_KEY = 'customer_standing';

export const CUSTOMER_STANDING_PROMPT = `You are reading what one person said in a sales check-in, to find where a customer stands.

You are given the names of the customers the organisation already knows, and the person's own words.

For each known customer the person said where it stands, write:
   - customer: the name of that customer, exactly as it is in the list. Leave out any customer that is not in the list.
   - says: one or two short, plain, full sentences on where that customer stands, each ending with a full stop.

WHAT COUNTS AS WHERE A CUSTOMER STANDS. A quote was sent. They have said yes. A deposit is waiting. They plan to buy in a certain month. They have asked to wait. They have said no. Something the customer is waiting for.

RULES.
Facts about the customer only. Never how anybody works, never what anybody should have done, never a rating, a score or a label.
Never name a person. Write "Quote sent." and never "Miriam sent the quote."
Use only the dates, months and numbers the person said. Never work out a date or a number. If they did not say when, say nothing about when.
Never include how the person felt about the customer, or what the customer was like to deal with.
One entry for each customer, at most. If the person said nothing about where a customer stands, leave it out.
Be conservative. An empty list is a correct answer.

Examples of the way to write it.
"Quote sent. Buys in January."
"Said yes. The deposit is waiting."
"Asked to wait until the new shop opens."`;

export const CUSTOMER_STANDING_SCHEMA = {
  name: 'emit_where_customers_stand',
  description: 'Where each known customer stands, from what the person said.',
  input_schema: {
    type: 'object',
    properties: {
      customers: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            customer: { type: 'string' },
            says: { type: 'string' },
          },
          required: ['customer', 'says'],
        },
      },
    },
    required: ['customers'],
  },
} as const;

const SAYS_MOST = 300;

function plain(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * THE ONE CUSTOMER A NAME MEANS, OR NOTHING. Exact name first (capitals and punctuation ignored): it counts
 * only if exactly one customer has that name. With no exact name, a name that sits whole inside exactly one
 * customer's name, or the other way round (at least five letters), counts. Two customers that fit is
 * ambiguous and is never guessed.
 */
export function theOneCustomer<T extends { title: string }>(named: string | null | undefined, known: T[]): T | null {
  const n = plain(named ?? '');
  if (!n) return null;
  const exact = known.filter((k) => plain(k.title) === n);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return null;
  if (n.length < 5) return null;
  const within = known.filter((k) => {
    const t = plain(k.title);
    return t.length >= 5 && (` ${t} `.includes(` ${n} `) || ` ${n} `.includes(` ${t} `));
  });
  return within.length === 1 ? within[0] : null;
}

const LABELS = /\b(pip|at risk|underperform\w*|low performer|high performer|score[sd]?|rating|rated|ranking|ranked|lazy|incompeten\w*|exit)\b/i;
const FIRST_OR_SECOND_PERSON = /\b(i|i'm|i've|i'll|me|my|mine|we|we've|we'll|our|ours|you|your|yours)\b/i;
const MONTHS = /\b(january|february|march|april|may|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi;
const FIGURES = /\d[\d,.]*/g;

/**
 * THE WORDS, OR NOTHING. Returns the line tidied, or null when it may not be kept. `said` is what the person
 * said; every figure and every month or day in the line has to be in it. `peopleNames` are the names of the
 * people in the organisation (a name that is also part of the customer's own name is not counted).
 */
export function whatMayBeKept(says: string | null | undefined, said: string, peopleNames: string[], customerTitle = ''): string | null {
  const line = (says ?? '').replace(/\s+/g, ' ').trim();
  if (!line || line.length > SAYS_MOST) return null;
  if (LABELS.test(line) || FIRST_OR_SECOND_PERSON.test(line)) return null;

  const theirs = new Set(plain(customerTitle).split(' '));
  const words = new Set(plain(line).split(' '));
  for (const name of peopleNames) {
    for (const part of plain(name).split(' ')) {
      if (part.length >= 2 && !theirs.has(part) && words.has(part)) return null;
    }
  }

  const spoken = said.toLowerCase();
  for (const f of line.match(FIGURES) ?? []) {
    const bare = f.replace(/[.,]+$/, '');
    if (bare && !spoken.includes(bare)) return null;
  }
  for (const m of line.match(MONTHS) ?? []) if (!spoken.includes(m.toLowerCase())) return null;

  /* Plain full sentences, each ending in a full stop. A line that does not is fixed only by a missing final stop. */
  const tidy = /[.!?]$/.test(line) ? line : `${line}.`;
  if (/[?!]/.test(tidy) || /[:;]|->|→|—|–/.test(tidy)) return null;
  if (!/^[A-Z0-9"']/.test(tidy)) return null;
  return tidy.length <= SAYS_MOST ? tidy : null;
}
