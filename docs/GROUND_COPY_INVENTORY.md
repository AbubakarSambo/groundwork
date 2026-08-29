# 'Ground' inventory - customer-facing language removal

Step 1 of the copy change. No edits made. Comments stripped before matching, so internal
notes do not appear here. Word-boundary matched, so Groundwork/background/playground are excluded.

| # | Class | Surface | File | Line | Exact string |
|---|---|---|---|---|---|
| 1 | CUSTOMER-FACING (app UI) | app | `client/src/App.tsx` | 22 | @/pages/grounds/GroundsListPage |
| 2 | CUSTOMER-FACING (app UI) | app | `client/src/App.tsx` | 23 | @/pages/grounds/CreateGroundPage |
| 3 | CUSTOMER-FACING (app UI) | app | `client/src/App.tsx` | 24 | @/pages/grounds/GroundParticipantPage |
| 4 | CUSTOMER-FACING (app UI) | app | `client/src/App.tsx` | 25 | @/pages/grounds/GroundPage |
| 5 | CUSTOMER-FACING (app UI) | app | `client/src/api/billing.ts` | 72 | Unlimited Grounds |
| 6 | CUSTOMER-FACING (app UI) | app | `client/src/api/billing.ts` | 73 | Unlimited Grounds |
| 7 | CUSTOMER-FACING (app UI) | app | `client/src/api/billing.ts` | 74 | Unlimited Grounds |
| 8 | CUSTOMER-FACING (app UI) | app | `client/src/api/billing.ts` | 75 | Unlimited Grounds |
| 9 | CUSTOMER-FACING (app UI) | app | `client/src/api/billing.ts` | 76 | Unlimited Grounds |
| 10 | CUSTOMER-FACING (app UI) | app | `client/src/api/billing.ts` | 77 | Unlimited Grounds |
| 11 | CUSTOMER-FACING (app UI) | app | `client/src/components/CodeShareCard.tsx` | 34 | Use code ${code} to create a free Ground on Groundwork - valid until ${formattedExpiry} |
| 12 | CUSTOMER-FACING (app UI) | app | `client/src/components/gw/AppShell.tsx` | 11 | @/api/grounds |
| 13 | CUSTOMER-FACING (app UI) | app | `client/src/components/gw/AppShell.tsx` | 463 | New ground |
| 14 | CUSTOMER-FACING (app UI) | app | `client/src/components/gw/AppShell.tsx` | 503 | No grounds yet |
| 15 | CUSTOMER-FACING (app UI) | app | `client/src/components/gw/AppShell.tsx` | 679 | Switch to ${o.name}? You will see ${o.name}'s grounds instead of this organisation's, as a ${asRole}. |
| 16 | CUSTOMER-FACING (app UI) | app | `client/src/components/gw/BaselinePanel.tsx` | 3 | @/api/grounds |
| 17 | CUSTOMER-FACING (app UI) | app | `client/src/components/gw/ContextChat.tsx` | 3 | @/api/grounds |
| 18 | CUSTOMER-FACING (app UI) | app | `client/src/components/gw/GroundChat.tsx` | 4 | @/api/grounds |
| 19 | CUSTOMER-FACING (app UI) | app | `client/src/components/gw/GroundGone.tsx` | 9 | This ground is not open to you |
| 20 | CUSTOMER-FACING (app UI) | app | `client/src/components/gw/GroundGone.tsx` | 14 | Go to my grounds |
| 21 | CUSTOMER-FACING (app UI) | app | `client/src/components/gw/GroundTabRow.tsx` | 2 | @/pages/grounds/ground-tabs |
| 22 | CUSTOMER-FACING (app UI) | app | `client/src/components/gw/HelpModal.tsx` | 35 | Every ground carries an alignment status: Unresolved, Mixed, Emerging, Clear, or Aligned. It is a plain summary of how many areas are settled and how  |
| 23 | CUSTOMER-FACING (app UI) | app | `client/src/components/gw/HelpModal.tsx` | 47 | Open a ground before the situation becomes urgent |
| 24 | CUSTOMER-FACING (app UI) | app | `client/src/components/gw/HelpModal.tsx` | 51 | Set a resolution state before the ground starts |
| 25 | CUSTOMER-FACING (app UI) | app | `client/src/components/gw/HelpModal.tsx` | 92 | Agree on the resolution state before the ground opens |
| 26 | CUSTOMER-FACING (app UI) | app | `client/src/components/gw/HelpModal.tsx` | 119 | The end state everybody agreed to before the ground started. The report closes with the resolution state that was agreed. Whether the ground evidence  |
| 27 | CUSTOMER-FACING (app UI) | app | `client/src/components/gw/LinkProblem.tsx` | 20 | Ask whoever invited you to send a new one - they can do that from the ground. |
| 28 | CUSTOMER-FACING (app UI) | app | `client/src/components/gw/ObjectivePanel.tsx` | 3 | @/api/grounds |
| 29 | CUSTOMER-FACING (app UI) | app | `client/src/components/gw/ResolutionPanel.tsx` | 29 | Everyone chose the same outcome. This ground is closed. |
| 30 | CUSTOMER-FACING (app UI) | app | `client/src/components/gw/ResolutionPanel.tsx` | 30 | Your choice is recorded. The ground closes when everyone picks the same one. |
| 31 | CUSTOMER-FACING (app UI) | app | `client/src/components/gw/ResolutionPanel.tsx` | 54 | How this ground ended |
| 32 | CUSTOMER-FACING (app UI) | app | `client/src/components/gw/ResolutionPanel.tsx` | 54 | Bringing this ground to an end |
| 33 | CUSTOMER-FACING (app UI) | app | `client/src/components/gw/SessionReportCard.tsx` | 136 | What we heard across the ground |
| 34 | CUSTOMER-FACING (app UI) | app | `client/src/components/gw/SessionReportCard.tsx` | 179 | Documents on record from this ground. |
| 35 | CUSTOMER-FACING (app UI) | app | `client/src/components/gw/StartingPointPanel.tsx` | 3 | @/api/grounds |
| 36 | CUSTOMER-FACING (app UI) | app | `client/src/lib/cadence.ts` | 1 | @/api/grounds |
| 37 | CUSTOMER-FACING (app UI) | app | `client/src/lib/contextStrength.ts` | 40 | compare anything, because only one person is in this ground - a single account is a record, not a comparison |
| 38 | CUSTOMER-FACING (app UI) | app | `client/src/lib/contextStrength.ts` | 76 | show anybody against their own objective, because the only goal here belongs to the ground rather than to a person |
| 39 | CUSTOMER-FACING (app UI) | app | `client/src/lib/contextStrength.ts` | 106 | measure anything against a written standard, because no document has been shared with the ground |
| 40 | CUSTOMER-FACING (app UI) | app | `client/src/lib/end-states.ts` | 93 | The accounts show what this actually is, and it deserves its own ground. |
| 41 | CUSTOMER-FACING (app UI) | app | `client/src/lib/end-states.ts` | 121 | Everyone's accounts are on record and the picture of what happened is agreed. Any decision now happens outside this ground, informed by it. |
| 42 | CUSTOMER-FACING (app UI) | app | `client/src/pages/admin/AdminDashboardPage.tsx` | 235 | Total grounds |
| 43 | CUSTOMER-FACING (app UI) | app | `client/src/pages/admin/AdminDashboardPage.tsx` | 332 | First ground (legacy) |
| 44 | CUSTOMER-FACING (app UI) | app | `client/src/pages/admin/AdminPage.tsx` | 171 | That needs to be a whole number of grounds. |
| 45 | CUSTOMER-FACING (app UI) | app | `client/src/pages/admin/AdminPage.tsx` | 187 | Free grounds |
| 46 | CUSTOMER-FACING (app UI) | app | `client/src/pages/admin/AdminPage.tsx` | 196 | Free ground limit |
| 47 | CUSTOMER-FACING (app UI) | app | `client/src/pages/admin/AdminPage.tsx` | 261 | Total grounds |
| 48 | CUSTOMER-FACING (app UI) | app | `client/src/pages/admin/AdminPage.tsx` | 270 | Grounds opened |
| 49 | CUSTOMER-FACING (app UI) | app | `client/src/pages/admin/AdminPage.tsx` | 277 | Ground status |
| 50 | CUSTOMER-FACING (app UI) | app | `client/src/pages/admin/AdminPage.tsx` | 385 | Ground scenarios |
| 51 | CUSTOMER-FACING (app UI) | app | `client/src/pages/admin/AdminPage.tsx` | 399 | Ground status distribution |
| 52 | CUSTOMER-FACING (app UI) | app | `client/src/pages/admin/AdminPage.tsx` | 477 | Grounds created |
| 53 | CUSTOMER-FACING (app UI) | app | `client/src/pages/auth/GoogleCallbackPage.tsx` | 56 | You are signed in, but your ground did not save. Everything you wrote is still here. |
| 54 | CUSTOMER-FACING (app UI) | app | `client/src/pages/auth/MagicVerifyPage.tsx` | 6 | @/api/grounds |
| 55 | CUSTOMER-FACING (app UI) | app | `client/src/pages/auth/MagicVerifyPage.tsx` | 223 | Your ground is set up. |
| 56 | CUSTOMER-FACING (app UI) | app | `client/src/pages/auth/MagicVerifyPage.tsx` | 253 | These addresses were not reached. You can resend from your ground page: |
| 57 | CUSTOMER-FACING (app UI) | app | `client/src/pages/auth/MagicVerifyPage.tsx` | 323 | Your account is active, but the ground wasn't saved. |
| 58 | CUSTOMER-FACING (app UI) | app | `client/src/pages/auth/MagicVerifyPage.tsx` | 324 | Something went wrong saving your session. Your account is ready - go to your grounds page and start again from there. |
| 59 | CUSTOMER-FACING (app UI) | app | `client/src/pages/auth/MagicVerifyPage.tsx` | 355 | Setting up your ground… |
| 60 | CUSTOMER-FACING (app UI) | app | `client/src/pages/billing/BillingPage.tsx` | 5 | @/api/grounds |
| 61 | CUSTOMER-FACING (app UI) | app | `client/src/pages/billing/BillingPage.tsx` | 209 | Paused. Nothing is being charged, and your grounds stay as they are. |
| 62 | CUSTOMER-FACING (app UI) | app | `client/src/pages/billing/BillingPage.tsx` | 282 | Your grounds |
| 63 | CUSTOMER-FACING (app UI) | app | `client/src/pages/billing/BillingPage.tsx` | 286 | No active grounds yet. |
| 64 | CUSTOMER-FACING (app UI) | app | `client/src/pages/billing/BillingPage.tsx` | 300 | Free ground |
| 65 | CUSTOMER-FACING (app UI) | app | `client/src/pages/billing/PaymentPage.tsx` | 5 | @/api/grounds |
| 66 | CUSTOMER-FACING (app UI) | app | `client/src/pages/billing/PaymentPage.tsx` | 56 | This ground |
| 67 | CUSTOMER-FACING (app UI) | app | `client/src/pages/billing/PaymentPage.tsx` | 56 | Add sessions to this ground |
| 68 | CUSTOMER-FACING (app UI) | app | `client/src/pages/billing/PaymentPage.tsx` | 68 | This ground has unlimited free sessions. |
| 69 | CUSTOMER-FACING (app UI) | app | `client/src/pages/billing/PricingPage.tsx` | 11 | For growing teams running multiple Grounds at once. |
| 70 | CUSTOMER-FACING (app UI) | app | `client/src/pages/billing/PricingPage.tsx` | 13 | For larger organizations with multiple teams and Grounds in flight. |
| 71 | CUSTOMER-FACING (app UI) | app | `client/src/pages/billing/PricingPage.tsx` | 146 | ${freeGrounds} Grounds is enough to know whether Groundwork works for your team. No credit card, no trial that expires, no pressure to upgrade before  |
| 72 | CUSTOMER-FACING (app UI) | app | `client/src/pages/billing/PricingPage.tsx` | 147 | Every person with a Groundwork account in your organisation counts toward your plan. Unlimited Grounds, sessions, and reports at every tier. |
| 73 | CUSTOMER-FACING (app UI) | app | `client/src/pages/board/BoardPage.tsx` | 88 | Back to grounds |
| 74 | CUSTOMER-FACING (app UI) | app | `client/src/pages/board/BoardPage.tsx` | 104 | Back to the ground |
| 75 | CUSTOMER-FACING (app UI) | app | `client/src/pages/board/BoardPage.tsx` | 220 | set when the ground was opened, before any check-in |
| 76 | CUSTOMER-FACING (app UI) | app | `client/src/pages/board/BoardPage.tsx` | 445 | someone outside this ground |
| 77 | CUSTOMER-FACING (app UI) | app | `client/src/pages/chat/ChatPage.tsx` | 386 | Ground context missing. Please open this session from your ground page. |
| 78 | CUSTOMER-FACING (app UI) | app | `client/src/pages/chat/ChatPage.tsx` | 437 | When we look at a ground to help with something, we can see whether people checked in and never what they said. That is enforced in the code and teste |
| 79 | CUSTOMER-FACING (app UI) | app | `client/src/pages/chat/ChatPage.tsx` | 442 | Your answers are used to build your ground's record and nothing else. |
| 80 | CUSTOMER-FACING (app UI) | app | `client/src/pages/enter/EntryChatPage.tsx` | 195 | What this ground is for: ${sels.initial} |
| 81 | CUSTOMER-FACING (app UI) | app | `client/src/pages/enter/EntryChatPage.tsx` | 441 | Review the goals I set at the start of this ground and tell me where I stand against each one. |
| 82 | CUSTOMER-FACING (app UI) | app | `client/src/pages/enter/EntryChatPage.tsx` | 459 | Untitled ground |
| 83 | CUSTOMER-FACING (app UI) | app | `client/src/pages/enter/EntryChatPage.tsx` | 709 | What this ground is for: ${onboardingSelections.initial} |
| 84 | CUSTOMER-FACING (app UI) | app | `client/src/pages/enter/EntryChatPage.tsx` | 712 | What they want this ground to get right: ${onboardingSelections.goals.join(', ')} |
| 85 | CUSTOMER-FACING (app UI) | app | `client/src/pages/enter/EntryChatPage.tsx` | 1092 | Could not save this ground. Try again. |
| 86 | CUSTOMER-FACING (app UI) | app | `client/src/pages/enter/EntryChatPage.tsx` | 1361 | Save your ground and invite the people involved. |
| 87 | CUSTOMER-FACING (app UI) | app | `client/src/pages/enter/EntryChatPage.tsx` | 1591 | ll be invited to confirm the ground and give the first account. You |
| 88 | CUSTOMER-FACING (app UI) | app | `client/src/pages/enter/EntryChatPage.tsx` | 1852 | Ground ready to hand off. |
| 89 | CUSTOMER-FACING (app UI) | app | `client/src/pages/enter/EntryChatPage.tsx` | 1923 | New ground · run by your lead |
| 90 | CUSTOMER-FACING (app UI) | app | `client/src/pages/enter/EntryChatPage.tsx` | 1929 | ll see the ground as its coordinator. Once everyone has checked in, a <b style={{ color: |
| 91 | CUSTOMER-FACING (app UI) | app | `client/src/pages/enter/EntryChatPage.tsx` | 1929 | Your lead runs the first check-in; you'll see the ground as its coordinator. Once everyone has checked in, a |
| 92 | CUSTOMER-FACING (app UI) | app | `client/src/pages/enter/EntryChatPage.tsx` | 2246 | Open the confirmation link we email you - that saves your ground and sends your invites. |
| 93 | CUSTOMER-FACING (app UI) | app | `client/src/pages/enter/EntryChatPage.tsx` | 2266 | Save this ground → |
| 94 | CUSTOMER-FACING (app UI) | app | `client/src/pages/enter/EntryChatPage.tsx` | 2357 | Not set yet - this ground will run every 2 weeks unless you pick. |
| 95 | CUSTOMER-FACING (app UI) | app | `client/src/pages/enter/EntryChatPage.tsx` | 2475 | Performance improvement grounds document a process. They do not replace formal HR procedures, employment policy, or legal obligation. Ensure your orga |
| 96 | CUSTOMER-FACING (app UI) | app | `client/src/pages/enter/EntryChatPage.tsx` | 2604 | - opening it saves your ground and sends the ${n} invite${n === 1 ? '' : 's'} |
| 97 | CUSTOMER-FACING (app UI) | app | `client/src/pages/enter/EntryChatPage.tsx` | 2604 | - opening it saves your ground |
| 98 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/CreateGroundPage.tsx` | 4 | @/api/grounds |
| 99 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/CreateGroundPage.tsx` | 395 | Ground opened |
| 100 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/CreateGroundPage.tsx` | 396 | ${failedInvites} invite${failedInvites > 1 ? 's' : ''} could not be sent. You can retry from the ground page. |
| 101 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/CreateGroundPage.tsx` | 399 | Could not open ground. Try again. |
| 102 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/CreateGroundPage.tsx` | 430 | New ground |
| 103 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/CreateGroundPage.tsx` | 452 | Subscribe to open more grounds. |
| 104 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/CreateGroundPage.tsx` | 463 | What is this ground for? |
| 105 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/CreateGroundPage.tsx` | 467 | What is this ground for? |
| 106 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/CreateGroundPage.tsx` | 635 | Subscribe to create more Grounds |
| 107 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/CreateGroundPage.tsx` | 688 | Your access code has been validated and will be used when the Ground is created. |
| 108 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/CreateGroundPage.tsx` | 701 | How long will this ground run? |
| 109 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/CreateGroundPage.tsx` | 737 | Who is in this ground? |
| 110 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/CreateGroundPage.tsx` | 741 | Where do you sit in this ground? |
| 111 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/CreateGroundPage.tsx` | 849 | + Add to this ground |
| 112 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/CreateGroundPage.tsx` | 893 | What is this ground about? |
| 113 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/CreateGroundPage.tsx` | 901 | What is this ground about? What needs to be true at the end? |
| 114 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/CreateGroundPage.tsx` | 914 | Ground name |
| 115 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/CreateGroundPage.tsx` | 948 | Open the ground → |
| 116 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundAdminPage.tsx` | 12 | @/api/grounds |
| 117 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundAdminPage.tsx` | 344 | You are not a party to this ground, so there is nothing here for you. |
| 118 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundAdminPage.tsx` | 350 | Back to grounds |
| 119 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundAdminPage.tsx` | 502 | What this ground was opened for. Not its current state. |
| 120 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundAdminPage.tsx` | 608 | The lead of this ground |
| 121 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundAdminPage.tsx` | 670 | Ground summary |
| 122 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundAdminPage.tsx` | 1088 | open check-ins on this ground |
| 123 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundAdminPage.tsx` | 1183 | means everyone in this ground can read it, which is what the brief and the plan are for. |
| 124 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundAdminPage.tsx` | 1204 | Everyone in this ground can read this. Click to make it yours only. |
| 125 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundAdminPage.tsx` | 1205 | Only you can read this. Click to share it with everyone in this ground. |
| 126 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundAdminPage.tsx` | 1249 | About the whole ground |
| 127 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundAdminPage.tsx` | 1267 | the ground |
| 128 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundAdminPage.tsx` | 1487 | Open a follow-up ground |
| 129 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundAdminPage.tsx` | 1487 | If there is ongoing work to track, open a new ground to keep the record current as things develop. |
| 130 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundAdminPage.tsx` | 1640 | Ground name |
| 131 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundAdminPage.tsx` | 1702 | Show who else is on this ground |
| 132 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundAdminPage.tsx` | 1748 | Close ground |
| 133 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundAdminPage.tsx` | 1751 | You are not the lead of this ground - closing it ends something somebody else is running. |
| 134 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundAdminPage.tsx` | 1755 | mailto:hello@myground.work?subject=Archive ground: ${encodeURIComponent(ground.label)} |
| 135 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundAdminPage.tsx` | 1789 | No share code available for this ground. |
| 136 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundAdminPage.tsx` | 1850 | You lead this ground |
| 137 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundAdminPage.tsx` | 1862 | What is this ground about? |
| 138 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundAdminPage.tsx` | 1907 | What are you responsible for on this ground? |
| 139 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundAdminPage.tsx` | 1927 | You oversee this ground but won't give your own account. You'll still see who has checked in and the shared report once it releases - you're just not  |
| 140 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundPage.tsx` | 3 | @/api/grounds |
| 141 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundParticipantPage.tsx` | 7 | @/api/grounds |
| 142 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundParticipantPage.tsx` | 287 | Your contribution to this ground is yours until the report releases. |
| 143 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundParticipantPage.tsx` | 495 | Shared with all parties on this ground |
| 144 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundParticipantPage.tsx` | 550 | Report pending - ${ground.sessionProgress.completed} of ${ground.sessionProgress.total} checked in |
| 145 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundParticipantPage.tsx` | 689 | Documents the admin has shared appear here. Your uploads are part of your contribution to this ground's record until the report is released. |
| 146 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundParticipantPage.tsx` | 755 | In this ground |
| 147 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundsListPage.tsx` | 5 | @/api/grounds |
| 148 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundsListPage.tsx` | 39 | This ground belongs to ${(g as any).otherOrgName}. You are in it as a participant. |
| 149 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundsListPage.tsx` | 176 | Your grounds |
| 150 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundsListPage.tsx` | 195 | Somebody has set up a ground |
| 151 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundsListPage.tsx` | 195 | ${awaiting.length} grounds have been set up |
| 152 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundsListPage.tsx` | 253 | Active grounds |
| 153 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundsListPage.tsx` | 270 | Open a new ground |
| 154 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundsListPage.tsx` | 342 | Your first ground is one tap away. |
| 155 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundsListPage.tsx` | 343 | Open a ground for a new hire, a cofounder conversation, or a team that needs alignment. |
| 156 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundsListPage.tsx` | 344 | Open your first ground |
| 157 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundsListPage.tsx` | 358 | You will see your grounds and reports here. Open a ground to start contributing. |
| 158 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundsListPage.tsx` | 364 | Your grounds (${grounds.length}) |
| 159 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/GroundsListPage.tsx` | 364 | Your grounds |
| 160 | CUSTOMER-FACING (app UI) | app | `client/src/pages/grounds/ground-tabs.ts` | 33 | Ground settings |
| 161 | CUSTOMER-FACING (app UI) | app | `client/src/pages/home/HomePage.tsx` | 201 | Not sure which fits? Describe it in your own words and we will set up the right ground for you. |
| 162 | CUSTOMER-FACING (app UI) | app | `client/src/pages/home/OnboardingChat.tsx` | 86 | What do you need this ground to produce? |
| 163 | CUSTOMER-FACING (app UI) | app | `client/src/pages/invite/InvitePage.tsx` | 183 | When we look at a ground to help with something, we can see whether people checked in and never what they said. That is enforced in the code and teste |
| 164 | CUSTOMER-FACING (app UI) | app | `client/src/pages/invite/InvitePage.tsx` | 187 | Your answers are used to build your ground's record and nothing else. |
| 165 | CUSTOMER-FACING (app UI) | app | `client/src/pages/notfound/NotFoundPage.tsx` | 36 | Back to your grounds |
| 166 | CUSTOMER-FACING (app UI) | app | `client/src/pages/report/ReportPage.tsx` | 5 | @/api/grounds |
| 167 | CUSTOMER-FACING (app UI) | app | `client/src/pages/report/ReportPage.tsx` | 69 | No resolution state set for this ground yet. |
| 168 | CUSTOMER-FACING (app UI) | app | `client/src/pages/report/ReportPage.tsx` | 822 | Ground report |
| 169 | CUSTOMER-FACING (app UI) | app | `client/src/pages/report/ReportPage.tsx` | 945 | The ground is closing |
| 170 | CUSTOMER-FACING (app UI) | app | `client/src/pages/report/ReportPage.tsx` | 1105 | To correct something you said, reopen a session you have already finished on this ground. |
| 171 | CUSTOMER-FACING (app UI) | app | `client/src/pages/settings/SettingsPage.tsx` | 152 | Ground invites and reminders |
| 172 | CUSTOMER-FACING (email) | api | `api/src/modules/email/email.service.ts` | 133 | , create an account, set up a Ground, and enter this code when prompted. Your check-in stays private until the report is released. |
| 173 | CUSTOMER-FACING (email) | api | `api/src/modules/email/email.service.ts` | 176 | Your ground is approved: ${groundLabel} |
| 174 | CUSTOMER-FACING (email) | api | `api/src/modules/email/email.service.ts` | 180 | Open the ground → |
| 175 | CUSTOMER-FACING (email) | api | `api/src/modules/email/email.service.ts` | 189 | Your ground was not approved: ${groundLabel} |
| 176 | CUSTOMER-FACING (email) | api | `api/src/modules/email/email.service.ts` | 202 | ${adminName} asked you to lead a ground: ${groundLabel} |
| 177 | CUSTOMER-FACING (email) | api | `api/src/modules/email/email.service.ts` | 301 | Open the ground to read and release the report to all parties. |
| 178 | CUSTOMER-FACING (email) | api | `api/src/modules/email/email.service.ts` | 331 | View ground → |
| 179 | CUSTOMER-FACING (email) | api | `api/src/modules/email/email.service.ts` | 342 | The ground |
| 180 | CUSTOMER-FACING (email) | api | `api/src/modules/email/email.service.ts` | 343 | Both records remain intact and accessible. If you want to continue, either party can reopen the conversation from the ground page. |
| 181 | CUSTOMER-FACING (email) | api | `api/src/modules/email/email.service.ts` | 344 | View ground |
| 182 | CUSTOMER-FACING (email) | api | `api/src/modules/email/email.service.ts` | 357 | The ground closes only when all active parties confirm the same outcome. Review the proposal and confirm, or counter-propose a different outcome. |
| 183 | CUSTOMER-FACING (email) | api | `api/src/modules/email/email.service.ts` | 371 | Your record is permanent and both parties retain access to everything that was on the ground. |
| 184 | CUSTOMER-FACING (email) | api | `api/src/modules/email/email.service.ts` | 372 | View the ground |
| 185 | CUSTOMER-FACING (email) | api | `api/src/modules/email/email.service.ts` | 384 | Your answer takes 20 seconds and helps us make every future ground better. |
| 186 | CUSTOMER-FACING (email) | api | `api/src/modules/email/email.service.ts` | 398 | A ground in your workspace ( |
| 187 | CUSTOMER-FACING (email) | api | `api/src/modules/email/email.service.ts` | 399 | Every ground on the free tier runs unlimited sessions and reports. Subscribe to open more than ten grounds - the record you have already built is safe |
| 188 | CUSTOMER-FACING (email) | api | `api/src/modules/email/email.service.ts` | 413 | Go to the ground |
| 189 | CUSTOMER-FACING (email) | api | `api/src/modules/email/email.service.ts` | 465 | plan. Unlimited Grounds and unlimited sessions are active for your team. |
| 190 | CUSTOMER-FACING (email) | api | `api/src/modules/email/email.service.ts` | 481 | Your team keeps ten free grounds, each with unlimited sessions and reports. Every record and report you already have stays accessible. |
| 191 | CUSTOMER-FACING (email) | api | `api/src/modules/email/email.service.ts` | 528 | Grounds on the free tier run unlimited sessions. Subscribe when your team needs more than ten grounds. |
| 192 | CUSTOMER-FACING (email) | api | `api/src/modules/email/email.service.ts` | 529 | Go to your ground |
| 193 | CUSTOMER-FACING (email) | api | `api/src/modules/email/email.service.ts` | 540 | Your ground |
| 194 | CUSTOMER-FACING (email) | api | `api/src/modules/email/email.service.ts` | 541 | Subscribe before your team's next check-in to keep this ground running. |
| 195 | CUSTOMER-FACING (email) | api | `api/src/modules/email/email.service.ts` | 542 | Go to your ground |
| 196 | CUSTOMER-FACING (email) | api | `api/src/modules/email/email.service.ts` | 574 | Your record is incomplete. The shared picture for this ground cannot reflect your side until you check in. Everything you write is private until both  |
| 197 | CUSTOMER-FACING (email) | api | `api/src/modules/email/email.service.ts` | 575 | Sign in to Groundwork to add your version before the ground moves on without it. |
| 198 | CUSTOMER-FACING (email) | api | `api/src/modules/email/email.service.ts` | 622 | Your access code expires in ${daysRemaining} days - create another ground |
| 199 | CUSTOMER-FACING (email) | api | `api/src/modules/email/email.service.ts` | 633 | ) to create one ground so far. You still have time to create another ground with it before it expires. |
| 200 | CUSTOMER-FACING (email) | api | `api/src/modules/email/email.service.ts` | 634 | Every ground you create is a record that belongs to the people involved - start another before the code runs out. |
| 201 | CUSTOMER-FACING (email) | api | `api/src/modules/email/email.service.ts` | 635 | Create another ground |
| 202 | CUSTOMER-FACING (email) | api | `api/src/modules/email/email.service.ts` | 639 | Once it expires, the code can no longer be redeemed. Any grounds already created with it are unaffected - their records remain intact. |
| 203 | CUSTOMER-FACING (email) | api | `api/src/modules/email/email.service.ts` | 653 | Ten grounds are free, each with unlimited sessions and reports. Your subscription lifts that cap - nobody is ever charged per session, and participant |
| 204 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/components/Nav.astro` | 44 | Go to your grounds |
| 205 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/how-it-works.astro` | 30 | Every Ground follows the same simple path, from a clear beginning to a clear end. |
| 206 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/how-it-works.astro` | 78 | Close the Ground |
| 207 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/how-it-works.astro` | 104 | Start your first Ground |
| 208 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/index.astro` | 595 | Start your first Ground |
| 209 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/index.astro` | 598 | Go to your grounds |
| 210 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/index.astro` | 606 | Create a Ground by setting the context (a new hire starting, a new project, someone's work off track), objectives and expectations. |
| 211 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/index.astro` | 820 | Everyone in the Ground gets one of these each time a report lands, drawn only from their own record. Nobody reads anybody else's, and neither does the |
| 212 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/index.astro` | 834 | Yusuf's own note, in his own copy of the report. The other seven do not see it. Neither does the person running the ground. |
| 213 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/index.astro` | 934 | Everyone in the Ground gets one of these each time a report lands, drawn only from their own record. Nobody reads anybody else's, and neither does the |
| 214 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/index.astro` | 1024 | Everyone in the Ground gets one of these each time a report lands, drawn only from their own record. Nobody reads anybody else's, and neither does the |
| 215 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/index.astro` | 1120 | Half the remit has been tested and half has not been reachable. That is a gap in what he has been given, not a read on what he can do - and until it i |
| 216 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/index.astro` | 1159 | Everyone in the Ground gets one of these each time a report lands, drawn only from their own record. Nobody reads anybody else's, and neither does the |
| 217 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/index.astro` | 1306 | Your first 10 Grounds are free. A check-in takes about ten minutes. |
| 218 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/index.astro` | 1307 | Start your first Ground |
| 219 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/index.astro` | 1308 | First 10 Grounds free. No card required. |
| 220 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/index.astro` | 1354 | Cofounder ground · technical record building |
| 221 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/index.astro` | 1355 | Ground confidence 3/5 to 4/5 |
| 222 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/index.astro` | 1356 | new ground |
| 223 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/index.astro` | 1356 | Tarini opened a new ground |
| 224 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/index.astro` | 1360 | Ground closed |
| 225 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/index.astro` | 1361 | new ground |
| 226 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/index.astro` | 1361 | New ground opened |
| 227 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/index.astro` | 1364 | Ground confidence: 5/5 |
| 228 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/index.astro` | 1365 | Cofounder ground · both accounts independent |
| 229 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/index.astro` | 1404 | Better decisions start with better ground. |
| 230 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/pricing.astro` | 6 | Start free with 10 Grounds, no card required. Subscribe as your team grows. Unlimited Grounds, sessions, and reports on every plan. |
| 231 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/pricing.astro` | 40 | Start free with 10 Grounds, no card required. Subscribe as your team grows. Unlimited Grounds, sessions, and reports on every plan. |
| 232 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/pricing.astro` | 49 | Create up to 10 Grounds for free. No card required. Unlimited sessions and reports on every Ground. |
| 233 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/pricing.astro` | 80 | For growing teams running multiple Grounds at once. |
| 234 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/pricing.astro` | 94 | For larger organizations with multiple teams and Grounds in flight. |
| 235 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/pricing.astro` | 122 | 10 Grounds is enough to know whether Groundwork works for your team. No credit card, no trial that expires, no pressure to upgrade before you have see |
| 236 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/pricing.astro` | 126 | Every person with a Groundwork account in your organization counts toward your plan. Unlimited Grounds, sessions, and reports at every tier. No counti |
| 237 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/pricing.astro` | 145 | Every person with a Groundwork account in your organization counts, whether they create Grounds or just participate in them. Guests with no account do |
| 238 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/pricing.astro` | 149 | No. Your first 10 Grounds are free and require no payment details. You add a card only when you want to create more than 10. |
| 239 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/pricing.astro` | 153 | One session is one full round of check-ins across all participants on a Ground. Whether you have two people or twenty, it is one session. Sessions are |
| 240 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/pricing.astro` | 160 | What happens to my Grounds and reports if I cancel? |
| 241 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/pricing.astro` | 161 | Nothing is deleted. Your reports and history stay on your account. You can read everything that happened. You can still run Grounds on the free plan ( |
| 242 | CUSTOMER-FACING (marketing) | marketing | `marketing/src/pages/pricing.astro` | 175 | Start your first Ground free |
| 243 | INTERNAL (api) | api | `api/src/main.ts` | 64 | Contribution intelligence - alignment grounds, conversation engine, reports |
| 244 | INTERNAL (api) | api | `api/src/main.ts` | 69 | Alignment ground lifecycle |
| 245 | INTERNAL (api) | api | `api/src/modules/admin/admin.controller.ts` | 83 | How many grounds an organisation gets before it needs a subscription |
| 246 | INTERNAL (api) | api | `api/src/modules/admin/admin.controller.ts` | 89 | Change the free ground limit |
| 247 | INTERNAL (api) | api | `api/src/modules/admin/admin.controller.ts` | 135 | Platform-wide stats: orgs, grounds, codes, redemptions, freeReason breakdown |
| 248 | INTERNAL (api) | api | `api/src/modules/admin/admin.controller.ts` | 153 | All OutcomeFeedback records with ground/org context |
| 249 | INTERNAL (api) | api | `api/src/modules/admin/admin.service.ts` | 227 | Ground not found |
| 250 | INTERNAL (api) | api | `api/src/modules/billing/billing.controller.ts` | 29 | Billing status: active grounds with session balances and saved card |
| 251 | INTERNAL (api) | api | `api/src/modules/billing/billing.controller.ts` | 121 | Check if the org can create a new ground (free first ground or valid access code) |
| 252 | INTERNAL (api) | api | `api/src/modules/billing/billing.controller.ts` | 132 | Generate a contributor code that grants sessions to a ground |
| 253 | INTERNAL (api) | api | `api/src/modules/billing/billing.controller.ts` | 169 | Redeem a contributor code to add sessions to a ground |
| 254 | INTERNAL (api) | api | `api/src/modules/billing/billing.service.ts` | 141 | Ground not found |
| 255 | INTERNAL (api) | api | `api/src/modules/billing/billing.service.ts` | 143 | This ground has unlimited free sessions - nothing to purchase. |
| 256 | INTERNAL (api) | api | `api/src/modules/billing/billing.service.ts` | 271 | Free extension claimed for org ${organizationId} on ground ${groundId} |
| 257 | INTERNAL (api) | api | `api/src/modules/billing/billing.service.ts` | 282 | ${this.config.get<string>('resend.frontendUrl') ?? ''}/grounds/${groundId} |
| 258 | INTERNAL (api) | api | `api/src/modules/billing/billing.service.ts` | 284 | your ground |
| 259 | INTERNAL (api) | api | `api/src/modules/billing/billing.service.ts` | 501 | Ground not found or does not belong to your organization. |
| 260 | INTERNAL (api) | api | `api/src/modules/billing/billing.service.ts` | 547 | Contributor code ${code} redeemed for ground ${groundId}: +${sessionsToAdd} session(s) |
| 261 | INTERNAL (api) | api | `api/src/modules/billing/billing.service.ts` | 705 | Session fee paid: ${qty} session(s) added to ground ${groundId} (org ${organizationId}) |
| 262 | INTERNAL (api) | api | `api/src/modules/billing/code-expiry.scheduler.ts` | 87 | Failed to send "create another ground" reminder for code ${code.code}: ${err.message} |
| 263 | INTERNAL (api) | api | `api/src/modules/billing/pricing.service.ts` | 88 | Could not read the free ground limit, using the default: ${(err as Error)?.message} |
| 264 | INTERNAL (api) | api | `api/src/modules/billing/pricing.service.ts` | 95 | The free ground limit must be a whole number between 0 and ${MAX_FREE_GROUND_LIMIT}. |
| 265 | INTERNAL (api) | api | `api/src/modules/billing/pricing.service.ts` | 102 | Free ground limit set to ${limit} by ${adminUserId} |
| 266 | INTERNAL (api) | api | `api/src/modules/board/board.controller.ts` | 36 | The delivery board for a shared-mode ground. Returns renders:false with a reason for private-mode or sensing-family grounds, which have no board by de |
| 267 | INTERNAL (api) | api | `api/src/modules/board/board.service.ts` | 55 | Ground not found |
| 268 | INTERNAL (api) | api | `api/src/modules/board/board.service.ts` | 68 | This kind of ground does not use a shared board. Laying these accounts out for everyone to read would undo the candour that makes them worth having. R |
| 269 | INTERNAL (api) | api | `api/src/modules/board/board.service.ts` | 77 | You are not a party to this ground |
| 270 | INTERNAL (api) | api | `api/src/modules/board/board.service.ts` | 332 | No targets set yet, so there is nothing for this board to measure progress against. Add two or three things this ground is aiming for. |
| 271 | INTERNAL (api) | api | `api/src/modules/board/board.service.ts` | 588 | Ground not found |
| 272 | INTERNAL (api) | api | `api/src/modules/board/board.service.ts` | 590 | This ground does not have a board |
| 273 | INTERNAL (api) | api | `api/src/modules/board/board.service.ts` | 593 | Only the person who set this ground up can change what it is aiming for |
| 274 | INTERNAL (api) | api | `api/src/modules/board/board.service.ts` | 688 | Ground not found |
| 275 | INTERNAL (api) | api | `api/src/modules/board/board.service.ts` | 690 | This ground does not have a board |
| 276 | INTERNAL (api) | api | `api/src/modules/board/board.service.ts` | 693 | You are not a party to this ground |
| 277 | INTERNAL (api) | api | `api/src/modules/board/reads.ts` | 387 | Nobody else on this ground sees this person\ |
| 278 | INTERNAL (api) | api | `api/src/modules/conversation/conversation.service.ts` | 167 | ${this.config?.get<string>('resend.frontendUrl') ?? ''}/grounds/${groundId} |
| 279 | INTERNAL (api) | api | `api/src/modules/conversation/conversation.service.ts` | 169 | your ground |
| 280 | INTERNAL (api) | api | `api/src/modules/conversation/conversation.service.ts` | 297 | This ground is no longer accepting check-ins |
| 281 | INTERNAL (api) | api | `api/src/modules/conversation/conversation.service.ts` | 358 | ${this.config.get<string>('resend.frontendUrl') ?? ''}/grounds/${g.id} |
| 282 | INTERNAL (api) | api | `api/src/modules/conversation/conversation.service.ts` | 444 | This ground is on hold. Nothing can be added to it until it is resumed. |
| 283 | INTERNAL (api) | api | `api/src/modules/conversation/conversation.service.ts` | 446 | This ground is closed. Nothing further can be added to it. |
| 284 | INTERNAL (api) | api | `api/src/modules/conversation/conversation.service.ts` | 629 | Ground not found |
| 285 | INTERNAL (api) | api | `api/src/modules/conversation/conversation.service.ts` | 1631 | If this holds for a whole ground, either the work is not covered by the nine role maps or nobody described the role at setup. |
| 286 | INTERNAL (api) | api | `api/src/modules/conversation/conversation.service.ts` | 1812 | No private record summary for participant ${participantId} on ground ${groundId}: the model returned nothing twice. |
| 287 | INTERNAL (api) | api | `api/src/modules/conversation/conversation.service.ts` | 1900 | Report not found for this ground |
| 288 | INTERNAL (api) | api | `api/src/modules/conversation/conversation.service.ts` | 1908 | You are not a participant on this ground |
| 289 | INTERNAL (api) | api | `api/src/modules/conversation/conversation.service.ts` | 1936 | You are not a participant on this ground |
| 290 | INTERNAL (api) | api | `api/src/modules/conversation/conversation.service.ts` | 1942 | That session is not a completed check-in on this ground |
| 291 | INTERNAL (api) | api | `api/src/modules/conversation/conversation.service.ts` | 1994 | You are not a party to this ground |
| 292 | INTERNAL (api) | api | `api/src/modules/conversation/person-style.ts` | 70 | this ground |
| 293 | INTERNAL (api) | api | `api/src/modules/conversation/remind.service.ts` | 31 | Ground not found |
| 294 | INTERNAL (api) | api | `api/src/modules/conversation/remind.service.ts` | 37 | You are not a party to this ground |
| 295 | INTERNAL (api) | api | `api/src/modules/documents/documents.controller.ts` | 39 | Upload a document (PDF or TXT) for this ground |
| 296 | INTERNAL (api) | api | `api/src/modules/documents/documents.service.ts` | 356 | Document ${docId} on ground ${groundId} moved to ${visibility} by its uploader. |
| 297 | INTERNAL (api) | api | `api/src/modules/documents/documents.service.ts` | 373 | Ground not found |
| 298 | INTERNAL (api) | api | `api/src/modules/documents/documents.service.ts` | 375 | You are not a party to this ground |
| 299 | INTERNAL (api) | api | `api/src/modules/documents/what-setup-never-asked-for.ts` | 44 | What has to be true for this to work that is nobody in this ground\ |
| 300 | INTERNAL (api) | api | `api/src/modules/documents/what-setup-never-asked-for.ts` | 88 | what the lead expects this ground to show, which is the conclusion in advance |
| 301 | INTERNAL (api) | api | `api/src/modules/documents/what-setup-never-asked-for.ts` | 96 | what has changed about what matters since the ground opened |
| 302 | INTERNAL (api) | api | `api/src/modules/documents/what-this-ground-can-tell-you.ts` | 39 | compare anything, because only one person is in this ground - a single account is a record, not a comparison |
| 303 | INTERNAL (api) | api | `api/src/modules/entry/entry.service.ts` | 239 | One sentence on why their account matters for this ground. |
| 304 | INTERNAL (api) | api | `api/src/modules/entry/entry.service.ts` | 527 | Ground context from the organiser:\n${ground.brief}\n\n |
| 305 | INTERNAL (api) | api | `api/src/modules/entry/entry.service.ts` | 535 | What is this ground about for you? |
| 306 | INTERNAL (api) | api | `api/src/modules/entry/entry.service.ts` | 740 | Contributor count exceeds the limit of 20 per ground. Split into multiple grounds if needed. |
| 307 | INTERNAL (api) | api | `api/src/modules/entry/entry.service.ts` | 823 | Participant not found after ground creation |
| 308 | INTERNAL (api) | api | `api/src/modules/entry/entry.service.ts` | 866 | entry commit: could not schedule session 2 for ground ${ground.id}: ${e?.message ?? e} |
| 309 | INTERNAL (api) | api | `api/src/modules/entry/entry.service.ts` | 1015 | join-commit: ${email} already joined ground ${ground.id} - signing back in, no duplicate created |
| 310 | INTERNAL (api) | api | `api/src/modules/entry/entry.service.ts` | 1043 | entry commit: could not schedule session 2 for ground ${ground.id}: ${e?.message ?? e} |
| 311 | INTERNAL (api) | api | `api/src/modules/entry/entry.service.ts` | 1087 | join-commit: ${email} checked in on ground ${ground.id} (new user: ${isNew}) |
| 312 | INTERNAL (api) | api | `api/src/modules/entry/entry.service.ts` | 1157 | join-accept: ${email} joined ground ${ground.id} -> real engine check-in ${checkIn.id} (new user: ${!existingAccount}) |
| 313 | INTERNAL (api) | api | `api/src/modules/grounds/dto/create-ground.dto.ts` | 79 | Initiator's opening brief written at ground creation |
| 314 | INTERNAL (api) | api | `api/src/modules/grounds/dto/create-ground.dto.ts` | 85 | Max participants via join link. Defaults to 4 for invite-only grounds, 100 for broadcast grounds. |
| 315 | INTERNAL (api) | api | `api/src/modules/grounds/dto/create-ground.dto.ts` | 99 | Contributor access code granting a free ground creation |
| 316 | INTERNAL (api) | api | `api/src/modules/grounds/dto/create-ground.dto.ts` | 106 | The creator administers this ground and gives no account of their own. |
| 317 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.controller.ts` | 36 | Rename the ground |
| 318 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.controller.ts` | 51 | Append a context note to this ground |
| 319 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.controller.ts` | 57 | The participant this context is about; omit for context about the whole ground |
| 320 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.controller.ts` | 109 | List grounds in the organization, including grounds as a participant |
| 321 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.controller.ts` | 116 | Org-wide list of every ground (team): lead, members, roles, and alignment status - for HR/admin/founder oversight |
| 322 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.controller.ts` | 124 | Grounds a member has set up that are waiting for an admin to accept them |
| 323 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.controller.ts` | 136 | Open a new alignment ground |
| 324 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.controller.ts` | 144 | Admin creates a ground and names someone else to lead it (e.g. HR onboarding a team, assigning the engineering lead to run it) |
| 325 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.controller.ts` | 205 | Get a structural brief for use with a facilitator (initiator or a party on this ground - no separate org-admin access exists) |
| 326 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.controller.ts` | 211 | Return the requesting user's own specificity history for this ground (private, owner only) |
| 327 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.controller.ts` | 230 | Accept a ground so its people can be invited |
| 328 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.controller.ts` | 237 | Decline a ground. It closes, and nobody is ever invited to it. |
| 329 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.controller.ts` | 271 | Every version of this ground\ |
| 330 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.controller.ts` | 320 | The requesting user's own between-session notes on this ground (private, owner only) |
| 331 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.controller.ts` | 338 | Every turn the requesting user has said in this ground, sessions in order (owner only) |
| 332 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.controller.ts` | 374 | Whether parties can see who else is on this ground and how each is doing |
| 333 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.controller.ts` | 384 | Whether the parties on this ground see each other's work - decides whether fairness reads have anything to stand on |
| 334 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.cron.ts` | 57 | Stalled ${staleIds.length} overdue ground(s): ${staleIds.join(', ')} |
| 335 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.cron.ts` | 68 | Stalled notification failed for ground ${g.id}: ${err.message} |
| 336 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.cron.ts` | 84 | Weekly period boundary: processing ${activeGrounds.length} active ground(s). |
| 337 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.cron.ts` | 96 | analyzeGroundForCollusion failed for ground ${g.id}: ${cerr.message} |
| 338 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.cron.ts` | 100 | startNewPeriod failed for ground ${g.id}: ${err.message} |
| 339 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.cron.ts` | 103 | Weekly period boundary complete: ${processed}/${activeGrounds.length} ground(s) processed. |
| 340 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.cron.ts` | 375 | Activation reminder failed for ground ${g.id}: ${err.message} |
| 341 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.cron.ts` | 467 | Synthesis backstop: re-triggered synthesis for ${triggered} stuck ground(s) |
| 342 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 109 | Ground creation not allowed |
| 343 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 226 | Ground creation not allowed |
| 344 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 314 | Participant invite email failed for ${invite.email} on ground ${ground.id}: ${err.message} |
| 345 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 320 | ${this.config.get<string>('resend.frontendUrl') ?? ''}/grounds/${ground.id} |
| 346 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 324 | Lead invite email failed for ground ${ground.id}: ${err.message} |
| 347 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 336 | Ground not found |
| 348 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 337 | Only the named lead can confirm this ground |
| 349 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 338 | This ground has already been confirmed |
| 350 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 664 | Ground not found |
| 351 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 895 | Ground not found |
| 352 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 897 | Setting this ground up is the lead\ |
| 353 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 980 | Ground not found |
| 354 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 982 | Setting this ground up is the lead\ |
| 355 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1028 | Ground not found |
| 356 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1030 | Only the initiator can add context notes to this ground |
| 357 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1036 | That participant is not on this ground |
| 358 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1047 | Ground not found |
| 359 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1064 | Ground not found |
| 360 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1073 | Only the person leading this ground, or an admin in this organisation, can change this. |
| 361 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1090 | Ground not found |
| 362 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1099 | Only the person leading this ground, or an admin in this organisation, can change this. |
| 363 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1124 | Ground not found |
| 364 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1130 | Only the lead or the admin who set this ground up can add a participant |
| 365 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1147 | This email is already a participant on this ground |
| 366 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1177 | This ground is on the free tier and is limited to ${ground.freeParticipantCap} participants. Upgrade to add more. |
| 367 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1259 | Ground not found |
| 368 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1300 | Not the initiator of this ground |
| 369 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1320 | Ground not found |
| 370 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1323 | This ground has already ended |
| 371 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1350 | Ground not found |
| 372 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1368 | Ground not found |
| 373 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1375 | Only the initiator or a party to this ground may request a mediator brief |
| 374 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1400 | Ground not found |
| 375 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1405 | You are not a party to this ground |
| 376 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1416 | Only the person leading this ground can change how long it runs or how often people check in. Ask them if it needs to change. |
| 377 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1495 | Ground not found |
| 378 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1511 | ${this.config.get<string>('resend.frontendUrl') ?? ''}/grounds/${ground.id} |
| 379 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1515 | Approval email failed for ground ${ground.id}: ${err.message} |
| 380 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1526 | Ground not found |
| 381 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1548 | Decline email failed for ground ${ground.id}: ${err.message} |
| 382 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1581 | You are not a party to this ground |
| 383 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1595 | You are not a party to this ground |
| 384 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1609 | You are not a party to this ground |
| 385 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1626 | Ground not found |
| 386 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1633 | Proposing what somebody is working towards belongs to whoever runs this ground. |
| 387 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1639 | That person is not on this ground |
| 388 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1656 | You are not a party to this ground |
| 389 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1673 | You are not a party to this ground |
| 390 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1691 | Ground not found |
| 391 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1698 | Recording where this stood at the start belongs to whoever runs this ground. |
| 392 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1733 | Ground not found |
| 393 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1740 | Recording where this stood at the start belongs to whoever runs this ground. |
| 394 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1768 | Ground not found |
| 395 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1775 | You are not a party to this ground |
| 396 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1809 | Ground not found |
| 397 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1817 | Stating what doing well looks like belongs to whoever runs this ground. |
| 398 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1856 | Ground not found |
| 399 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1863 | You are not a party to this ground |
| 400 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1887 | You are not a party to this ground |
| 401 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1933 | You are not a party to this ground |
| 402 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1990 | Ground not found |
| 403 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 1999 | Ground in status "${ground.status}" cannot be paused |
| 404 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 2005 | Only an org member may pause a ground |
| 405 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 2012 | Ground ${groundId} paused by user ${adminUserId}. Reason: ${reason} |
| 406 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 2133 | You are not a party to this ground |
| 407 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 2183 | You are not a party to this ground |
| 408 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 2195 | You are not a party to this ground |
| 409 | INTERNAL (api) | api | `api/src/modules/grounds/grounds.service.ts` | 2209 | You are not a party to this ground |
| 410 | INTERNAL (api) | api | `api/src/modules/grounds/participant-requests.controller.ts` | 31 | Ground not found |
| 411 | INTERNAL (api) | api | `api/src/modules/grounds/participant-requests.controller.ts` | 33 | You are not a party to this ground |
| 412 | INTERNAL (api) | api | `api/src/modules/grounds/participant-requests.controller.ts` | 40 | Ground not found |
| 413 | INTERNAL (api) | api | `api/src/modules/grounds/participant-requests.controller.ts` | 85 | Participant request not found on this ground |
| 414 | INTERNAL (api) | api | `api/src/modules/grounds/the-context-chat.ts` | 92 | A ground collects each person\ |
| 415 | INTERNAL (api) | api | `api/src/modules/grounds/what-has-to-be-true.ts` | 78 | ${missing} of the people this depends on ${missing === 1 ? 'is' : 'are'} not in this ground${unnamed ? |
| 416 | INTERNAL (api) | api | `api/src/modules/grounds/what-the-context-chat-heard.ts` | 45 | ${whole} days is outside what a ground can run for, so nothing was changed. Anything from a week to about two years works. |
| 417 | INTERNAL (api) | api | `api/src/modules/intelligence/intelligence.controller.ts` | 49 | Get the requesting party's outcome feedback for a ground |
| 418 | INTERNAL (api) | api | `api/src/modules/intelligence/intelligence.controller.ts` | 72 | Admin dashboard - ground activity + outcome rates per prompt version |
| 419 | INTERNAL (api) | api | `api/src/modules/intelligence/intelligence.service.ts` | 20 | Ground not found |
| 420 | INTERNAL (api) | api | `api/src/modules/intelligence/intelligence.service.ts` | 34 | Ground not found |
| 421 | INTERNAL (api) | api | `api/src/modules/intelligence/intelligence.service.ts` | 36 | You are not a party to this ground |
| 422 | INTERNAL (api) | api | `api/src/modules/intelligence/intelligence.service.ts` | 52 | Ground not found |
| 423 | INTERNAL (api) | api | `api/src/modules/intelligence/intelligence.service.ts` | 55 | You are not a party to this ground |
| 424 | INTERNAL (api) | api | `api/src/modules/intelligence/intelligence.service.ts` | 60 | You have already submitted feedback for this ground |
| 425 | INTERNAL (api) | api | `api/src/modules/participants/participants.service.ts` | 26 | Ground not found |
| 426 | INTERNAL (api) | api | `api/src/modules/participants/participants.service.ts` | 42 | Ground not found |
| 427 | INTERNAL (api) | api | `api/src/modules/participants/participants.service.ts` | 163 | accept: participant ${participant.id} had no session-1 check-in on ground ${ground.id}; creating one |
| 428 | INTERNAL (api) | api | `api/src/modules/patterns/patterns.service.ts` | 286 | startNewPeriod: ground ${groundId}, period boundary at session ${currentPeriod} |
| 429 | INTERNAL (api) | api | `api/src/modules/patterns/patterns.service.ts` | 319 | A single participant (user ${userId}) is an active party in ${entries.length} simultaneous grounds |
| 430 | INTERNAL (api) | api | `api/src/modules/patterns/patterns.service.ts` | 320 | within this organisation. Concentration in multiple active grounds at once may indicate over-extension |
| 431 | INTERNAL (api) | api | `api/src/modules/patterns/patterns.service.ts` | 339 | Concentration risk detected: user ${userId} active in ${entries.length} grounds (org ${orgId}) |
| 432 | INTERNAL (api) | api | `api/src/modules/patterns/patterns.service.ts` | 460 | COLLUSION_RISK candidate flagged for review on ground ${groundId} (pair ${anchorId} & ${partnerId}) |
| 433 | INTERNAL (api) | api | `api/src/modules/reports/harder-to-fool.ts` | 36 | Nothing else in this ground touches any part of this account. That does not make it wrong, it makes it unchecked: it rests entirely on one person havi |
| 434 | INTERNAL (api) | api | `api/src/modules/reports/party-labels.ts` | 59 | Party label collision on this ground: "${label}" resolves to both ${prior} and ${id}. |
| 435 | INTERNAL (api) | api | `api/src/modules/reports/reports.listener.ts` | 28 | Admin check-in notification failed for ground ${event.groundId}: ${err.message} |
| 436 | INTERNAL (api) | api | `api/src/modules/reports/reports.listener.ts` | 34 | Late-correction notification failed for ground ${event.groundId}: ${err.message} |
| 437 | INTERNAL (api) | api | `api/src/modules/reports/reports.listener.ts` | 50 | All parties through session ${sessionNumber}. Releasing report and activating ground ${event.groundId}. |
| 438 | INTERNAL (api) | api | `api/src/modules/reports/reports.listener.ts` | 57 | Report handling on checkin.completed failed for ground ${event.groundId}: ${err.message} |
| 439 | INTERNAL (api) | api | `api/src/modules/reports/reports.listener.ts` | 64 | Ground ${event.groundId} activated - synthesizing (if needed) and releasing report |
| 440 | INTERNAL (api) | api | `api/src/modules/reports/reports.listener.ts` | 74 | Report release on ground.activated failed for ground ${event.groundId}: ${err.message} |
| 441 | INTERNAL (api) | api | `api/src/modules/reports/reports.listener.ts` | 96 | Participant activation notification failed for ground ${event.groundId}: ${err.message} |
| 442 | INTERNAL (api) | api | `api/src/modules/reports/reports.service.ts` | 90 | These are all wrong, and all were produced on a ground whose entire finding was that people disagreed about what success meant: |
| 443 | INTERNAL (api) | api | `api/src/modules/reports/reports.service.ts` | 151 | Where each person stands on this topic. Two on a two-person ground; more on a project or team ground. |
| 444 | INTERNAL (api) | api | `api/src/modules/reports/reports.service.ts` | 164 | 1-2 short supporting references for this gap, taken from what people actually said (brief paraphrase or short quote). Grounds the gap in what was actu |
| 445 | INTERNAL (api) | api | `api/src/modules/reports/reports.service.ts` | 215 | People whose input, work, or decisions come up in someone's check-in but who are not in this ground themselves - i.e. someone contributing behind the  |
| 446 | INTERNAL (api) | api | `api/src/modules/reports/reports.service.ts` | 289 | everyone in this ground |
| 447 | INTERNAL (api) | api | `api/src/modules/reports/reports.service.ts` | 507 | Ground not found |
| 448 | INTERNAL (api) | api | `api/src/modules/reports/reports.service.ts` | 515 | PRE-AGREED RESOLUTION STATE: ${(ground as any).resolutionState} |
| 449 | INTERNAL (api) | api | `api/src/modules/reports/reports.service.ts` | 518 | INITIATOR'S OPENING BRIEF: ${(ground as any).brief} |
| 450 | INTERNAL (api) | api | `api/src/modules/reports/reports.service.ts` | 522 | LEAD PROFILE (from past grounds - use to add alignment recommendations at the end of the report):\n${leadSignals.map(s => |
| 451 | INTERNAL (api) | api | `api/src/modules/reports/reports.service.ts` | 643 | [leads this ground and the other parties on it] |
| 452 | INTERNAL (api) | api | `api/src/modules/reports/reports.service.ts` | 647 | PARTY ROSTER (exhaustive - there are exactly ${parties.length} parties on this ground, no others exist):\n${rosterLines.join('\n')}\n\n |
| 453 | INTERNAL (api) | api | `api/src/modules/reports/reports.service.ts` | 788 | the ground |
| 454 | INTERNAL (api) | api | `api/src/modules/reports/reports.service.ts` | 1277 | Ground not found |
| 455 | INTERNAL (api) | api | `api/src/modules/reports/reports.service.ts` | 1293 | Ground not found |
| 456 | INTERNAL (api) | api | `api/src/modules/reports/reports.service.ts` | 1308 | Report release email failed for ground ${groundId}: ${(r as PromiseRejectedResult).reason} |
| 457 | INTERNAL (api) | api | `api/src/modules/reports/reports.service.ts` | 1319 | Post-report guide generation failed for ground ${groundId}: ${err.message} |
| 458 | INTERNAL (api) | api | `api/src/modules/reports/reports.service.ts` | 1401 | You are not a party to this ground |
| 459 | INTERNAL (api) | api | `api/src/modules/reports/reports.service.ts` | 1529 | You are not a participant on this ground |
| 460 | INTERNAL (api) | api | `api/src/modules/reports/reports.service.ts` | 1554 | Ground not found |
| 461 | INTERNAL (api) | api | `api/src/modules/reports/reports.service.ts` | 1607 | Post-report guide generation skipped for ground ${report.groundId} (POST_REPORT_GUIDE_ENABLED off) |
| 462 | INTERNAL (api) | api | `api/src/modules/reports/reports.service.ts` | 1783 | Ground ${g.id} finished its closing round and has no closing synthesis. Synthesising again - the first attempt failed and nothing retried it. |
| 463 | INTERNAL (api) | api | `api/src/modules/reports/reports.service.ts` | 1832 | Version ${v.promptVersionId}: ${v.resolvedCount} grounds, ${v.resolutionRate}% resolution rate, avg ${v.avgSessionCount} sessions, avg fairness ${v.av |
| 464 | INTERNAL (api) | api | `api/src/modules/reports/what-a-leader-can-weigh.ts` | 76 | What this ground was measured against |
| 465 | INTERNAL (api) | api | `api/src/modules/resolution/end-states.ts` | 80 | The accounts show what this actually is, and it deserves its own ground. |
| 466 | INTERNAL (api) | api | `api/src/modules/resolution/resolution.service.ts` | 33 | This ground is already resolved |
| 467 | INTERNAL (api) | api | `api/src/modules/resolution/resolution.service.ts` | 118 | This ground is already resolved |
| 468 | INTERNAL (api) | api | `api/src/modules/resolution/resolution.service.ts` | 173 | recordOutcome failed for ground ${groundId}: ${err.message} |
| 469 | INTERNAL (api) | api | `api/src/modules/resolution/resolution.service.ts` | 178 | recordOutcomeLearning failed for ground ${groundId}: ${err.message} |
| 470 | INTERNAL (api) | api | `api/src/modules/resolution/resolution.service.ts` | 192 | Close email failed for ground ${groundId}: ${err.message} |
| 471 | INTERNAL (api) | api | `api/src/modules/resolution/resolution.service.ts` | 197 | Ground ${groundId} closed with end state ${endState}. Billing stopped. |
| 472 | INTERNAL (api) | api | `api/src/modules/resolution/resolution.service.ts` | 203 | Ground not found |
| 473 | INTERNAL (api) | api | `api/src/modules/resolution/resolution.service.ts` | 241 | Ground not found |
| 474 | INTERNAL (api) | api | `api/src/modules/resolution/resolution.service.ts` | 243 | You are not a party to this ground |
| 475 | PROMPT (model says it) | api | `api/src/modules/billing/billing.service.ts` | 60 | This ground is beyond your ten free grounds. Resubscribe to continue checking in - the report and board stay available either way. |
| 476 | PROMPT (model says it) | api | `api/src/modules/billing/billing.service.ts` | 68 | This ground is beyond your ten free grounds. Resubscribe to continue checking in - the report and board stay available either way. |
| 477 | PROMPT (model says it) | api | `api/src/modules/billing/billing.service.ts` | 125 | Your free plan includes ${freeGroundLimit} Grounds. Subscribe to create unlimited Grounds. |
| 478 | PROMPT (model says it) | api | `api/src/modules/board/board.service.ts` | 67 | This is a private alignment ground. Accounts are never shown to other parties, so there is no shared board. Read your report instead. |
| 479 | PROMPT (model says it) | api | `api/src/modules/board/board.service.ts` | 160 | Generated from the ground. Only the meeting poll is editable. |
| 480 | PROMPT (model says it) | api | `api/src/modules/conversation/conversation.service.ts` | 381 | This ground is beyond your ten free grounds. Resubscribe to continue checking in - the report and board stay available either way. |
| 481 | PROMPT (model says it) | api | `api/src/modules/conversation/prompt-library.ts` | 333 | Understood - I have that for this session, and you can change it in the ground's settings so it holds everywhere. |
| 482 | PROMPT (model says it) | api | `api/src/modules/conversation/prompt-library.ts` | 1004 | You've described the agreement as [X]. The brief describes it as [Y]. Those are different agreements. That gap - not resolved in the ground opening -  |
| 483 | PROMPT (model says it) | api | `api/src/modules/conversation/prompt-library.ts` | 1021 | I'm not asking either of you to concede the original disagreement. I'm asking: from this point, what are both sides agreeing to? That is the standard  |
| 484 | PROMPT (model says it) | api | `api/src/modules/conversation/prompt-library.ts` | 1097 | Based on what came out of the last ground, what do you carry forward from that? |
| 485 | PROMPT (model says it) | api | `api/src/modules/conversation/prompt-library.ts` | 2114 | "This ground has already been running. What is your role in this, and what were you asked to do when you were brought in?" |
| 486 | PROMPT (model says it) | api | `api/src/modules/conversation/prompt-library.ts` | 2119 | "Before we build this new ground - what did you take away from the last one as the most important thing the record showed?" |
| 487 | PROMPT (model says it) | api | `api/src/modules/conversation/prompt-library.ts` | 2123 | "What is this ground about for you, and what would need to be true at the end of this period for you to feel it was worth doing?" |
| 488 | PROMPT (model says it) | api | `api/src/modules/conversation/prompt-library.ts` | 2372 | Based on past grounds, this lead consistently cares about: |
| 489 | PROMPT (model says it) | api | `api/src/modules/documents/what-setup-never-asked-for.ts` | 36 | } in this ground${about}. What would you want to be able to say about their work at the end of it? |
| 490 | PROMPT (model says it) | api | `api/src/modules/documents/what-this-ground-can-tell-you.ts` | 75 | show anybody against their own objective, because the only goal here belongs to the ground rather than to a person |
| 491 | PROMPT (model says it) | api | `api/src/modules/documents/what-this-ground-can-tell-you.ts` | 105 | measure anything against a written standard, because no document has been shared with the ground |
| 492 | PROMPT (model says it) | api | `api/src/modules/entry/entry.service.ts` | 148 | This is your contribution to this ground's record from session 1. It reflects what you put on record. Nobody else has weighed in yet. |
| 493 | PROMPT (model says it) | api | `api/src/modules/entry/entry.service.ts` | 274 | You are opening a performance improvement ground. Good moment to use Groundwork. Getting both accounts on record independently, the concern and the pe |
| 494 | PROMPT (model says it) | api | `api/src/modules/entry/entry.service.ts` | 540 | This check-in is to get your perspective on ${ground.label}. In a sentence or two, what would you want on record? |
| 495 | PROMPT (model says it) | api | `api/src/modules/grounds/an-interview-not-a-longer-setup.ts` | 20 | What would you want to be able to say about this work when the ground closes? |
| 496 | PROMPT (model says it) | api | `api/src/modules/grounds/grounds.controller.ts` | 150 | The named lead reviews the admin-supplied context, optionally edits it, and confirms - only then does the ground actually begin |
| 497 | PROMPT (model says it) | api | `api/src/modules/grounds/grounds.controller.ts` | 162 | Initiator-only: add a private context note for the AI, about a participant or the ground. Never shown to the person; never quoted as a claim. |
| 498 | PROMPT (model says it) | api | `api/src/modules/grounds/grounds.controller.ts` | 179 | Activate the ground after the report is ready (starts billing) |
| 499 | PROMPT (model says it) | api | `api/src/modules/grounds/grounds.controller.ts` | 314 | What the record says was true at the start, for anybody on the ground |
| 500 | PROMPT (model says it) | api | `api/src/modules/grounds/grounds.controller.ts` | 394 | Update timeline weeks and/or cadence; change is audit-logged on the ground |
| 501 | PROMPT (model says it) | api | `api/src/modules/grounds/grounds.cron.ts` | 294 | Your next check-in for ${p.ground.label} is open.${contextLine}\n${checkInUrl} |
| 502 | PROMPT (model says it) | api | `api/src/modules/grounds/grounds.service.ts` | 1119 | This ground is waiting for an admin in your organisation to accept it. Nobody can be invited until then. |
| 503 | PROMPT (model says it) | api | `api/src/modules/grounds/the-context-chat.ts` | 35 | How long should this run? Until a date, or for a set number of weeks - either is fine, but without it the ground cannot work out how many check-ins it |
| 504 | PROMPT (model says it) | api | `api/src/modules/grounds/the-context-chat.ts` | 67 | What is each person actually trying to achieve? Without that, the report can only speak about the ground as a whole, not about how anybody is doing ag |
| 505 | PROMPT (model says it) | api | `api/src/modules/grounds/the-context-chat.ts` | 90 | You are helping somebody set up a Groundwork ground called "${groundLabel}" (${scenario.replace(/_/g, ' ').toLowerCase()}). |
| 506 | PROMPT (model says it) | api | `api/src/modules/prompts/prompts.controller.ts` | 62 | Cross-org usage dashboard - session data, ground activity, prompt performance |
| 507 | PROMPT (model says it) | api | `api/src/modules/prompts/prompts.controller.ts` | 68 | All orgs with ground counts, billing status, and last activity |
| 508 | PROMPT (model says it) | api | `api/src/modules/reports/reports.service.ts` | 82 | You are Groundwork. A shared report has just gone out to everyone in this ground. Given one person's own check-in entries and the shared picture, writ |
| 509 | PROMPT (model says it) | api | `api/src/modules/resolution/resolution.service.ts` | 42 | On this ground the lead decides how it ends. Your account and your corrections stand on the record beside theirs. |
| 510 | ROUTE/PATH | api | `api/src/app.module.ts` | 13 | ./modules/grounds |
| 511 | ROUTE/PATH | api | `api/src/modules/admin/admin.controller.ts` | 82 | pricing/free-ground-limit |
| 512 | ROUTE/PATH | api | `api/src/modules/admin/admin.controller.ts` | 88 | pricing/free-ground-limit |
| 513 | ROUTE/PATH | api | `api/src/modules/admin/admin.controller.ts` | 164 | grounds/:groundId |
| 514 | ROUTE/PATH | api | `api/src/modules/board/board.controller.ts` | 29 | grounds/:id/board |
| 515 | ROUTE/PATH | api | `api/src/modules/conversation/conversation.service.ts` | 6 | ../grounds/session-count |
| 516 | ROUTE/PATH | api | `api/src/modules/documents/documents.controller.ts` | 34 | grounds/:groundId/documents |
| 517 | ROUTE/PATH | api | `api/src/modules/email/email.service.ts` | 635 | ${this.frontendUrl}/grounds/new |
| 518 | ROUTE/PATH | api | `api/src/modules/entry/entry.module.ts` | 6 | ../grounds/grounds.module |
| 519 | ROUTE/PATH | api | `api/src/modules/entry/entry.service.ts` | 12 | ../grounds/grounds.service |
| 520 | ROUTE/PATH | api | `api/src/modules/grounds/dto/index.ts` | 1 | ./create-ground.dto |
| 521 | ROUTE/PATH | api | `api/src/modules/grounds/dto/index.ts` | 3 | ./create-ground-for-lead.dto |
| 522 | ROUTE/PATH | api | `api/src/modules/grounds/grounds.controller.ts` | 6 | ./grounds.service |
| 523 | ROUTE/PATH | api | `api/src/modules/grounds/grounds.cron.ts` | 67 | ${frontend}/grounds/${g.id} |
| 524 | ROUTE/PATH | api | `api/src/modules/grounds/grounds.cron.ts` | 371 | ${frontend}/grounds/${g.id} |
| 525 | ROUTE/PATH | api | `api/src/modules/grounds/grounds.cron.ts` | 410 | ${frontend}/grounds/${p.ground.id}/report |
| 526 | ROUTE/PATH | api | `api/src/modules/grounds/grounds.cron.ts` | 499 | ${frontend}/grounds/${g.id}/feedback |
| 527 | ROUTE/PATH | api | `api/src/modules/grounds/grounds.module.ts` | 2 | ./grounds.service |
| 528 | ROUTE/PATH | api | `api/src/modules/grounds/grounds.module.ts` | 3 | ./grounds.controller |
| 529 | ROUTE/PATH | api | `api/src/modules/grounds/grounds.module.ts` | 4 | ./grounds.cron |
| 530 | ROUTE/PATH | api | `api/src/modules/grounds/grounds.service.ts` | 321 | /grounds/${ground.id} |
| 531 | ROUTE/PATH | api | `api/src/modules/grounds/index.ts` | 1 | ./grounds.module |
| 532 | ROUTE/PATH | api | `api/src/modules/grounds/index.ts` | 2 | ./grounds.service |
| 533 | ROUTE/PATH | api | `api/src/modules/grounds/participant-requests.controller.ts` | 5 | ./grounds.service |
| 534 | ROUTE/PATH | api | `api/src/modules/grounds/participant-requests.controller.ts` | 18 | grounds/:groundId/participant-requests |
| 535 | ROUTE/PATH | api | `api/src/modules/intelligence/intelligence.controller.ts` | 48 | grounds/:groundId/outcome-feedback |
| 536 | ROUTE/PATH | api | `api/src/modules/intelligence/intelligence.controller.ts` | 54 | grounds/:groundId/outcome-feedback |
| 537 | ROUTE/PATH | api | `api/src/modules/intelligence/intelligence.controller.ts` | 60 | grounds/:groundId/feedback |
| 538 | ROUTE/PATH | api | `api/src/modules/reports/reports.controller.ts` | 8 | grounds/:groundId/report |
| 539 | ROUTE/PATH | api | `api/src/modules/reports/reports.listener.ts` | 5 | ../grounds |
| 540 | ROUTE/PATH | api | `api/src/modules/reports/reports.listener.ts` | 85 | ${frontendUrl}/grounds/${event.groundId} |
| 541 | ROUTE/PATH | api | `api/src/modules/reports/reports.listener.ts` | 115 | ${frontendUrl}/grounds/${event.groundId} |
| 542 | ROUTE/PATH | api | `api/src/modules/reports/reports.listener.ts` | 148 | ${frontendUrl}/grounds/${event.groundId} |
| 543 | ROUTE/PATH | api | `api/src/modules/reports/reports.module.ts` | 6 | ../grounds |
| 544 | ROUTE/PATH | api | `api/src/modules/reports/reports.service.ts` | 21 | ../grounds |
| 545 | ROUTE/PATH | api | `api/src/modules/reports/reports.service.ts` | 22 | ../grounds/an-objective-belongs-to-a-person |
| 546 | ROUTE/PATH | api | `api/src/modules/reports/reports.service.ts` | 1302 | ${frontend}/grounds/${groundId}/report |
| 547 | ROUTE/PATH | api | `api/src/modules/resolution/resolution.controller.ts` | 28 | grounds/:groundId/resolution |
| 548 | ROUTE/PATH | api | `api/src/modules/resolution/resolution.service.ts` | 97 | ${frontend}/grounds/${groundId}/resolution |
| 549 | ROUTE/PATH | api | `api/src/modules/resolution/resolution.service.ts` | 147 | ${frontend}/grounds/${groundId}/resolution |
| 550 | ROUTE/PATH | api | `api/src/modules/resolution/resolution.service.ts` | 187 | ${frontend}/grounds/${groundId} |
| 551 | ROUTE/PATH | app | `client/src/App.tsx` | 75 | /grounds |
| 552 | ROUTE/PATH | app | `client/src/App.tsx` | 129 | /grounds |
| 553 | ROUTE/PATH | app | `client/src/App.tsx` | 130 | /grounds/new |
| 554 | ROUTE/PATH | app | `client/src/App.tsx` | 132 | /grounds/:id |
| 555 | ROUTE/PATH | app | `client/src/App.tsx` | 133 | /grounds/:id/p |
| 556 | ROUTE/PATH | app | `client/src/App.tsx` | 134 | /grounds/:id/report |
| 557 | ROUTE/PATH | app | `client/src/App.tsx` | 135 | /grounds/:id/board |
| 558 | ROUTE/PATH | app | `client/src/api/admin.ts` | 29 | /admin/pricing/free-ground-limit |
| 559 | ROUTE/PATH | app | `client/src/api/admin.ts` | 32 | /admin/pricing/free-ground-limit |
| 560 | ROUTE/PATH | app | `client/src/api/billing.ts` | 171 | /billing/can-create-ground |
| 561 | ROUTE/PATH | app | `client/src/api/board.ts` | 94 | /grounds/${groundId}/board |
| 562 | ROUTE/PATH | app | `client/src/api/board.ts` | 102 | /grounds/${groundId}/board/objectives |
| 563 | ROUTE/PATH | app | `client/src/api/board.ts` | 105 | /grounds/${groundId}/board/objectives/${objectiveId} |
| 564 | ROUTE/PATH | app | `client/src/api/board.ts` | 108 | /grounds/${groundId}/board/objectives/${objectiveId} |
| 565 | ROUTE/PATH | app | `client/src/api/board.ts` | 112 | /grounds/${groundId}/board/poll |
| 566 | ROUTE/PATH | app | `client/src/api/board.ts` | 117 | /grounds/${groundId}/board/poll/${optionId}/toggle |
| 567 | ROUTE/PATH | app | `client/src/api/documents.ts` | 20 | /grounds/${groundId}/documents |
| 568 | ROUTE/PATH | app | `client/src/api/documents.ts` | 25 | /grounds/${groundId}/documents |
| 569 | ROUTE/PATH | app | `client/src/api/documents.ts` | 31 | /grounds/${groundId}/documents/${docId}/assessment |
| 570 | ROUTE/PATH | app | `client/src/api/documents.ts` | 35 | /grounds/${groundId}/documents/${docId}/visibility |
| 571 | ROUTE/PATH | app | `client/src/api/documents.ts` | 38 | /grounds/${groundId}/documents/${docId} |
| 572 | ROUTE/PATH | app | `client/src/api/feedback.ts` | 36 | /grounds/${groundId}/outcome-feedback |
| 573 | ROUTE/PATH | app | `client/src/api/feedback.ts` | 41 | /grounds/${groundId}/outcome-feedback |
| 574 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 69 | /grounds |
| 575 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 73 | /grounds/${id} |
| 576 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 78 | /grounds/${id}/peer-visibility |
| 577 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 82 | /grounds/${id}/external-visibility |
| 578 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 85 | /grounds |
| 579 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 88 | /grounds/for-lead |
| 580 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 91 | /grounds/${groundId}/confirm-lead |
| 581 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 94 | /grounds/org-roster |
| 582 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 97 | /grounds/${groundId}/participants |
| 583 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 100 | /grounds/${groundId}/lead-context |
| 584 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 103 | /grounds/${groundId}/activate |
| 585 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 107 | /grounds/${groundId}/closing-round |
| 586 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 110 | /grounds/${groundId}/participants/${participantId}/resend-invite |
| 587 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 113 | /grounds/${groundId}/mediator-brief |
| 588 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 116 | /grounds/${groundId}/people-work-together |
| 589 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 119 | /grounds/${groundId} |
| 590 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 128 | /grounds/${groundId}/my-specificity |
| 591 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 137 | /grounds/${groundId}/my-record |
| 592 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 140 | /grounds/${groundId}/my-solo-report |
| 593 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 143 | /grounds/${groundId}/my-solo-report/share |
| 594 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 149 | /grounds/${groundId}/sign-off |
| 595 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 154 | /grounds/${groundId}/participants/${participantId}/invite-url |
| 596 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 166 | /grounds/${groundId}/my-checkin-status |
| 597 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 188 | /grounds/${groundId}/my-transcript |
| 598 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 201 | /grounds/${groundId}/my-notes |
| 599 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 209 | /grounds/${groundId}/my-notes |
| 600 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 215 | /grounds/${groundId}/my-notes/${noteId} |
| 601 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 223 | /grounds/awaiting-approval |
| 602 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 227 | /grounds/${groundId}/approve |
| 603 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 230 | /grounds/${groundId}/decline |
| 604 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 236 | /grounds/${groundId}/context-chat/confirm |
| 605 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 242 | /grounds/${groundId}/baseline |
| 606 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 247 | /grounds/${groundId}/baseline |
| 607 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 253 | /grounds/${groundId}/objectives/${participantId} |
| 608 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 258 | /grounds/${groundId}/my-objective |
| 609 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 263 | /grounds/${groundId}/my-objective/accept |
| 610 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 271 | /grounds/${groundId}/baseline-entries/candidates |
| 611 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 275 | /grounds/${groundId}/baseline-entries |
| 612 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 284 | /grounds/${groundId}/baseline-entries |
| 613 | ROUTE/PATH | app | `client/src/api/grounds.ts` | 294 | /grounds/${groundId}/context-chat |
| 614 | ROUTE/PATH | app | `client/src/api/index.ts` | 3 | ./grounds |
| 615 | ROUTE/PATH | app | `client/src/api/participantRequests.ts` | 19 | /grounds/${groundId}/participant-requests |
| 616 | ROUTE/PATH | app | `client/src/api/participantRequests.ts` | 22 | /grounds/${groundId}/participant-requests |
| 617 | ROUTE/PATH | app | `client/src/api/participantRequests.ts` | 25 | /grounds/${groundId}/participant-requests/${reqId} |
| 618 | ROUTE/PATH | app | `client/src/api/reports.ts` | 12 | /grounds/${groundId}/report |
| 619 | ROUTE/PATH | app | `client/src/api/reports.ts` | 15 | /grounds/${groundId}/report/release |
| 620 | ROUTE/PATH | app | `client/src/api/reports.ts` | 18 | /grounds/${groundId}/report/activate |
| 621 | ROUTE/PATH | app | `client/src/api/reports.ts` | 21 | /grounds/${groundId}/report/activation-status |
| 622 | ROUTE/PATH | app | `client/src/api/reports.ts` | 24 | /grounds/${groundId}/clarify |
| 623 | ROUTE/PATH | app | `client/src/api/reports.ts` | 27 | /grounds/${groundId}/correct-session |
| 624 | ROUTE/PATH | app | `client/src/api/resolution.ts` | 34 | /grounds/${groundId}/resolution |
| 625 | ROUTE/PATH | app | `client/src/api/resolution.ts` | 39 | /grounds/${groundId}/resolution |
| 626 | ROUTE/PATH | app | `client/src/api/resolution.ts` | 43 | /grounds/${groundId}/resolution/counter |
| 627 | ROUTE/PATH | app | `client/src/components/gw/AppShell.tsx` | 20 | /grounds |
| 628 | ROUTE/PATH | app | `client/src/components/gw/AppShell.tsx` | 375 | /grounds |
| 629 | ROUTE/PATH | app | `client/src/components/gw/AppShell.tsx` | 453 | /grounds/new |
| 630 | ROUTE/PATH | app | `client/src/components/gw/AppShell.tsx` | 532 | /grounds/${g.id} |
| 631 | ROUTE/PATH | app | `client/src/pages/admin/AdminDashboardPage.tsx` | 624 | /grounds |
| 632 | ROUTE/PATH | app | `client/src/pages/admin/AdminPage.tsx` | 690 | /grounds |
| 633 | ROUTE/PATH | app | `client/src/pages/auth/ChoosePasswordPage.tsx` | 27 | /grounds?welcome=1 |
| 634 | ROUTE/PATH | app | `client/src/pages/auth/ChoosePasswordPage.tsx` | 27 | /grounds |
| 635 | ROUTE/PATH | app | `client/src/pages/auth/GoogleCallbackPage.tsx` | 51 | /grounds/${res.groundId} |
| 636 | ROUTE/PATH | app | `client/src/pages/auth/MagicVerifyPage.tsx` | 103 | /grounds |
| 637 | ROUTE/PATH | app | `client/src/pages/auth/MagicVerifyPage.tsx` | 197 | /set-password?token=${encodeURIComponent(passwordSetupToken)}&next=${encodeURIComponent('/grounds')} |
| 638 | ROUTE/PATH | app | `client/src/pages/auth/MagicVerifyPage.tsx` | 198 | /grounds |
| 639 | ROUTE/PATH | app | `client/src/pages/auth/MagicVerifyPage.tsx` | 284 | /grounds/${nextGroundId} |
| 640 | ROUTE/PATH | app | `client/src/pages/auth/MagicVerifyPage.tsx` | 307 | /grounds |
| 641 | ROUTE/PATH | app | `client/src/pages/auth/MagicVerifyPage.tsx` | 342 | /grounds |
| 642 | ROUTE/PATH | app | `client/src/pages/billing/BillingCallbackPage.tsx` | 16 | /grounds/${groundId} |
| 643 | ROUTE/PATH | app | `client/src/pages/billing/BillingPage.tsx` | 162 | /grounds/${groundId} |
| 644 | ROUTE/PATH | app | `client/src/pages/billing/BillingPage.tsx` | 162 | /grounds |
| 645 | ROUTE/PATH | app | `client/src/pages/billing/PaymentPage.tsx` | 41 | /grounds/${groundId} |
| 646 | ROUTE/PATH | app | `client/src/pages/billing/PaymentPage.tsx` | 41 | /grounds |
| 647 | ROUTE/PATH | app | `client/src/pages/board/BoardPage.tsx` | 88 | /grounds |
| 648 | ROUTE/PATH | app | `client/src/pages/board/BoardPage.tsx` | 103 | /grounds/${id}/report |
| 649 | ROUTE/PATH | app | `client/src/pages/board/BoardPage.tsx` | 104 | /grounds/${id} |
| 650 | ROUTE/PATH | app | `client/src/pages/board/BoardPage.tsx` | 123 | /grounds/${id}/p |
| 651 | ROUTE/PATH | app | `client/src/pages/board/BoardPage.tsx` | 393 | /grounds/${id}/report |
| 652 | ROUTE/PATH | app | `client/src/pages/chat/ChatPage.tsx` | 470 | /grounds/${groundId}${isInitiator ? '' : '/p'} |
| 653 | ROUTE/PATH | app | `client/src/pages/chat/ChatPage.tsx` | 470 | /grounds |
| 654 | ROUTE/PATH | app | `client/src/pages/chat/ChatPage.tsx` | 662 | /grounds |
| 655 | ROUTE/PATH | app | `client/src/pages/enter/EntryChatPage.tsx` | 1089 | /grounds/${res.groundId} |
| 656 | ROUTE/PATH | app | `client/src/pages/enter/EntryChatPage.tsx` | 1276 | /grounds |
| 657 | ROUTE/PATH | app | `client/src/pages/grounds/CreateGroundPage.tsx` | 397 | /grounds/${ground.id} |
| 658 | ROUTE/PATH | app | `client/src/pages/grounds/CreateGroundPage.tsx` | 420 | /grounds |
| 659 | ROUTE/PATH | app | `client/src/pages/grounds/GroundAdminPage.tsx` | 27 | ./ground-tabs |
| 660 | ROUTE/PATH | app | `client/src/pages/grounds/GroundAdminPage.tsx` | 347 | /grounds/${id}/p |
| 661 | ROUTE/PATH | app | `client/src/pages/grounds/GroundAdminPage.tsx` | 347 | /grounds |
| 662 | ROUTE/PATH | app | `client/src/pages/grounds/GroundAdminPage.tsx` | 496 | /grounds |
| 663 | ROUTE/PATH | app | `client/src/pages/grounds/GroundAdminPage.tsx` | 514 | /grounds/${id}/p |
| 664 | ROUTE/PATH | app | `client/src/pages/grounds/GroundAdminPage.tsx` | 523 | /grounds/${id}/board |
| 665 | ROUTE/PATH | app | `client/src/pages/grounds/GroundAdminPage.tsx` | 570 | /grounds/${id}/board |
| 666 | ROUTE/PATH | app | `client/src/pages/grounds/GroundAdminPage.tsx` | 996 | /grounds/${id}/p?open=1 |
| 667 | ROUTE/PATH | app | `client/src/pages/grounds/GroundAdminPage.tsx` | 1349 | /grounds/${id}/report |
| 668 | ROUTE/PATH | app | `client/src/pages/grounds/GroundAdminPage.tsx` | 1494 | /grounds/new |
| 669 | ROUTE/PATH | app | `client/src/pages/grounds/GroundParticipantPage.tsx` | 16 | ./ground-tabs |
| 670 | ROUTE/PATH | app | `client/src/pages/grounds/GroundParticipantPage.tsx` | 223 | /grounds |
| 671 | ROUTE/PATH | app | `client/src/pages/grounds/GroundParticipantPage.tsx` | 284 | /grounds |
| 672 | ROUTE/PATH | app | `client/src/pages/grounds/GroundParticipantPage.tsx` | 292 | /grounds/${id} |
| 673 | ROUTE/PATH | app | `client/src/pages/grounds/GroundParticipantPage.tsx` | 305 | /grounds/${id}/board |
| 674 | ROUTE/PATH | app | `client/src/pages/grounds/GroundParticipantPage.tsx` | 571 | /grounds/${id}/report |
| 675 | ROUTE/PATH | app | `client/src/pages/grounds/GroundParticipantPage.tsx` | 598 | /grounds/${id}/report |
| 676 | ROUTE/PATH | app | `client/src/pages/grounds/GroundsListPage.tsx` | 238 | /grounds/${a.id} |
| 677 | ROUTE/PATH | app | `client/src/pages/grounds/GroundsListPage.tsx` | 267 | /grounds/new |
| 678 | ROUTE/PATH | app | `client/src/pages/grounds/GroundsListPage.tsx` | 322 | /grounds/${g.id} |
| 679 | ROUTE/PATH | app | `client/src/pages/grounds/GroundsListPage.tsx` | 344 | /grounds/new |
| 680 | ROUTE/PATH | app | `client/src/pages/grounds/GroundsListPage.tsx` | 349 | /grounds/${g.id} |
| 681 | ROUTE/PATH | app | `client/src/pages/grounds/GroundsListPage.tsx` | 368 | /grounds/new |
| 682 | ROUTE/PATH | app | `client/src/pages/grounds/GroundsListPage.tsx` | 387 | /grounds/new |
| 683 | ROUTE/PATH | app | `client/src/pages/grounds/GroundsListPage.tsx` | 400 | /grounds/${g.id} |
| 684 | ROUTE/PATH | app | `client/src/pages/grounds/GroundsListPage.tsx` | 400 | /grounds/${g.id}/p |
| 685 | ROUTE/PATH | app | `client/src/pages/home/HomePage.tsx` | 205 | /grounds/new?scenario=${encodeURIComponent(c.param)} |
| 686 | ROUTE/PATH | app | `client/src/pages/invite/InvitePage.tsx` | 39 | /grounds/${groundId}/p |
| 687 | ROUTE/PATH | app | `client/src/pages/invite/InvitePage.tsx` | 64 | /grounds/${groundId}/p |
| 688 | ROUTE/PATH | app | `client/src/pages/invite/InvitePage.tsx` | 115 | /grounds |
| 689 | ROUTE/PATH | app | `client/src/pages/notfound/NotFoundPage.tsx` | 35 | /grounds |
| 690 | ROUTE/PATH | app | `client/src/pages/org/OrgMembersPage.tsx` | 68 | /grounds |
| 691 | ROUTE/PATH | app | `client/src/pages/report/ReportPage.tsx` | 31 | /grounds/${groundId}/resolution |
| 692 | ROUTE/PATH | app | `client/src/pages/report/ReportPage.tsx` | 642 | /grounds/${id} |
| 693 | ROUTE/PATH | app | `client/src/pages/report/ReportPage.tsx` | 642 | /grounds/${id}/p |
| 694 | ROUTE/PATH | app | `client/src/pages/report/ReportPage.tsx` | 954 | /grounds/${id} |
| 695 | ROUTE/PATH | app | `client/src/pages/settings/SettingsPage.tsx` | 95 | /grounds |
