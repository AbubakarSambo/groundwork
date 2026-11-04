# Building Groundwork: design and behaviour guide

For anyone, person or Claude, designing or building what people see and talk to in Groundwork: screens, conversations, messages, emails and the assistant. Read it with CLAUDE.md, the five fix rules, standards.md and the prototype. Where this guide and the prototype disagree on how something looks, the prototype wins; this guide explains why things should feel the way they do.

---

## 1. Who we design for

**A busy lead** who wants their team to succeed, has no patience, hates AI speak, and checks Groundwork between other things. They need to know in seconds where things stand, what needs them, and who needs them, and to act in one tap.

**A team member** who didn't ask for Groundwork, may have weaker English, uses WhatsApp more than anything, and will only keep checking in if it's quick and gives them something back.

**An admin** who sets things up once and wants it to just work.

Design for the least patient of them. If a busy lead on a phone, with one hand, can't get it in a glance, it isn't done.

## 2. What helps a manager manage

Every screen and message should do at least one of these, or it shouldn't exist:

1. **Show where things stand against the goal**, in one line, with the gap.
2. **Show what needs them**: decisions only they can make, named, with who is waiting.
3. **Show who needs them**: who's slipping, who's stuck, who's quietly excellent, with evidence.
4. **Translate their expectations to the team** so they don't have to repeat themselves.
5. **Do the chasing for them**: reminders, proof, follow-ups, without the lead lifting a finger.
6. **Help them be fair**: evidence beside every judgement, and their own bias shown back to them.
7. **Help them act**: praise, a deadline, a conversation, a plan, or firing when there are grounds, one tap away, with the evidence attached.
8. **Save them time**: fewer meetings, fewer status questions, nothing to reconstruct before a hard decision.

## 3. Cognitive load: say less, show what matters

- **One main thing per screen**, first and largest. Everything else quieter, below or folded.
- **One primary action per section.** Other actions are quiet links.
- **Lists stop at three**, then "and N more", unless the person is looking for the full list.
- **Short sentences, one idea each.** Names, numbers, days. No paragraphs where a line will do.
- **Progressive disclosure**: the summary first, the detail one tap away, the evidence one more tap.
- **Recognition over recall**: show the options, the names, the last answer, rather than making people remember.
- **The same word for the same thing everywhere.** If it's "check-in" on one screen, it's never "session" or "ground" on another.
- **Numbers that agree everywhere.** A number that differs between two screens destroys trust in both.
- **No internal words**: never "ground", "lane", "session ID", "extraction", or anything from the code.
- **No explaining the tool.** If a screen needs an explanation, the screen is wrong.
- **Empty states say what will appear and what to do**: "No check-ins yet. Start one."
- **Errors say what went wrong and what to do**: "That didn't save. Try again."

## 4. Elegant design

- **The prototype is the standard**: its colours (cream and navy), its fonts (Literata for titles and big numbers, Atkinson Hyperlegible for everything else), its spacing, its hairlines, its buttons.
- **Quiet by default.** Thin rules instead of boxes, no box inside a box, no shadows except pop-ups, no heavy borders.
- **Crisp, not smudged**: whole-pixel sizes, solid colours, every font weight actually loaded.
- **Buttons only for actions.** Primary flat navy; secondary with a hairline; quiet actions as plain links. Everything tappable at least 44 pixels.
- **Phone first.** It must work at 390 pixels wide, with one thumb, with no sideways scrolling. The bottom tab bar on the phone stays.
- **Nothing added because there's room.** Every element earns its place, or goes.

## 5. Barriers and levers: why people do or don't use it

### Barriers to remove

| Barrier | What it looks like | How to remove it |
|---|---|---|
| **Effort** | Long check-ins, typing, signing up, finding the right page. | Taps and photos over typing; check in by replying on WhatsApp or email; no sign-up for team members; the assistant does it by chatting. |
| **Unclear value** | "Why am I doing this?" | Give something back every time: an answer, a next step, credit, a problem unblocked. |
| **Fear of judgement** | People hide problems or overstate. | Groundwork is fair and evidence-based; it never accuses; praise is public, criticism private; people can correct the record. |
| **Distrust** | Wrong facts, contradicting numbers, untrue lines. | One source; every statement traceable; "That's not right" everywhere; mistakes fixed visibly. |
| **Ambiguity** | Not knowing what to do next. | Every screen and message ends with one clear next step. |
| **Bad timing** | A message when they can't act on it. | Their working days and hours; one routine message a day; quiet hours. |
| **Low literacy or weak English** | Long words, long sentences. | Simple English automatically for those who need it; buttons and photos instead of writing. |

