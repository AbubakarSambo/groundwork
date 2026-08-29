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
