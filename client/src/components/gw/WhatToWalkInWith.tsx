import { Section } from './ui'


/*
 * AND WHY IT LIVES HERE NOW RATHER THAN ON THE SHARED REPORT.
 *
 * It was inside `ReportBody`, the block that got deleted - a private, forward-looking panel sitting
 * in the middle of a shared, backward-looking document. Everything around it was a record of what
 * had already been said by everybody; this is three lines for one person about a conversation they
 * have not had yet, and the panel had to say so itself ("Yours alone... Nobody else is shown this")
 * because its surroundings implied the opposite.
 *
 * My record is the tab whose whole promise is that it is yours. The panel no longer has to explain
 * that it is an exception, because it no longer is one.
 */
/**
 * THE GUIDE WE HAVE BEEN PAYING FOR AND THROWING AWAY.
 *
 * `postReportGuide` is three lines generated per participant per report release - an opening line, a
 * question to carry, and one thing the other person said worth taking seriously. It is on the report
 * payload, scoped to the person whose it is (`engagement.postReportGuides[participant.id]`), and no
 * client file mentioned it. Found by diffing what the service returns against what the client reads.
 *
 * `POST_REPORT_GUIDE_ENABLED=true` sits in `.env.example` directly under its own comment saying "OFF
 * by default so it does not spend a Gemini call per participant per release into a void. Set to
 * 'true' only once a client surface shows each participant their guide." So we were spending the
 * call, every release, per person, and discarding the result. The comment predicted it exactly.
 *
 * Rendering it rather than switching it off: it is already computed, already paid for, already
 * sanitised - `guide-sanitiser.ts` drops any field that names a party or quotes them - and it goes to
 * the one person it is about.
 *
 * NOT SHOWN TO THE LEAD ABOUT SOMEBODY ELSE. The server only ever fills it for the requesting
 * participant, and this renders what it is given. A lead who is also a party gets their own.
 */
export function WhatToWalkInWith({ guide }: { guide: { openingLine?: string; questionToCarry?: string; toAcknowledge?: string } }) {
  /* No privacy note (the standards; Dangote rerun, N13). Who is served it is the backend's rule. */
  const rows = [
    { h: 'A way to open', text: guide.openingLine },
    { h: 'A question worth carrying in', text: guide.questionToCarry },
    { h: 'Something they said that is worth taking seriously', text: guide.toAcknowledge },
  ].filter(r => r.text?.trim())
  /** A sanitiser that dropped all three leaves nothing to say, and an empty card says it badly. */
  if (!rows.length) return null
  return (
    <div className="gwui-rule-blue gwui-pt-14 gwui-pb-14 gwui-pl-17 gwui-pr-17 gwui-mb-16" style={{ background: 'var(--gw-blue-bg)', borderRadius: 8 }}>
      <Section heading="Before you talk to them" />
      {rows.map((r, i) => (
        <div key={i} className={i === rows.length - 1 ? 'gwui-mb-0' : 'gwui-mb-11'}>
          <div className="gwui-fs-13 gwui-ink-text gwui-mb-3" style={{ fontWeight: 700 }}>{r.h}</div>
          <div className="gwui-fs-13-5 gwui-ink-text" style={{ lineHeight: '23px' }}>{r.text}</div>
        </div>
      ))}
    </div>
  )
}
