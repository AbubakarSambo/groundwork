# The guard that came off with the use-cases page

`the-public-page-and-the-picker-agree.spec.ts` checked that the situations named on the public
use-cases page were the situations the product actually offers. It was written because that page had
drifted badly: it still used vocabulary the app had moved off, carried five group headings the app no
longer used, and was missing two situations entirely — so somebody could read it, pick the situation
they recognised, sign up, and not find it.

The use-cases page was removed on 7 September 2026 by decision ("remove the use cases page"), and no
marketing page lists situations any more — checked, not assumed. A guard whose subject does not exist
fails on every run, and a permanently red guard is worse than no guard: it teaches everybody to
ignore red.

**If a public list of situations ever comes back** — on pricing, on the home page, anywhere in
`marketing/` — restore this guard with it. Recover it from git:

    git show 271476d~1:client/src/lib/the-public-page-and-the-picker-agree.spec.ts

The reason it existed has not gone away. Marketing is a separate package with a separate build, so
`scenario-catalog.ts` cannot reach it, and the only thing that stops the two drifting is a test that
fails when they disagree.
