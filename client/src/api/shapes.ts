/**
 * THE SHAPES THE SERVER MAY LEAVE INCOMPLETE, FILLED IN ONCE (Hafsah, 15 November 2026: "fix why the
 * page keeps cracking").
 *
 * The types say a field is there, and the server sometimes does not send it: a board held back
 * sends almost nothing, an older record predates a field, a privacy-trimmed answer drops what the
 * reader may not see. Every component used to guard for that on its own (and the ones nobody
 * thought of crashed the page, "Cannot read properties of undefined (reading 'includes')"). So the
 * safe empty value for a missing list or object is put in here, once, as the answer arrives, and the
 * components read it as present.
 *
 * Only an ABSENT field is filled, and only with nothing (an empty list, a count of nothing): a field
 * the server did send is never changed, and nothing is made up. A reader who is not meant to see a
 * part still gets it absent in meaning, because an empty list draws nothing.
 *
 * Each entry names a route and the fields it promises. To add a shape, add a line here.
 */
const AGAINST_SUCCESS = { conditions: [], definitions: [], spokenTo: { count: 0, of: 0 } }

const SHAPES: { route: RegExp; only?: (data: Record<string, unknown>) => boolean; promises: Record<string, unknown>; inside?: Record<string, Record<string, unknown>> }[] = [
  /* The board: held back, it sends almost nothing, but everything below reads `sections`, the people and the lists drawn from them. */
  { route: /^\/grounds\/[^/]+\/board$/, promises: { sections: [], participants: [], objectives: [], decisions: [], patterns: [] },
    /* A grid that is there has rows and sessions; a grid that is not there stays not there (it would draw an empty one). */
    inside: { checkInGrid: { rows: [], sessions: [] } } },
  /* "What success looks like": the count and both lists are always read, whoever is looking. */
  { route: /^\/grounds\/[^/]+\/report\/against-success$/, promises: AGAINST_SUCCESS },
  /* My work, when it is on: where the organisation keeps judgements of a person off, the parts about the person's behaviour and coaching are served empty or not at all. */
  { route: /^\/grounds\/[^/]+\/my-work$/, only: (d) => d.on === true,
    promises: {
      numbers: [], toDo: { othersNeed: [], own: [], emptySays: '' }, achieved: { items: [], note: '', emptySays: '' },
      performing: { note: '', behaviours: [], libraryNote: '' }, coaching: { better: [], keep: [], betterEmpty: '', keepEmpty: '' },
      checkIns: { heading: '', due: 0, done: 0, onTime: 0, specific: 0, emptySays: null },
      reports: { heading: '', items: [], emptySays: '' }, items: { heading: '', note: '', itemWord: '', rows: [], emptySays: '' },
    } },
  { route: /^\/today$/, promises: { needs: [], comingUp: [], count: 0 } },
  { route: /^\/you$/, promises: { checkIns: [], turns: [], goals: [], saidYoudDo: [], todos: [], ownReports: [] } },
  { route: /^\/company$/, promises: { priorities: [] } },
]

/* A shape that rides inside other answers (the session report carries one) under a known name, whichever route brought it. */
const RIDES_INSIDE: Record<string, Record<string, unknown>> = { againstSuccess: AGAINST_SUCCESS }

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

function fill(data: Record<string, unknown>, promises: Record<string, unknown>): Record<string, unknown> {
  const filled: Record<string, unknown> = { ...data }
  for (const [field, empty] of Object.entries(promises)) {
    if (filled[field] === undefined || filled[field] === null) {
      filled[field] = Array.isArray(empty) ? [] : isObject(empty) ? { ...empty } : empty
    } else if (isObject(empty) && isObject(filled[field])) {
      /* An object that is there is filled inside as well (the count of whom was spoken to, with its two numbers). */
      filled[field] = fill(filled[field] as Record<string, unknown>, empty)
    }
  }
  return filled
}

/** The answer with every promised field present. Anything that is not an object (a refusal, nothing) is returned as it came. */
export function fillTheShape(path: string, data: unknown): unknown {
  if (!isObject(data)) return data
  const shape = SHAPES.find((s) => s.route.test(path.split('?')[0]) && (!s.only || s.only(data)))
  let filled = shape ? fill(data, shape.promises) : data
  for (const [name, promises] of Object.entries(shape?.inside ?? {})) {
    if (isObject(filled[name])) filled = { ...filled, [name]: fill(filled[name] as Record<string, unknown>, promises) }
  }
  for (const [name, promises] of Object.entries(RIDES_INSIDE)) {
    if (isObject(filled[name])) filled = { ...filled, [name]: fill(filled[name] as Record<string, unknown>, promises) }
  }
  return filled
}
