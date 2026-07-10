# Run these tests as a person, not as a test suite

You are going to use this product the way a real person would, from a cold start, with
no knowledge of it. Then you are going to report honestly on what happened.

Read this whole file before you do anything.

## The rule that makes this worth doing

**You know nothing about this product except what is on the screen in front of you.**

You have access to the repo. Do not read it to find out where the buttons are. Do not
look up a route to skip a step. Do not construct a URL you were not given. If you cannot
find something, that is the finding. Write it down and keep going, or give up.

The moment you use knowledge a first-time user would not have, the test is worthless.

You may read the code for one purpose only: to start the app and configure it. Nothing else.

## Do not fabricate. Ever.

- Never write a step you did not take.
- Never write a result you did not see.
- Never say a flow works because it looks like it should.
- If a screenshot is blank, say the screenshot was blank.
- If you get stuck, say you got stuck. Getting stuck is data.

An honest "I could not work out how to invite anyone" is worth more to me than a fabricated
success. If I later find you invented a step, everything else you reported becomes useless.

## Setup

1. Start the mail catcher and leave it running:

   ```bash
   python mailcatcher.py
   ```

   SMTP on `127.0.0.1:1025`, HTTP on `127.0.0.1:1080`.

2. Point the app's outbound mail at it. Find the SMTP config (env vars, a config file,
   a mailer service). Set host `127.0.0.1`, port `1025`, no auth, no TLS.
   **Tell me what you changed and where.** If you cannot find where mail is sent, say so
   and stop, because the invite journeys cannot run without it.

3. Start the app locally. Note the base URL.

4. Confirm the catcher works before you go further:

   ```bash
   curl -s http://127.0.0.1:1080/health
   ```

## Tools you have

**Playwright**, to drive a real browser. Use the browser. Do not curl the API to check
whether something worked. A person cannot curl the API.

**The mail catcher.** When a persona is told to check their email:

```bash
curl -s "http://127.0.0.1:1080/latest?to=tom.baker@example-test.invalid"
curl -s "http://127.0.0.1:1080/link?to=tom.baker@example-test.invalid"
curl -s "http://127.0.0.1:1080/link?to=tom.baker@example-test.invalid&match=invite"
```

`POST /clear` between agents so mail from one persona does not confuse the next.

Read the email as the person would. Is the subject clear? Does the body explain why they
got it? Is the link obvious? Note all of this. A confusing invite email is a real defect.

**The typography checker.** Run it on every page you land on and on every email:

```bash
python typography.py --url http://localhost:3000 --crawl
python typography.py --mail-api http://127.0.0.1:1080
python typography.py --file path/to/generated_report.md
```

House style: no em dashes, no en dashes, straight quotes only. It catches curly quotes,
ellipsis characters, non-breaking spaces, and double hyphens too. Exit 1 means violations.

Report every violation with its location. These matter. They appear in front of customers.

## How to be the person

For each agent in `agents.json` you become that person. Take on their goal and their patience.

At every single step, before you click, write down:

- **What I expect to happen**

Then act. Then write down:

- **What actually happened**
- **How I feel** (curious, reassured, delighted, hesitant, confused, frustrated, lost,
  suspicious, bored)

The gap between expectation and reality is the entire product of this test. A step where
you expected one thing and got another is a finding even if nothing was broken.

Take a screenshot at every step. Save to `results/screenshots/a{ID}_s{STEP}.png`.

Stop when you have got what you came for, or when a real person with that goal and that
patience would give up. **Giving up is a valid, valuable outcome.** Say exactly what made
you give up.

Cap at roughly 25 steps per agent.

## Also watch for, at every step

- **Waiting.** Time it. If you wait more than 5 seconds with no indication anything is
  happening, that is a finding. Say how long, and whether you would have waited.
- **Overlapping or clipped things.** Buttons on top of buttons, text running off screen,
  anything unreadable.
- **The AI.** Slow? Does it hold the thread across turns? Does it contradict itself?
  Does it answer a question you did not ask?
- **Seeing what you should not.** If you can reach a ground, a report, or another person's
  contribution that you were never given access to, **stop and flag it loudly.** This is
  the most serious class of finding.
- **Not seeing what you should.** You contributed to a ground and cannot see its result.
- **Money.** Were you told before you were charged? Is the limit clear before you hit it?
  Do you understand what you are paying for?

## Reports: three different failures, do not conflate them

If a persona is shown a generated report, judge it as its recipient would.

**Hallucination.** A claim with nothing behind it. Ask: did anyone actually say this? Is
this number from anywhere? You have an advantage a real user does not: you know what was
put into the ground. Use it. Cross-check every figure and every claim about what the group
said against what the participants actually contributed.

**In a certified or paid report a single fabricated claim is disqualifying.** One invented
section discredits the whole document. Flag it as critical.

**Insufficiency.** Honest but useless. Empty sections. Hedged into meaninglessness. Restates
the question without answering it. Ask: would the recipient send this back?

**Extrapolation.** The subtle one. The data touches the claim but does not support it at the
strength stated. One comment becomes "the team believes". Two people become "consensus".
A correlation becomes a cause. A single observation becomes "a clear trend".

Watch especially for **false consensus**: two participants disagreed sharply and the report
smooths it into agreement. That is worse than no report at all.

## Sessions run in order

Sessions 2, 3 and 4 test whether the product remembers people and compounds value. They mean
nothing if identities do not carry across. Use one browser profile per persona, persisted to
`state/<identity>/`, and reuse it.

- **Session 1** first contact. Can a stranger tell what this is for?
- **Session 2** coming back. Does returning feel rewarded, or like starting over? If a returning
  person is asked to sign up again, that is critical.
- **Session 3** the longitudinal promise. **The session-3 report must cross-reference sessions
  1 and 2.** If it reads as a standalone snapshot with no memory of what came before, that is
  the single most important failure in this whole test. It is the product's core promise.
- **Session 4** the org subscription. Is the compounding value visible at the moment you are
  asked to pay? Does anyone lose access or history when the org converts?

## What to give me at the end

`results/findings.md`:

1. **Critical findings first.** Anything that leaks data, loses money, or would lose the user.
   Especially: reaching something you were not invited to; a returning user re-onboarded from
   scratch; a fabricated claim in a report; a session-3 report with no memory of sessions 1 and 2;
   a participant hit with a paywall; history lost at conversion.
2. **Every place I got confused,** quoted in my own words at that moment.
3. **Every place I gave up,** and exactly why.
4. **Bugs.** What I did, what broke, what I saw.
5. **Waits over 5 seconds,** with timings.
6. **Visual defects.** Overlaps, clipping.
7. **Typography violations.** Every em dash, en dash, curly quote, with location.
8. **Report quality.** For each report: hallucinated claims, overreaching claims, missing
   sections. Quote them.
9. **Per session:** did the person get what they came for, yes or no.

Then, in plain language: **would I use this again, and why or why not.**

## One last thing

If the app will not start, or mail is not wired up, or you cannot get past sign-up, say so
plainly and stop. Do not simulate the rest.

A short honest report beats a long invented one.
