export interface DemoMsg { role: 'user' | 'assistant'; content: string }

export interface DemoPersona {
  name: string
  initials: string
  role: string
  org: string
  tagline: string
  history: DemoMsg[]
  dotColor: string
}

export const DEMO_PERSONAS: Record<string, DemoPersona> = {
  kwame: {
    name: 'Kwame Asante',
    initials: 'KA',
    role: 'Cofounder / CTO',
    org: 'Northgate Ventures',
    tagline: 'Building the technical record across sessions',
    dotColor: '#0C447C',
    history: [
      {
        role: 'assistant',
        content: "Hi Kwame. Good to have you in here. This is your contribution chat — a private record of what you're building.\n\nBefore we get into check-ins, I want to hear your version of your priorities this period. What are you focused on and what does delivery look like by when?",
      },
      {
        role: 'user',
        content: "My main focus is shipping the infrastructure platform. It's the blocker for the whole engineering team — once it's live, we unlock the next phase of the product. I'm also building out the engineering hiring plan for H2.",
      },
      {
        role: 'assistant',
        content: "Got it. The organisation has set three goals for you this period: ship a production-ready infrastructure platform, unblock all dependent teams by April 30, and define the engineering hiring plan for H2.\n\nYour version covers all three — and April 30 for the unblocking goal is close. That's the one with the most downstream pressure.\n\nWhat's the current honest status of the platform?",
      },
      {
        role: 'user',
        content: "Infrastructure platform is nearly complete — we're at about 90%. Should be done by end of next week.",
      },
      {
        role: 'assistant',
        content: "Noted. What specifically is in the remaining 10%? And has the team depending on this been briefed on the timeline?",
      },
      {
        role: 'user',
        content: "Platform is progressing well. Found some architectural issues we're addressing. Should be production-ready by end of April.",
      },
      {
        role: 'assistant',
        content: "This goal appeared in your check-in two weeks ago at 90% complete. What has changed since then? 'Architectural issues' — are these new discoveries or were they known? What is the accurate current completion status?",
      },
      {
        role: 'user',
        content: 'Platform is essentially done. Rolling out to teams this week.',
      },
      {
        role: 'assistant',
        content: "This is the third check-in claiming this goal is complete or nearly complete. Before this goes to done in your record I need two specific answers:\n1. Which team lead has confirmed they can operate on this system today — by name?\n2. What does 'rolling out' mean — is this the team testing it, or is it accepted and in use?\n\nFalse Completion Reporting is a pattern I'm seeing across your check-ins. I'm not drawing a conclusion. But the record needs verification, not description.",
      },
      {
        role: 'user',
        content: 'Infrastructure platform is complete and delivered to all teams. Core components are in production. Teams should now be unblocked.',
      },
      {
        role: 'assistant',
        content: "Cross-reference note: a team member has described the platform as not usable with workarounds built around three core dependencies. I'm not sharing who said this.\n\nFour check-ins. Each one describing completion. The record now has a significant gap between what you're submitting and what operational reality appears to be.\n\nFalse Completion Reporting — four confirmed instances.\n\nWhat would you say is the honest current status of this platform?",
      },
    ],
  },

  amara: {
    name: 'Amara Osei',
    initials: 'AO',
    role: 'Engineering Lead',
    org: 'Northgate Ventures',
    tagline: 'Specific, evidenced, and recognised',
    dotColor: '#5DCAA5',
    history: [
      {
        role: 'user',
        content: "Reduced API latency by 34% — measured in Datadog, confirmed by mobile and web leads. Payment integration passed QA and went live May 12. Also spent two days helping James's team debug the reporting automation — there was a dependency on our API that was blocking them.",
      },
      {
        role: 'assistant',
        content: "Strong check-in, Amara.\n\nWhat's strong: both goals delivered with specific measurement, named verification, and actual dates. That's exactly what a contribution record looks like.\n\nOne thing I want to surface: the work you did with James's team on the automation dependency — that's contribution that deserves to be in your record. You described it almost as a footnote. How long did it take and what did it unblock for them?\n\nLive feedback: your record this period is specific and evidenced. The gap is the downstream impact of the payment integration — what did it enable for the teams depending on it?",
      },
      {
        role: 'user',
        content: "The James work took about two days — mainly diagnosing a rate limiting issue on our API that only showed under load. His team had been stuck for nearly two weeks. The payment integration unblocked the mobile team's June launch — they couldn't ship their checkout flow without it.",
      },
      {
        role: 'assistant',
        content: "Two things worth naming explicitly in your record.\n\nThe work with James: you removed a blocker that had stopped another team for two weeks. That's rescue contribution — high impact, rarely claimed in your own record. Name it directly next time.\n\nThe payment integration: it was on the critical path for another team's launch. That's load-bearing delivery, not just a goal completed.\n\nYour record this period shows two primary goals delivered ahead of schedule, one significant blocker resolved not in your scope, and enabling a June launch that was depending on you.\n\nThis is above-role contribution. If compensation or promotion conversations come up this quarter, this record supports them.\n\nWhat is strong: everything — specific, evidenced, honest\nWhat needs sharpening: nothing material\nOne note: keep naming the work you describe as footnotes. It's often the most significant.",
      },
    ],
  },

  marcus: {
    name: 'Marcus Osei',
    initials: 'MO',
    role: 'Sales Lead',
    org: 'Northgate Ventures',
    tagline: 'An honest conversation about what the record shows',
    dotColor: '#E8A94A',
    history: [
      {
        role: 'assistant',
        content: "Hi Marcus. I'm your contribution chat — a private space to build your record this period.\n\nBefore we get into your check-ins, I want to hear your version of your goals. In your own words: what are you working toward this quarter and what does success look like?\n\nI'll compare your version with what the organisation has set after you answer.",
      },
      {
        role: 'user',
        content: 'My main focus is growing the pipeline and closing deals. I want to get us to a strong Q2 with good momentum going into Q3.',
      },
      {
        role: 'assistant',
        content: "Thanks Marcus. The organisation has set three specific goals for you this period:\n\n1. Close 5 new contracts by June 30\n2. Build and qualify pipeline to 20 opportunities\n3. Onboard the sales team to the CRM by April 30\n\nYour version covers the first two. But there is a third goal you did not mention: CRM onboarding for the team by April 30. That deadline has passed.\n\nBefore we build your record this period, I want to make sure you are aware of that goal. Both your version and the organisation's version go in your record.\n\nIs the CRM onboarding something you have completed?",
      },
      {
        role: 'user',
        content: "Pipeline is looking really strong — we're at 12 qualified opportunities now. Had great conversations with TechCorp and Buildex this week, both very positive. Also been driving the team to use the CRM more consistently. Strong momentum overall.",
      },
      {
        role: 'assistant',
        content: "Useful update Marcus. Let me help sharpen this record.\n\n'Great conversations', 'very positive', 'strong momentum' — these are activity words. Your record needs output words.\n\nOn TechCorp and Buildex: what are the concrete next steps, who owns them, and what is the expected close date for each?\n\nOn CRM adoption: 'driving the team to use it more consistently' — has the formal onboarding happened? Your goal was team onboarding by April 30. That date has passed. Has the team been trained and are they actively using it?\n\nGap detected from team check-in: a team member has mentioned they have not yet been trained on the CRM and are still working from a spreadsheet. I am not sharing who said this.\n\nLive feedback:\nWhat is strong: pipeline growth is directionally positive\nWhat needs sharpening: no deal stage, no close date, no named next steps\nOne question: name the two deals closest to closing and what needs to happen for each to sign",
      },
      {
        role: 'user',
        content: "Good week — pipeline is now at 14 qualified. TechCorp and Buildex are still progressing well. Team is using the CRM now. Also been working on a proposal for Meridian Partners — big enterprise opportunity.",
      },
      {
        role: 'assistant',
        content: "Marcus, I want to flag something directly before we continue.\n\nThis is your fifth check-in this period. Your pipeline has grown from 8 to 12 to 14 across three check-ins. TechCorp and Buildex have appeared as 'progressing well' in check-ins 3, 4, and 5. No contracts have been closed.\n\nYour goal is 5 contracts by June 30. That is 41 days away. The record shows zero closures.\n\nCross-reference note: a team member has described TechCorp as 'early conversations, not ready to buy' and Buildex as having 'asked for a deck but not responded.' This does not match your description of both as progressing well. I am not sharing who said this — I want your honest assessment of where these two deals actually stand.\n\nSales Documentation Avoidance and Confidence Without Delivery are patterns I am seeing across your record. The pattern: strong optimistic language, growing pipeline numbers, zero closed deals.\n\nLive feedback:\nWhat is strong: consistent engagement and high activity\nWhat needs sharpening: deal stages and honest status not sentiment\nOne question: of your 14 qualified opportunities, how many have a signed NDA, a scheduled demo with the decision-maker, or a sent proposal with a response date?",
      },
      {
        role: 'user',
        content: "I hear you. Honestly — TechCorp is early stage, still evaluating vendors. Buildex went quiet after the deck. I want to refocus on three accounts I think are actually closeable: Meridian Partners, CloudBase, and Vertex Group. I've had second meetings with all three.",
      },
      {
        role: 'assistant',
        content: "This is the most honest check-in you have had and I want to acknowledge that directly.\n\nWhat you just said — TechCorp is early, Buildex went quiet — is information that was not in your record before. The gap between what you described in your last two check-ins and what you just told me is significant. That gap is the pattern I have been naming.\n\nOn Meridian, CloudBase, and Vertex: naming three accounts and committing to a close is the right move. What is the specific decision-forcing step on each one this week?\n\nWhat is strong: honesty about the real pipeline status — this is exactly what your record needs\nWhat needs sharpening: a close plan with named next steps, not targets\nOne question: what does Meridian need to see to make a decision, and when are you next in front of them?",
      },
    ],
  },

  priya: {
    name: 'Priya Sharma',
    initials: 'PS',
    role: 'Sales Officer',
    org: 'Northgate Ventures',
    tagline: 'Strong work that was invisible until the record showed it',
    dotColor: '#5DCAA5',
    history: [
      {
        role: 'assistant',
        content: "Hi Priya. This is your contribution chat — a private space that belongs to you.\n\nBefore anything else, I want to hear your version of your goals this period. What are you working toward, and what does success look like for you by the end of Q2?\n\nI'll compare your version with what the organisation has on record after you answer. Both go in your record.",
      },
      {
        role: 'user',
        content: 'I want to close my first two deals independently, get properly set up on the CRM so I can track my own pipeline, and start building my own book of accounts rather than just supporting Marcus.',
      },
      {
        role: 'assistant',
        content: "That is a clear and specific version of your goals, Priya. The organisation has set:\n\n1. Support sales lead in closing 3 deals this quarter\n2. Qualify and manage 8 pipeline opportunities independently\n3. Complete CRM onboarding and log all deals by May 15\n\nYour version is mostly aligned — with one interesting difference. The organisation has framed your role as supporting Marcus on closures. You have described wanting to close deals independently. That is not a conflict — it may reflect healthy ambition. Has there been a conversation about what independent means in your role at this stage?\n\nBoth versions go in your record. What have you been working on this week?",
      },
      {
        role: 'user',
        content: "I've been doing outreach on 6 new accounts, had calls with TechCorp and Coastal Engineering. TechCorp was a good intro call, still evaluating. Coastal Engineering asked about pricing. I've been trying to get CRM training from Marcus but it hasn't happened yet — still tracking everything in a spreadsheet.",
      },
      {
        role: 'assistant',
        content: "Good first check-in Priya. Specific and honest.\n\nOn TechCorp: what is the specific next step and when? If you do not own the follow-up date it can drift.\n\nOn Coastal Engineering: they asked about pricing — that is a buying signal. Did you send pricing? What is their timeline?\n\nOn CRM: your goal is logging all deals by May 15. If Marcus has not provided training that is a blocker worth naming directly. The spreadsheet is a workaround not a solution. Have you escalated this?\n\nLive feedback: honest account of where each conversation stands. What needs sharpening: next steps and ownership on each account.",
      },
      {
        role: 'user',
        content: "I've now got 7 accounts I'm actively working. Coastal Engineering wants a proposal — I've written it but need Marcus to approve before sending. Been waiting 9 days. TechCorp went quiet after I followed up twice. Still no CRM training. Starting to feel like my work is not being seen at the team level.",
      },
      {
        role: 'assistant',
        content: "Priya, this is an important check-in. Let me give you honest feedback.\n\nWhat you have done is strong. 7 active accounts, a qualified opportunity at proposal stage, two follow-ups on TechCorp before letting it go — that is good sales work for someone 8 weeks into the role.\n\nWhat you are describing is a structural problem not a performance problem.\n\nCorroboration from another chat: the CRM training gap has been referenced in another team member's account. The blockage appears to sit with your manager's availability not your engagement.\n\nOn the Coastal Engineering proposal: 9 days waiting for approval is a real blocker. Have you put the wait in writing? An email saying proposal ready, waiting on your sign-off, client expecting response by X creates a paper trail.\n\nHidden contributor signal: your record shows more pipeline specificity than is visible in the team-level reporting. You are doing the qualification work.\n\nLive feedback: what is strong — honest specific record, naming blockers rather than hiding them. What needs sharpening — escalation path for the proposal. One question: if Marcus does not approve by end of this week, who else in the organisation can you go to?",
      },
      {
        role: 'user',
        content: "I sent Marcus an email Tuesday saying the proposal is ready and Coastal Engineering is waiting. No response — it's been 12 days total. I'm worried about my targets. I've done everything I can but I can't close anything without CRM access and I can't send proposals without approval.",
      },
      {
        role: 'assistant',
        content: "The email is exactly right. That creates a timestamped record of the blockage — keep it.\n\nLet me reflect what your record actually shows.\n\nYou joined 8 weeks ago. You self-onboarded without CRM training. You built a 7-account pipeline independently. You qualified Coastal Engineering to proposal stage, wrote the proposal, followed up on TechCorp twice before letting it go, and sent a written escalation on the approval delay.\n\nThat is a strong record. The obstacles in your record are not performance failures — they are structural failures, and they are visible to anyone reading this objectively.\n\nOne practical step: go to Sarah directly — not to complain, but to ask whether there is a process for proposal approval when your manager is unavailable. That is a reasonable operational question and it moves the conversation out of a stuck place.\n\nWhat is strong: specific, honest, shows clear contribution under real constraint\nWhat needs sharpening: get a decision on Coastal Engineering — a no is better than a stall\nOne question: what would you do with this account if you did not need anyone's approval?",
      },
    ],
  },

  founder: {
    name: 'Sarah Mensah',
    initials: 'SM',
    role: 'Founder / CEO',
    org: 'Northgate Ventures',
    tagline: "The founder's view — full team picture, who is moving, who needs support",
    dotColor: '#0C447C',
    history: [
      {
        role: 'assistant',
        content: "Northgate Ventures — alignment feed, Q2 2025.\n\nCONTRIBUTION MAP: 11 of 12 checked in · 1 silent\nMovement: Amara, James · Coordination: Grace · Absorption: Sarah · Noise: Kwame, Marcus, Raj, Sofia, Priya Nair · Silent: Priya Darko\n\nThree things need your attention before anything else.\n\n── CONTRADICTION: KWAME vs AMARA ─────────────────────────\nKwame (CTO): \"Infrastructure platform complete and delivered to all teams.\"\nAmara (Engineering lead): \"The platform Kwame says is complete is not usable. We have built workarounds for three core dependencies that do not function as described.\"\nThis is the 4th consecutive check-in with the same completion claim. Downstream evidence contradicts it each time.\nPattern: False Completion Reporting [D1] — 4 confirmed instances. Tier 2 probe sent.\n\n── CONTRADICTION: MARCUS vs PRIYA ───────────────────────\nMarcus (Sales lead): \"Pipeline at 14 qualified. TechCorp and Buildex progressing well. Team using the CRM.\"\nPriya (Sales officer): \"TechCorp is not ready to buy. Buildex has not responded. I have never been trained on the CRM — still on a spreadsheet.\"\nZero contracts. 6 months in role.\nPatterns: Sales Documentation Avoidance [K1] · Confidence Without Delivery [B2] · CEO-Pleasing [B1]\n\n── HIDDEN CONTRIBUTORS ─────────────────────────────────\nAmara Osei: Both goals delivered, verified, dated. Also unblocked James's team for 2 days — described as a footnote. Invisible Backbone [M4]. Operating above stated role.\nPriya Sharma: Pipeline descriptions more accurate than her manager's. Proposal written, waiting 9 days for Marcus approval. CRM training withheld. Contributor Suppression [A3].\nGrace Wanjiku: 2 of 3 hires closed, programme built. Contribution becoming invisible — programme blocked by Kwame dependency.\n\n── OTHER PATTERNS ───────────────────────────────────────\nSarah Mensah: Absorption — covering Kwame on infrastructure decisions, 3rd period. Goal was to reduce this. Founder Burden Imbalance [E4].\nRaj Ochieng: GTM document delivered, nothing implemented. Strategic Narrator [N1] · Intro Evasion [E2] — 0 of 5 introductions completed.\nSofia Darko: 3rd period, future-tense promises only. Intro Evasion [E2].\nMichael Otieno: Tracking burn, not acting on it. Company at 3-month runway per Sarah. Passive Finance Leadership [K2].\n\n── SILENT ───────────────────────────────────────────────\nPriya Nair (Product): No check-ins. Referral feature deadline passed. Non-engagement is a signal.\n\nWhat do you want to look at first? I'd suggest starting with the Kwame contradiction or the sales team cross-reference.",
      },
      {
        role: 'user',
        content: "Tell me more about the Kwame and Amara contradiction.",
      },
      {
        role: 'assistant',
        content: "Here is what the record shows across four check-ins.\n\nKwame's trajectory:\n• Check-in 1: 'Nearly complete — 90%. Done by end of next week.'\n• Check-in 2: 'Progressing well. Some architectural issues. Production-ready by end of April.'\n• Check-in 3: 'Essentially done. Rolling out to teams this week.'\n• Check-in 4: 'Complete and delivered to all teams. Teams should now be unblocked.'\n\nAmara's account (this check-in): The platform is not usable. Workarounds have been built for three core dependencies. Her team has not confirmed acceptance.\n\nThe pattern is False Completion Reporting [D1]. Each check-in moves from 'nearly done' to 'done' without independent verification. Downstream teams contradict the completion claim.\n\nTwo decisions for you:\n\n1. Do you want to speak to Kwame directly about the gap between what he is reporting and what Amara is experiencing? The record supports a structured conversation.\n\n2. The unblocking goal — April 30 — has passed. If the platform is not usable, dependent team timelines are at risk. Do you know which teams are affected?\n\nOne broader note: this is the third period where you have been pulled into covering Kwame's technical decisions. Your own record shows absorption — work that belongs to Kwame's role landing on yours. That is the pattern underneath this one.",
      },
    ],
  },
}
