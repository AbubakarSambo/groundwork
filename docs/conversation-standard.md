# What a good check-in sounds like

Taken from the prototype (`docs/prototype/screens/B3-the-check-in/`). Every check-in must meet this, in every situation. The reviewer reads real conversations from the scenario run against this list.

## The standard

1. **It uses the lead's name.** "Bisi says your target this quarter is 12 approved facilities. Is that right?" Never "the person who set this up", never "the initiator".
2. **Good news first, when there is some.** "Kariuki Butchery paid on Monday. That's a sale that counts."
3. **It starts from what they said last time.** "Yesterday you said Green Mart wanted a quote. What happened?"
4. **One question at a time.** Never two questions in one message.
5. **Full plain sentences.** Short, but complete. No jargon: say "waiting for" rather than "bottleneck", "sales not yet closed" rather than "pipeline". Use the words the team itself uses.
6. **Suggested answers** under each question, two to four short ones the person might give. They are a help, never a limit.
7. **It asks for proof without sounding like an interrogation.** "A photo of the order is enough. Then it counts as proven." Never curt, such as "That's the activity."
8. **It asks for the specific detail**: how many, which one, by when. It checks that a blocker is real: who, what was tried, by when. It asks about anything at most twice.
9. **It never comments on someone's answers getting shorter.** If they do, the next check-in starts from the last clear thing they said.
10. **It can be paused or skipped,** and skipping is never held against anyone.
11. **It ends with three things:**
    1. What is now in their record, each line marked: proven, confirmed, their word, or memory.
    2. Why answering matters: "Wairimu also answers a check-in. The report puts the answers side by side. It shows where you agree and where you see things differently. It does not decide who is right."
    3. What happens next: when the next check-in opens, and when the report is shared.
12. **It keeps all the engine's value** (see `docs/engine-value.md`): proof, specific detail, blockers checked, past words brought back.

## Wrong, and right

| Wrong (from the real product today) | Right |
| --- | --- |
| We are tracking credit sales against the target for this quarter. the person who set this up said your target is 12 approved facilities. | Bisi says your target this quarter is 12 approved facilities. Is that right? |
| That's the activity. What specific kinds of businesses are you visiting, or what type of applications are you prioritizing? For instance, larger businesses, specific industries, or certain loan types? | Thank you. Which kinds of business do most of your applications come from? For example, shops, restaurants or transport. |
| At which point in the process are most of your pipeline deals currently stuck? | Where are most of your open applications waiting right now? |
| What was your total disbursed amount this quarter? | How much money has been paid out to your customers this quarter? |

## How it is checked

- `tools/score_run.py`: turns that ask more than one question, curt turns, jargon in Groundwork's turns, and the engine-value numbers. None may get worse against the baseline.
- The reviewer reads, in full, at least one conversation from each of these scenarios after every change to the conversation: sales (OKR_ALIGNMENT), the performance plan (PIP), the lost customer (ACUTE_SHOCK) and the new hire (NEW_HIRE). It marks each against the twelve points above.
