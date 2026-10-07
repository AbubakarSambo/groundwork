# Bug log: the engine's part of the user journey sweep

The engine workspace's share of `docs/user-journey-tests.md`, Part 1: every journey through the engine, WhatsApp (the signed test webhook) and email (the local mail catcher), with scheduled things run by moving the clock. The journeys are A2, A3, A4, A5, A6, A7, L1, L3, L5, L6, L7, L8, M2 and M3 on WhatsApp, M4, M6, E1, and every situation in "Situations to repeat". Screen faults go to the screens workspace as requests in `docs/answers-from-engine.md`.

Fixed in order: privacy, then anything that stops someone using it, then wrong information, then confusing, then cosmetic. Every fix has a test that fails without it, and the journey it came from is run again.

## Journeys

| Journey | Roles and channels | Result | Bugs |
| --- | --- | --- | --- |

## Bugs

| ID | Where | Who | What happened | What should happen | How serious | Screenshot or log | Fixed |
| --- | --- | --- | --- | --- | --- | --- | --- |
