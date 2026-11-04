# Chat is king

Groundwork's direction for every build and batch from now on. Read it with CLAUDE.md, standards.md, docs/groundwork-memory-system.md and docs/groundwork-design-guide.md. It doesn't change the batch being built now; it shapes how every later batch is planned.

---

## The idea

Everything in Groundwork can be done by talking to it. Not some things: everything, including signing up.

A person should be able to message Groundwork, on WhatsApp, by email or on the web, and say what they want in their own words. Groundwork works out the rest with them, in the conversation, and does it.

Screens still matter, but as places to look at what's happening (the board, reports, the Desk), not as the only way to get things done. If something can only be done by finding the right page and filling in a form, that's a gap to close.

This is where software is going. People will expect to say what they want and have it done. Groundwork should be built for that world.

## What it looks like

**Signing up and starting.** A founder messages Groundwork: "I want updates from my sales team on deals, payments and visits every weekday." Groundwork:
- asks only what it needs to know, in the conversation (who's on the team, their phone numbers or emails, when updates should happen);
- forms the check-in's questions from what the founder said, and shows them in one line to confirm;
- creates the organisation and the account as it goes, without a separate sign-up form;
- invites the team, by WhatsApp or email, once the founder says yes.

**Getting updates.** The founder gets the team's updates as messages: the morning summary, what needs them, who needs them, by WhatsApp or email. They can reply to act ("Praise Kevin", "Ask Joseph about Juja", "Approve the warning"), or ask anything ("Will we hit 120?").

**Team members.** They check in by replying, on WhatsApp or email, with no sign-up. They can ask Groundwork things and request things the same way.

**The organisation forms over time.** Groundwork doesn't need everything set up on day one. It learns and asks when something comes up, and the organisation's setup grows from real moments:
- A team member says they're meant to be on leave next week → Groundwork asks the lead: "Joseph says he's on leave next week. Do you have a leave policy? If not, how many days a year do people get, and who approves?" The answer becomes the leave policy, approved by the lead, on the Desk.
- Someone asks for money for fuel → "Who approves spending, and above what amount does it need a receipt?" The answer becomes the spending rules.
- A lead says "Mercy now runs the schools" → her role and areas change, confirmed in one line.
- A document is shared in a conversation → it's read, summarised, and offered to the Desk.

Every rule, policy, role and setting can be formed this way, from conversation, confirmed by the person who has the right to decide.

## Principles

1. **Everything by chat.** Every action a person can take on a screen can also be done by talking to Groundwork, on the web, WhatsApp and email. New features are designed chat-first, with a screen as the view, not the other way round.
2. **One conversation, many channels.** It's the same Groundwork on the web, WhatsApp and email, aware of who the person is and what's in progress (a check-in, a request, setup).
3. **Ask only what's needed, when it's needed.** No long setup up front. Groundwork asks for something at the moment it matters, and remembers the answer.
4. **Form, don't impose.** Policies, rules, roles and settings grow from real moments in conversation, proposed by Groundwork and confirmed by whoever has the right to decide.
5. **Confirm before acting.** One plain line before anything is created, sent, approved or changed ("I'll invite Kevin, Mercy and Joseph by WhatsApp and start tomorrow at 5pm. Go ahead?").
6. **The same rules as everywhere else.** Chat goes through the product's own actions, with the same permission checks, approvals, privacy rules and records. Nobody can talk Groundwork into doing what they couldn't do on a screen.
7. **Screens are views and receipts.** Screens show what's happening and what was done; they're never the only way in. Fewer pages, not more.
8. **Plain, direct language, in one voice ("I").** Short messages, names, numbers and days; no AI speak; simple English where needed.
9. **Everything said is remembered.** What's agreed in chat goes into the record, the assessments and the memory, with the person's own words, so it's never asked again.

## How this fits what we're building

- **The assistant** ("[first name]'s assistant") is the chat. It becomes the main way in, not a side panel.
- **Check-ins** are already conversations; they stay the heart of it.
- **The memory system** is what lets chat work: the organisation's shelf, team shelves and person files are what Groundwork reads to know what's already known and what to ask.
- **The Desk** is where policies formed in chat are kept, readable by everyone.
- **WhatsApp and email** are first-class: people can do everything there, without ever opening the web.

## For planning each batch

When turning the issues list into a fix plan:
- for every flow touched, ask: can this be done entirely by chat? If not, note what's missing;
- prefer removing a page or a form over adding one;
- when something needs setting up, design it as a moment in conversation, formed when it's needed;
- measure, in the judged runs, how much of each use case can be done by chat alone, on each channel.

## Building towards it, in steps

Small steps, each measured, in later batches (not the current one):
1. **Everything the assistant can do by chat today, checked against every screen action**, with a list of the gaps.
2. **Sign-up and setup by chat**: a founder can go from a first message to a team invited, without a form, on the web, WhatsApp and email.
3. **Updates and actions by chat**: the lead gets everything by message and acts by replying.
4. **Organic setup**: leave, spending, roles and policies formed from the moments they come up, confirmed by the right person, kept on the Desk.
5. **Then the rest**, until every use case can be done by chat alone.

## How we know it's working

- The share of each use case that can be done by chat alone, on each channel, rising towards all of it.
- Time from a founder's first message to their team's first check-in.
- How often people have to open a page to get something done.
- The first-experience and use-case scores, towards 8.5.
