# Removed marketing copy

Copy taken off the marketing home page and kept here so nothing is lost. Nothing in this file is
rendered anywhere.

## "What Groundwork does" section, removed 2026-08-20

The whole section was removed except its final privacy callout, which stayed on the page.

**Eyebrow:** What Groundwork does

**Heading:** It shows you what meetings miss.

**Opening paragraph:** Every person gives their own independent account. Groundwork compares every
account and reveals the differences no meeting can.

**Panel:** Everyone answers on their own, in private

**Cards:**

- See where people quietly disagree
- Catch problems before they become expensive
- It pushes past vague updates
- Everyone gets their own quiet coaching

## Capability list, not yet placed

Cross-reference: every account lined up against every other
Across time: this week against six weeks ago
Probing: it asks for specifics, examples, evidence
Vagueness: where the answers stay vague
Document evaluation: checked against what was actually written down
Alignment: whether everyone is pulling toward the same outcome
Quiet disagreement: where accounts diverge
Effort vs outcome: hard work on the wrong thing
Disproportionate weight: too much resting on one person or task
Hidden contributors: who is actually carrying it
Light coaching: everyone gets their own note

## The full removed markup

Kept verbatim in case any of it is wanted back.

```html
  <!-- WHAT GROUNDWORK DOES -->
  <div class="l-sec l-fade" style="background:var(--gw-paper);border-bottom:1px solid var(--gw-border)">
    <div class="l-wrap-sm">
      <p class="l-sec-label">What Groundwork does</p>
      <h2 class="l-sec-h2" style="margin-bottom:14px">It shows you what meetings miss.</h2>
      <!-- 6a: the signature sentence, moved down out of the hero rather than
           cut. It was competing with the headline up there; here it opens the
           section that explains the mechanism. -->
      <p style="font-size:17px;color:var(--gw-text);line-height:1.7;margin-bottom:26px;font-weight:500">Every person gives their own independent account. Groundwork compares every account and reveals the differences no meeting can.</p>
      <!-- B3: the independent account leads. It is the actual innovation and
           the reason everything downstream is worth reading, so it goes first
           rather than third. B4: headings say what you get, not what it does. -->
      <div class="l-fx-grid">
        <div class="l-fx l-fx-lead">
          <h3>Everyone answers on their own, in private</h3>
          <p>Nobody's account gets shaped by the loudest person in the room, or by what they think the manager wants to hear. That independence is what makes the comparison worth anything.</p>
        </div>
        <div class="l-fx">
          <h3>See where people quietly disagree</h3>
          <p>It lines up every account and shows where they match, where they don't, and whether the work is actually being delivered, while there is still time to do something about it.</p>
        </div>
        <div class="l-fx">
          <h3>Catch problems before they become expensive</h3>
          <p>Each check-in is compared against what was agreed at the start, what was said before, and what everyone else is saying, so changing expectations, unclear ownership, and growing risk show up while you can still act.</p>
        </div>
        <div class="l-fx">
          <h3>It pushes past vague updates</h3>
          <p>Instead of accepting "things are going well", it asks for specifics, examples, and evidence.</p>
        </div>
        <!-- SAID AS A PRODUCT CLAIM, NOT LEFT AS A DETAIL OF AN EXAMPLE.
             The private guide was only visible on the page as a small card under
             one of the sample reports, so somebody deciding whether to buy this
             could not tell it existed as a feature at all. It is one of the two
             or three most valuable things here: every person gets coached, every
             time, and it costs the person running the check-in nothing.

             With this card there are four followers under the lead, so the grid
             is a clean two-by-two and the odd-one-out rule that used to stretch
             the last card across the row is no longer needed. -->
        <div class="l-fx">
          <h3>Everyone gets their own quiet coaching</h3>
          <p>Each time a report lands, every person in the Ground gets a short private note drawn only from their own record: a way to open the conversation, a question worth carrying, and one thing somebody else raised that is worth taking seriously. Nobody reads anybody else's, including you.</p>
        </div>
      </div>

      <!-- MOVED INSIDE "WHAT GROUNDWORK DOES", where it belongs.
           It sat in a section of its own after the sample reports, which made
           the strongest trust line on the page a footnote to the evidence
           rather than the closing statement of the mechanism it explains. A
           reader has the privacy question the moment they understand that
           everybody gives an independent account, which is one paragraph up. -->
```

## "Who it is for" section, removed 2026-08-20

Removed whole. Included the "Everyone gets the report, at the same moment" claim, the
"What your team gets" list and the "What Groundwork is not" list.

