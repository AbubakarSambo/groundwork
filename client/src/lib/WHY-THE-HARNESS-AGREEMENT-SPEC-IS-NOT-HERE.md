# the-persona-harness-and-the-ui-agree.spec.ts is not in this branch

It read `groundwork_local_test/_ui_strings.py` and checked that the labels the persona harness
clicks still exist in the product's own screens. A good rule: one commit renaming "Save my ground"
to "Save my check-in" once took five browser suites red for three days.

Two reasons it is not here.

**The harness is not in this branch.** This branch is the product without the test harnesses, so
there is nothing on this side for the product to agree with.

**And the file it reads has never been committed.** Not on `main`, not on `staging`, not on
`feat/four-reports`. It only ever existed in somebody's working tree, so the spec passed on that
one machine and threw `ENOENT` everywhere else. It could not have passed in CI on any branch.

**When the harness comes back, bring the spec back with it**, and commit `_ui_strings.py` at the
same time. The rule is worth keeping. It just has to live beside the thing it is about, with both
halves in version control.
