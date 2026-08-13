import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * THE CONFIDENCE READ EXISTED ON THE SERVER AND NOWHERE ELSE. W14-1.
 *
 * `what-a-leader-can-weigh.ts` and `harder-to-fool.ts` have been producing this for months: the
 * lead's own words for what doing well means, what the record holds against them, **the standards
 * nothing ever reached**, and where each account is thin with the thing that would settle it.
 *
 * The client rendered none of it. I then deleted `ConfDots` for being unimported - it was the
 * display half of this - which is the mistake that started this wave: unimported is not unwanted,
 * and the test to apply is whether the server still computes the thing it displays.
 *
 * THREE RULES FROM THE MODULES' OWN DESIGN NOTES, and they are the reason this is checked as
 * source rather than by rendering a fixture: each is a decision about what must NOT appear.
 */
const SRC = readFileSync(join(__dirname, 'ReportPage.tsx'), 'utf8')
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('the weigh section reaches the page', () => {
  it('renders what the ground can tell you', () => {
    expect(CODE).toContain('<WhatTheGroundCanTellYou')
    expect(CODE).toMatch(/report as any\)\.whatTheGroundCanTellYou/)
  })

  it('with the three parts, in the order the module builds them', () => {
    expect(CODE).toMatch(/What you said doing well means[\s\S]*What the record holds on that[\s\S]*What nobody has evidence for/)
  })

  it('and "what nobody has evidence for" says so rather than rendering an empty list', () => {
    // The part that earns the section: absence is invisible, so an empty list would read as
    // "nothing to see" when it means the opposite.
    expect(CODE).toMatch(/Everything you named was reached by somebody/)
  })

  it('it carries the module\'s own note, not a rewrite of it', () => {
    /**
     * `THIS_IS_MATERIAL_NOT_A_VERDICT` ships with the section. The page renders the string it is
     * given rather than paraphrasing, because a paraphrase is where the hedge gets lost.
     */
    expect(CODE).toMatch(/note=\{\(report as any\)\.whatTheGroundCanTellYouNote\}/)
  })
})

describe('the soft spots reach the page', () => {
  it('where the picture is thin, per account', () => {
    expect(CODE).toContain('<WhereTheRecordIsThin')
    expect(CODE).toMatch(/report as any\)\.softSpots/)
  })

  it('and every spot carries what would settle it', () => {
    // The service guarantees a spot never travels without `wouldRaiseIt`. The page must not
    // render one without the other, or it is a criticism with no way out.
    expect(CODE).toMatch(/What would settle it: \{s\.wouldRaiseIt\}/)
  })

  it('worded about the record, never about the person', () => {
    /**
     * `confidence-in-the-picture.ts`: "low specificity" reads as a judgement of somebody; "we are
     * not confident this part of the picture is complete" is the same fact without the verdict.
     * A record can be thin. A person cannot be thin.
     */
    expect(CODE).toMatch(/Where this picture is thin/)
    expect(CODE).toMatch(/Not a mark on anybody/)
    expect(CODE).not.toMatch(/low specificity/i)
  })
})

describe('the engine\'s own markers do not reach the reader raw', () => {
  /**
   * `[INFERRED: <reason>]` is how the engine marks something it concluded rather than heard.
   * `board/reads.ts` strips it and `conversation.service.ts` strips it before judging; the weigh
   * section did not, so the very first render of this section showed a lead:
   *
   *   "him deciding anything without checking with me first [INFERRED: Implied that success is
   *    seeing him act with independent judgment]"
   *
   * in a list headed "what you said doing well means".
   */
  it('the marker is split out of the text, at the point it is rendered', () => {
    /**
     * Asserting that the helper EXISTS is not enough - the bite-check proved it: replacing the
     * call with a pass-through left this green. A helper nothing calls is the same shape as a
     * component nothing imports, which is the mistake this whole wave started from.
     */
    expect(CODE).toMatch(/function splitInference/)
    expect(CODE).toMatch(/const \{ text, inferred \} = splitInference\(t\)/)
    expect(CODE).toMatch(/\\\[INFERRED:/)
  })

  it('and labelled rather than deleted', () => {
    /**
     * Deleting it would present an inference as a quotation, in the one section whose promise is
     * the lead's own words. The reason stays on the tag's title.
     */
    expect(CODE).toMatch(/>\s*inferred\s*</)
    expect(CODE).toMatch(/title=\{inferred\}/)
  })
})

describe('what must not appear', () => {
  it('neither section is shown to anybody but the lead', () => {
    // The service gates soft spots under `if (viewerIsLead)`, and this is the second gate.
    for (const m of [/isAdmin && \(report as any\)\.softSpots/, /isAdmin && \(report as any\)\.whatTheGroundCanTellYou/]) {
      expect(CODE).toMatch(m)
    }
  })

  it('the specificity score is not rendered anywhere on this page', () => {
    /**
     * The sharpest rule in `what-a-leader-can-weigh.ts`: specificity measures how somebody
     * WRITES, and using it as a proxy for how they work is "the quiet unfairness this product
     * exists to prevent". It belongs to the person as feedback on their own record, never to a
     * lead as a number beside their name.
     */
    expect(CODE).not.toMatch(/specificityLevel|specificityScore|specificitySignal/)
  })

  it('and nothing renders before the closing round', () => {
    /**
     * `whatALeaderCanWeigh` returns null unless `isClosing`, so the page shows this only when the
     * server sends it. Asserted as the absence of a client-side override: if this page ever
     * synthesises the section itself, that constraint is gone.
     */
    expect(CODE).not.toMatch(/whatNobodyHasEvidenceFor\s*=/)
    expect(CODE).not.toMatch(/whatALeaderCanWeigh\(/)
  })
})
