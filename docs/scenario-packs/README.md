# The 50 scenario packs

These live **only in the database**, not in the code. `SEED_PROMPTS` in
`conversation/prompt-library.ts` carries just two keys, `system` and `report_synthesis`, and those
two are re-seeded from their files on every boot. Nothing re-seeds these fifty, so **editing a file
in this folder changes nothing at all**. They are here to be read and compared, which was not
possible before.

`current/` is the version that runs today, exported on 26 September 2026.

Several have been revised eight times since August. They are where each situation's own voice
lives, and Hafsah reviews any replacement before it is switched on. Improved versions will go in a
sibling folder and be written to the database as NEW versions that are **not** activated; the rows
below are never deleted or overwritten.

| Key | Version | Characters |
| --- | --- | --- |
| [`scenario.acute_shock.initiator`](current/acute_shock__initiator.md) | 1 | 4,958 |
| [`scenario.acute_shock.participant`](current/acute_shock__participant.md) | 1 | 4,958 |
| [`scenario.board_strategy.initiator`](current/board_strategy__initiator.md) | 1 | 1,034 |
| [`scenario.board_strategy.participant`](current/board_strategy__participant.md) | 1 | 1,034 |
| [`scenario.cohort_check.initiator`](current/cohort_check__initiator.md) | 2 | 1,579 |
| [`scenario.cohort_check.participant`](current/cohort_check__participant.md) | 2 | 1,579 |
| [`scenario.cohort_check.starting.initiator`](current/cohort_check__starting__initiator.md) | 2 | 2,828 |
| [`scenario.cohort_check.starting.participant`](current/cohort_check__starting__participant.md) | 1 | 2,139 |
| [`scenario.contract_renewal.initiator`](current/contract_renewal__initiator.md) | 7 | 4,025 |
| [`scenario.contract_renewal.participant`](current/contract_renewal__participant.md) | 2 | 1,922 |
| [`scenario.contract_review.initiator`](current/contract_review__initiator.md) | 2 | 2,533 |
| [`scenario.contract_review.participant`](current/contract_review__participant.md) | 2 | 2,533 |
| [`scenario.crisis_alignment.initiator`](current/crisis_alignment__initiator.md) | 2 | 2,437 |
| [`scenario.crisis_alignment.participant`](current/crisis_alignment__participant.md) | 2 | 3,025 |
| [`scenario.discovery.initiator`](current/discovery__initiator.md) | 4 | 2,188 |
| [`scenario.discovery.participant`](current/discovery__participant.md) | 3 | 4,488 |
| [`scenario.drift.initiator`](current/drift__initiator.md) | 4 | 4,264 |
| [`scenario.drift.participant`](current/drift__participant.md) | 2 | 2,899 |
| [`scenario.implementation_tracking.initiator`](current/implementation_tracking__initiator.md) | 2 | 2,770 |
| [`scenario.implementation_tracking.participant`](current/implementation_tracking__participant.md) | 2 | 2,770 |
| [`scenario.new_advisor.initiator`](current/new_advisor__initiator.md) | 8 | 4,018 |
| [`scenario.new_advisor.participant`](current/new_advisor__participant.md) | 2 | 1,867 |
| [`scenario.new_cofounder.initiator`](current/new_cofounder__initiator.md) | 7 | 3,976 |
| [`scenario.new_cofounder.participant`](current/new_cofounder__participant.md) | 3 | 1,883 |
| [`scenario.new_hire.initiator`](current/new_hire__initiator.md) | 7 | 4,035 |
| [`scenario.new_hire.participant`](current/new_hire__participant.md) | 3 | 2,573 |
| [`scenario.new_manager.initiator`](current/new_manager__initiator.md) | 7 | 3,983 |
| [`scenario.new_manager.participant`](current/new_manager__participant.md) | 2 | 2,611 |
| [`scenario.new_project.initiator`](current/new_project__initiator.md) | 7 | 3,926 |
| [`scenario.new_project.participant`](current/new_project__participant.md) | 2 | 1,822 |
| [`scenario.okr_alignment.initiator`](current/okr_alignment__initiator.md) | 5 | 2,739 |
| [`scenario.okr_alignment.participant`](current/okr_alignment__participant.md) | 5 | 2,739 |
| [`scenario.open_read.initiator`](current/open_read__initiator.md) | 1 | 1,458 |
| [`scenario.open_read.participant`](current/open_read__participant.md) | 1 | 1,458 |
| [`scenario.pip.initiator`](current/pip__initiator.md) | 5 | 3,606 |
| [`scenario.pip.participant`](current/pip__participant.md) | 5 | 3,606 |
| [`scenario.pulse_check.initiator`](current/pulse_check__initiator.md) | 1 | 2,081 |
| [`scenario.pulse_check.participant`](current/pulse_check__participant.md) | 1 | 2,081 |
| [`scenario.realign_team.initiator`](current/realign_team__initiator.md) | 6 | 4,183 |
| [`scenario.realign_team.participant`](current/realign_team__participant.md) | 6 | 4,183 |
| [`scenario.recognition.initiator`](current/recognition__initiator.md) | 2 | 1,352 |
| [`scenario.recognition.participant`](current/recognition__participant.md) | 2 | 1,413 |
| [`scenario.role_handover.initiator`](current/role_handover__initiator.md) | 3 | 4,081 |
| [`scenario.role_handover.participant`](current/role_handover__participant.md) | 3 | 2,274 |
| [`scenario.snapshot.initiator`](current/snapshot__initiator.md) | 1 | 2,206 |
| [`scenario.snapshot.participant`](current/snapshot__participant.md) | 1 | 2,206 |
| [`scenario.team_updates.initiator`](current/team_updates__initiator.md) | 3 | 2,531 |
| [`scenario.team_updates.participant`](current/team_updates__participant.md) | 3 | 2,531 |
| [`scenario.workplan_budget.initiator`](current/workplan_budget__initiator.md) | 1 | 1,058 |
| [`scenario.workplan_budget.participant`](current/workplan_budget__participant.md) | 1 | 1,058 |

**50 packs, 135,501 characters in total.**