```html
  <div class="l-sec l-fade" style="background:var(--gw-paper);border-bottom:1px solid var(--gw-border)">
    <div class="l-wrap-sm">
      <p class="l-sec-label">Who it is for</p>
      <!-- "THE SAME PICTURE GOES TO EVERYONE IN IT" IS TOO ABSOLUTE, and it is
           wrong in exactly the case where it matters most.

           Fourteen field officers in fourteen districts who have never met
           should not be reading each other's accounts, and the product agrees:
           namesVisibleTo is `viewerIsLead || isSelf || isLead`, so a cohort
           participant sees themselves and the person running it, and everyone
           else stays a role. The page was overclaiming past behaviour that is
           already correct, which is the worst way to be wrong - it invites
           somebody to discover a limit that was actually a considered decision.

           So the claim says what the rule IS. Everybody gets a report at the
           same moment, built from the same accounts; how much of it is named
           depends on where you sit. -->
      <h2 class="l-sec-h2" style="margin-bottom:18px">Everyone gets the report, at the same moment.</h2>
      <p class="l-prose" style="font-size:15px;color:var(--gw-sub);line-height:1.8;margin-bottom:16px">Groundwork is not a way of reporting your team to you. Everyone in a Ground gets the report the moment it is released, built from the same accounts, so the person running it can correct course and the people doing the work can correct course themselves, before a small thing turns into an expensive one.</p>
      <p class="l-prose" style="font-size:15px;color:var(--gw-sub);line-height:1.8;margin-bottom:16px">Who is named in it depends on where you sit. The person running it sees everyone. Everybody else sees themselves and the person running it, and the rest stay roles rather than names. On a group who all do the same job in different places, that is the whole point: they are not there to read each other.</p>
      <p class="l-prose" style="font-size:14px;color:var(--gw-sub);line-height:1.75;margin-bottom:26px">The person running it also sees occasional notes on what is worth asking about. Prompts for a better conversation, never a verdict, and never anyone's raw answer.</p>

      <!-- Side by side, because the two lists are a CONTRAST and stacked
           vertically the reader never sees them together. -->
      <div class="l-facing">
      <div style="background:var(--gw-paper);border:1px solid var(--gw-border);border-radius:10px;padding:20px 22px">
        <div style="font-size:13px;font-weight:700;color:var(--gw-text);margin-bottom:10px">What your team gets</div>
        <ul style="font-size:14px;color:var(--gw-sub);line-height:1.9;margin:0;padding-left:20px">
          <li>a place to say what is actually going on, without saying it to someone's face</li>
          <li>the quiet contributor's work on the record, not just the confident account of it</li>
          <li>a blocker heard while it still matters, instead of after the deadline</li>
          <li>the same picture the person running it has</li>
        </ul>
      </div>

      <div style="border:1px solid var(--gw-border);border-radius:10px;padding:20px 22px">
        <div style="font-size:13px;font-weight:700;color:var(--gw-text);margin-bottom:10px">What Groundwork is not</div>
        <ul style="font-size:14px;color:var(--gw-sub);line-height:1.9;margin:0;padding-left:20px">
          <li>It does not monitor activity, screen time, or who is online. It holds no record of any of them.</li>
          <li>It does not score, rank, or rate anyone. There is no number attached to a person anywhere in it.</li>
          <li>It never shows anyone's raw answers, to you or to anyone else.</li>
          <li>It never says who said what about whom.</li>
        </ul>
      </div>
      </div>
    </div>
  </div>
```

## Removed 2026-08-20: the "what meetings miss" heading

Deleted rather than reworded. It made the same claim as the hero paragraph one screen above it
("Meetings only tell you part of the story"), so the section opened by re-arguing a point the
reader had already accepted, while the line beneath it tried to be the section thesis too.

**Heading:** It shows you what meetings miss.

The scope line took its place as the heading: "Groundwork is about the groundwork, not all the
work." It is the only claim in the section a competitor would not also make, and the paragraph
under it ("not an HR system, employee monitoring tool, or permanent performance-management layer")
continues the same thought instead of answering a question the old heading never asked.

## Removed 2026-08-20: the hero problem paragraph

**Paragraph:** Meetings only tell you part of the story. Updates get filtered. The confident speak
up, the quiet stay quiet, and what's missing gets filled in from memory.

Asked to be moved to another section rather than deleted. Checked first, and there is nowhere for it
to go: "Why leaders miss problems" already makes all three of its claims at greater length, and one
of them is that section's own heading.

| The hero line said | The section already says |
|---|---|
| Meetings only tell you part of the story | "You rely on meetings, written updates, chat... Each of those is someone's summary, and every summary leaves something out" |
| Updates get filtered | "Every update you get has been through someone else first" (the section heading) |
| The confident speak up, the quiet stay quiet | "Some people dominate meetings. Some avoid conflict. Some do not feel safe challenging a decision." plus "shaped by who is confident, who was in the room" |

So moving it would have recreated the duplication that the "what meetings miss" heading was deleted
for two changes earlier. Kept here instead. If it is wanted on the page, the honest placement is as
a REPLACEMENT for that section's opening prose, which is longer and less concrete, not as an
addition above it.

## Narrowed 2026-08-20: twelve capabilities to six

Twelve labels in a three-column grid is a block people scan and leave; nobody reads item nine. Six
were also doing work another six already did.

**Kept:** Cross-reference, Quiet disagreement, Hidden contributors, Effort vs outcome, Clarity gaps,
Across time.

**Removed, and why each folded into something that stayed:**

| Removed | Folded into |
|---|---|
| Document evaluation: checked against what was actually written down | Cross-reference. Both are reality against a stated intention. |
| Real progress vs. Goal: what everyone has contributed towards | Cross-reference, same reason. |
| Alignment: whether everyone pulls in the same direction | Quiet disagreement. Two sides of one coin, and divergence is the more concrete half. |
| Disproportionate weight: too much resting on one person or task | Hidden contributors. Both are about who is actually carrying the work. |
| Probing: asks for specifics, examples, evidence | Nothing. It describes how the tool works, not what the reader gets. |
| Light coaching: everyone gets their own notes | Nothing. Same reason, and it is a feature rather than an insight. |

The six that remain are each the only one saying their thing, and four of them name something no
competitor offers: divergence between accounts, who is really carrying the work, effort spent on the
wrong thing, and the same question asked six weeks apart.
