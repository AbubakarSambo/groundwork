/**
 * EACH THING A CHECK-IN OWES, ASKED AS ONE PLAIN QUESTION (re-e, 1 October 2026).
 *
 * The owed lists are written about the person, for the model ("how they see it - what is clear, and what
 * is not"). When the close is held for one of them, the product says it to the person, and turning the
 * list's words into a question by rule gave "How do you see it - what is clear, and what is not?" (two
 * questions joined by a dash), "Does you are comfortable going ahead?" and "Where do you landed". So each
 * one has its question written out here, once, as a single plain question with one question mark.
 * The rule-built question stays only for a line not in this list.
 *
 * Keyed by the owed line's own words, because that is what the close is handed. A test checks every line
 * on every owed list has its question here.
 */
export const EACH_OWED_THING_ASKED_PLAINLY: Record<string, string> = {
  /* The spine every check-in shares. */
  'what they understood they were meant to do': 'What did you understand you were meant to do?',
  'what is actually happening, in their account of it': 'What is actually happening, as you see it?',
  'how they see it - what is clear, and what is not': 'What is still not clear to you?',
  'what has happened since what they said last time': 'What has happened since the last check-in?',
  'what is getting in the way now': 'What is getting in the way now?',
  'where somebody needs to act or step in': 'Where does somebody need to step in?',
  'where it actually landed': 'Where did it actually land?',
  'what is still open or unresolved': 'What is still not settled?',
  'what should happen next, and what would help': 'What should happen next?',
  /* What each situation adds. */
  'how the start is actually going for them': 'How is the start actually going for you?',
  'what would make the job easier': 'What would make the job easier?',
  'what the team was doing before, as each person describes it': 'What was the team doing before the new manager started?',
  'what they need from the new manager': 'What do you need from the new manager?',
  'what they expect to contribute, and on what': 'What do you expect to contribute?',
  'what has actually been useful': 'What has actually been useful?',
  'who decides what, where it is not written down': 'Who decides the things that are not written down?',
  'what matters most to them about how this works': 'What matters most to you about how this works?',
  'what must not be dropped in the handover': 'What must not be dropped in the handover?',
  'what they have found since taking it over': 'What have you found since taking it over?',
  'what is still sitting with the person handing over': 'What is still sitting with the person handing over?',
  'the part of it that is theirs to deliver': 'Which part of this is yours to deliver?',
  'when their part is meant to be done': 'When is your part meant to be done?',
  'the work they are planning to do': 'What work are you planning to do?',
  'what that work needs to be possible - money, people, time': 'What does that work need, in money, people or time?',
  'what actually happened against the plan': 'What actually happened against the plan?',
  'how the work is going right now, not in general': 'How is the work going right now?',
  'what they think is actually wrong': 'What do you think is actually wrong?',
  'what would have to change for it to come right': 'What would have to change for it to come right?',
  'their own view of the decision, and what they are weighing': 'What is your own view of the decision?',
  'whether their view has changed, and what changed it': 'Has your view changed since last time?',
  'where they landed, and anything they still cannot live with': 'Where have you landed on this?',
  'how they see the situation, without being asked to agree': 'How do you see the situation?',
  'what they think still needs to be understood or settled': 'What do you think still needs to be settled?',
  'what they saw happen, in their own account': 'What did you see happen?',
  'how it has affected the work they are responsible for': 'How has it affected the work you are responsible for?',
  'what in the agreement makes sense to them and what does not': 'Which part of the agreement does not make sense to you?',
  'whether they are comfortable going ahead': 'Are you comfortable going ahead?',
  'what their side is responsible for under the agreement': 'What is your side responsible for under the agreement?',
  'whether it is being kept in practice, both ways': 'Is the agreement being kept in practice, on both sides?',
  'how the relationship has actually worked from their side': 'How has the relationship actually worked from your side?',
  'what should continue, change or stop': 'What should change in how this works?',
  'what they have actually carried, in their own account': 'What have you actually carried?',
  'anything they want understood about their contribution': 'What do you want understood about your contribution?',
  'what is happening from their own side': 'What is happening on your side?',
  'what is getting in the way, including anything outside their control': 'What is getting in the way, including anything outside your control?',
  'what support has been given, and whether it is helping': 'What support have you been given?',
  'their own experience of the role, not the group’s': 'What has your own experience of the role been?',
  'what would make the role work better': 'What would make the role work better?',
  /* The two goal cards. */
  'what this is trying to achieve': 'What is this trying to achieve?',
  'the goals or targets, as numbers or dates': 'What are the goals, as numbers or dates?',
  'what people should know going in': 'What should people know going in?',
  'the workplan under the goal, if there is one': 'Is there a plan of work under the goal?',
  'who is responsible for which part of that plan': 'Who is responsible for each part of that plan?',
  'the part of the plan that is theirs to do': 'Which part of the plan is yours to do?',
  'what they are working on': 'What are you working on?',
  'how it is actually going': 'How is it actually going?',
  'what is clear and what is not': 'What is still not clear to you?',
  'what they are answerable for': 'What are you answerable for?',
  'how their work contributes to the goal': 'How does your work contribute to the goal?',
  'what they need from other people': 'What do you need from other people?',
  'what has moved since last time': 'What has moved since last time?',
  'what is off track': 'What is off track?',
  'who needs support, and with what': 'Who needs support?',
  'what is getting in the way': 'What is getting in the way?',
  'what was achieved': 'What was achieved?',
  'what stayed off track': 'What stayed off track?',
  'what should happen next': 'What should happen next?',
  'the main goal everything else sits under': 'What is the main goal everything else sits under?',
  'what has to be achieved and why now': 'What has to be achieved now?',
  'the goal or target that fits their own role': 'Which goal fits your own role?',
  'the wider objective theirs sits under, named in their own words': 'Which wider goal does yours sit under?',
  'anything unclear or missing about how it connects': 'What is unclear about how your goal connects to the wider one?',
  'whether their goal still makes sense': 'Does your goal still make sense?',
  'work another team may also be doing': 'Is another team also doing this work?',
  'goals that pull against each other': 'Do any of the goals pull against each other?',
  'anything they need from another team that is not agreed': 'What do you need from another team that is not agreed yet?',
  'whether the pieces actually connected': 'Did the pieces actually connect?',
  'what to keep, change or add next time': 'What would you change next time?',
};

/**
 * The plain question for an owed line. Lines with guidance after their first sentence ("what they took
 * this on to get. The asset ...") are looked up by the first sentence.
 */
export function theOwedThingAskedPlainly(what: string): string | null {
  const t = (what ?? '').trim();
  const first = (t.split(/(?<=[.?!])\s+/)[0] ?? '').replace(/[.?!]+$/, '');
  return EACH_OWED_THING_ASKED_PLAINLY[t] ?? EACH_OWED_THING_ASKED_PLAINLY[first] ?? FIRST_SENTENCE_ONLY[first] ?? null;
}

/* The lines whose own words run on with guidance for the model. */
const FIRST_SENTENCE_ONLY: Record<string, string> = {
  'what they took this on to get': 'What did you take this on to get?',
  'where they stand against that original outcome': 'Where do you stand now against what you took this on to get?',
  'how they are making their number': 'How are you making your number?',
};
