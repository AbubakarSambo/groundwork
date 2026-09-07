# Decisions — all four answered 2026-08-26

Hafsah's calls: 1 context always enabled · 2 don't tidy · 3 this is fine · 4 context is fine.
Kept for the record, with what was done.


## 1. CONTEXT_ENABLED is off in this environment

`process.env.CONTEXT_ENABLED` is unset, so it resolves false. Confirmed against the running API:
`contextEnabled: False`.

With it off: the tab is named Documents rather than Context, every document is private to its
uploader whatever its visibility column says, and the context chat is hidden. Most of the Context
page design is built and dark.

**DECIDED: always enabled.** Default flipped to on (`!== "false"`), so no deployment has to set
anything. Nothing was retroactively revealed: while the flag was off `setVisibility` threw before
touching anything, so no document anywhere could have been Open or Closed — every row is Own, and
turning it on only lets people start choosing. The env var still kills it without a deploy.

*(The shared note and the expectations panel are not gated and work either way.)*

## 2. The reveal tiles name people four different ways

On a four-party check-in the row reads: **Managing the contract · Contractor up for renewal ·
Sahar Jamal · a teammate** — two roles, a name, and a placeholder, side by side.

Seven Tabs flags this under Report's "Bad" list but proposes no fix, and it is not a bug: it is
`participantLabel` falling back name → role → "a teammate", which is the one-way-to-name-a-person
rule working as designed. Somebody who has not joined yet genuinely has no name to show.

**DECIDED: don't tidy.** Left as it is. Each tile stays as specific as it honestly can be, and
nobody gets an invented placeholder name.

## 3. An org admin who is not a party cannot upload a document

Who Sees What's table has "Upload a document: Lead Yes · Org admin Yes · Participant Yes". The code
refuses an org admin who is not a party, and this one is **structural rather than an oversight**: a
`GroundDocument` is owned by a `GroundParticipant` row, and an org admin covering for a lead has no
such row.

I gave them the context chat, notes, and the schedule, because those needed no participant row. This
one does.

**DECIDED: this is fine.** Uploading stays for parties. An org admin adds context through a note or
the context chat, and does not appear in the roster as a party to a check-in they are only covering.

## 4. The two artifacts disagree about where the lead's private note lives

Seven Tabs, Tab 7: *"The private note about each person stays here [Setup], labelled what to look at
first, never quoted. It is the one per-person thing a lead genuinely types."*

The Context Page, input 3: the lead's notes are one of the five things ON Context.

It is currently on Context, with the other four inputs and the audience labelling. Moving it to Setup
would split the lead's writing across two tabs; leaving it keeps all context in one place but leaves
Setup holding only how the check-in runs.

**DECIDED: context is fine.** It stays on Context, beside the other four inputs and their audience
labels. Seven Tabs' Tab 7 line is superseded.

---

# 7 September 2026, evening — the two pickers, the two flows, and who sets a context

Her words, recorded before anything is built from them, because the last three items reverse
decisions taken earlier the same day and a summary written afterwards would smooth that over.

## What she said

**The pickers still differ.** "The scenario cards still look different on the entry chat and there's
no describe your own situation. The entry chat and the in-platform scenario picker look different."

*Established while reading this:* the entry-chat change was merged in #260 and its staging deploy
was still running when she looked. Staging was serving the previous build. So this one is a
deployment lag rather than a defect — but the underlying complaint stands and outlives it, because
the two pickers are two hand-kept lists that have drifted before and will again.

**Each flow is better than the other in a different half.** "The entry chat cards and first page is
awful but the rest of the flow is better. On the in-platform scenario picker, the rest of the flow
sucks and the entry chat flow is better, and having a report at the end is nice."

So: the entry chat's FIRST screen is the weak one and its conversation is the strong one; the
wizard's picker is the strong one and everything after it is the weak one. Her question: should the
in-platform flow reflect the entry chat, given you can add settings and participants at the end or
go to check-in settings afterwards?

**The chat carries no context from the card.** "The new hire chat should ask who the new hire is,
right now it carries no context when you select a card." Picking "A new hire starting" and then
being asked a generic opening is the whole complaint in one line.

**The feedback button covers things.** "One thing I hate is the feedback button is always covering
something important, can we make it movable. yes."

## What she decided

**REMOVE the org admin setting a context and handing it to a lead.** "I think we should remove the
whole org admin setting a context and handing it over to a lead. It seems like it is confusing."

This reverses the morning's decision on the same path. Earlier today the setter path was kept and
made shorter — the brief and the description were skipped for somebody setting a check-in up for
somebody else, on her instruction. That is now to go entirely.

**What replaces it: two ways, plus oversight.** "Maybe you set context but you can add someone to
have oversight... so you either set the context to checkin or set it and other checkin, you just
look at the reports, you can also have others check it."

Read as: step one keeps two answers, not three —

  1. I set the context and objective, and I check in too.
  2. I set the context and objective, others check in. I read the reports.

— and separately, anybody can be added to OVERSEE: they see the reports without being asked to
check in, and without becoming the person who writes the context.

## What this means for the three people

Not decided, and listed because the plan below has to answer it: a LEAD sets context and reads
reports; a PARTICIPANT checks in; an ORG ADMIN currently gets a third path that is being removed —
so an admin who wants a check-in they do not own is either setting it and reading it (answer 2) or
being added for oversight, and never handing the context-writing to somebody else.
