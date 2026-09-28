# The bug-fix branch, as it was when the work stopped (28 September 2026)

Hafsah decided on 28 September that there will be no pull requests for now. The whole build is finished first and released once, at the end. This note saves the bug-fix branch as it was at that moment. It is not a finished pull request description, and nothing was opened.

## Where it is

- The branch is `fix/privacy-conversation-crash`, in the separate folder `groundwork-pr1` next to this repository. A copy of it is also on the local branch `wip/fix-privacy-conversation-crash`.
- It starts from commit `80beab98`, the tip of Abubakar's pre-release branch, and not from `wip/plain-reports`. The code at `80beab98` is identical to `origin/main` (`f5c07d39`).
- **It has not been pushed.** The safety check allows each workspace to push only its own branch, and this workspace's branch is `wip/plain-reports`. It exists only on this computer. Hafsah can push it herself with `git push mine wip/fix-privacy-conversation-crash`.
- A local test database, `gw_pr1_live`, was made with the 277 migrations at `80beab98`. Nothing has been written to it yet. No other database was touched.

## What each fix does, and whether it is finished

| Fix | Commit | Finished and tested? |
| --- | --- | --- |
| The date question is asked once, only about a deadline, and in a full sentence. | `b4689bd3` | Yes, with its tests. |
| A reply that repeats our own instruction to a person is never sent. | `e08314db` | Yes. |
| A close is never cut down to two words. | `3e94db8d`, `2f8b3414` | Yes. One test case was left out, because it needs a helper this branch does not have. |
| No guard's cut leaves a fragment to send. | `ea033c08` | Yes. |
| The board opens for a participant when people see only themselves. Before this, it crashed. | `f209ee2d` | Yes. |
| An email address is never shown in place of a name. With no name, the person is "a colleague". | `802b2c17` | Yes. |
| A stream that fails is asked for again the plain way, so a reply is never cut off. | `3a5f29c8` | Yes. |
| Bank and card numbers are hidden before anything stores them or a model reads them: documents, the setup chat, the context chat, the assistant, and both check-in routes. | `cf46bdca` | Yes, 33 tests. |
| The lead's words about a person reach the lead alone: the invitation, the open link, the check-in and the list of check-ins, the board (people list, grid, blocker panel, contribution remit), and the admin roster. With no name given, a check-in is named after its situation, never after the lead's first words. | `f56b6004` | Yes, and 1,839 tests in those parts pass. |
| Labels, the person's own session, and the coaching note: the lead's words never stand in for a name, are never given to the model in that person's own session, and are never said back in their coaching note. | `a89fd13f` | **No.** It was stopped partway. It compiles, but the tests that prove it were not added or run. |

## What was checked

- The full API test run was not done on the finished branch. Before the fixes, the code at `80beab98` already had three failing tests of its own: `a-guard-that-a-comment-satisfies-is-not-a-guard`, `one-date-format-everywhere`, and `a-deployment-that-cannot-send-says-so-at-boot`.
- The type check of the API is clean at `a89fd13f`.
- The client tests for the invitation, the join pages and the setup chat pass: 240 of 240.
- The short live check of a check-in was not done.

## What Abubakar would need to know, when this goes ahead

- On `80beab98`, the check-in screen uses the streamed route, and that route runs none of the conversation guards. So the conversation fixes above change what a person sees only on the plain route, until the streamed route runs them as well.
- On `80beab98`, the stored report labels are built from the lead's description of each person. The unfinished commit does not change how labels are stored. Instead, it replaces a label with a neutral word when the reader gets no name, so that reports already stored stay readable.
- Three tests were changed because they pinned the old, leaking behaviour: `contact-visibility.spec.ts`, `a-label-is-a-subject-line.spec.ts` and `three-things-the-run-left-broken.spec.tsx`. Each one is stricter now, not weaker.