### Levers to use (ethically)

- **Defaults**: the right thing should be the easy, pre-filled thing (the team taken from the conversation, cadence proposed, invitations ready).
- **Implementation intentions**: ask "what will you do, and when?" so promises have a day and a step.
- **Commitment and follow-through**: people keep promises they made in their own words, and Groundwork remembers them for them.
- **Feedback**: show progress soon after effort: "That's 3 of your 5 this week."
- **Recognition**: named, specific, from the lead: "Grace: well done, Kevin. 6 sold this week, all with photos."
- **Social proof, gently**: "4 of 5 have checked in today" nudges the fifth, without shaming.
- **Goal gradient**: show how close they are to the target; effort rises as the goal nears.
- **Loss framing, sparingly**: only for real consequences the lead has set (missed check-ins named to the lead), never as a trick.
- **The lead's voice**: nudges and questions come from the lead by name, which carries authority and builds theirs.

### Never

- Dark patterns, false urgency, guilt messages, hidden costs, or making it hard to stop.
- Public shaming, rankings of people against each other, or leaderboards that humiliate.
- Telling people something will take two minutes when it takes ten.

## 6. Gamification: meaningful, not childish

Only where it reflects real progress towards real goals:

- **Progress towards the target**, for the team and for each person, always visible.
- **Streaks for checking in**, gently ("on time 6 days running"), never punished when broken.
- **Milestones**: a target hit, a first deal with proof, a month of kept promises, recognised by name.
- **Team-level achievements** over individual leaderboards.
- **No points, badges or levels for their own sake.** If a game element doesn't help someone do their work better, leave it out.

## 7. Conversations

- **Sound like a sharp, kind colleague**: direct, plain, short, warm when it's earned.
- **Understand first.** Say back what was understood in one line; ask only what isn't known; never ask the same thing twice.
- **Build on what they just said.** Follow what matters to them, not a list.
- **Questions that help people think**: what success looks like, what's really in the way, what they'll do and when, how they'll know it's slipping.
- **Check claims without accusing**: "What shows the payment?" not "Are you sure?"
- **Invite correction**: end with a read-back ("Here's what I recorded… Anything wrong?").
- **End well**: offer to wrap up in its own words when the person seems done; close with what was recorded and what happens next. No question limits, no forced close.
- **Stay calm with difficult people**: short, firm, never mocking, never lecturing; nothing impossible gets recorded as fact; no permission is ever bypassed.

## 8. Messages and email

- One routine message a day, on one channel per opening, inside working hours.
- The first line says why it matters to them today, by name: "Joseph, Juja Hardware is waiting on a price."
- One clear action, answerable in one reply or one tap.
- Wins celebrated by name; problems stated plainly; firing called firing.
- The same facts as the board, in the same words.

## 9. The assistant

- Opens with "What do you need?" and does it, by chatting.
- Answers from the organisation's shelf, names its source, and says what it doesn't know and who would.
- Confirms in one line before acting.
- Never discusses individual people's performance.

## 10. How we know the experience is good

Measured in every judged run, by an impatient judge who hates AI speak:

- **Time**: to the first useful thing, to the first words of a reply (target within 2 seconds), to the full reply (within 8 seconds), and to finish each task.
- **Effort**: taps, typing, screens, and repeated questions per task.
- **Clarity**: could the lead answer "where are we, what needs me, who needs me" in under a minute?
- **Trust**: wrong facts, untrue lines, contradicting numbers (all heading to zero).
- **Return**: do people come back the next day without being chased?
- **The rating**: 1 to 10 per use case, with quoted reasons, towards 8.5 with nobody below 7.5.

## 11. Anti-patterns to remove on sight

- AI speak: "it appears", "notably", "it's worth noting", "a conversation worth having", "delve", "leverage".
- Explaining the tool, privacy notes in messages, disclaimers.
- More than one primary button; boxes in boxes; heavy borders; smudged text.
- Half-sentences as goals or to-dos; Groundwork's own words recorded as someone's promise.
- Numbers that disagree; dates that are stale; counts that leave people out.
- Asking for what's already known; asking the same thing twice; cutting people off.
- Internal words on screen; email addresses instead of names.
- Anything removed in a clean-up that people still need (phone numbers, upload, actions): check before removing.
