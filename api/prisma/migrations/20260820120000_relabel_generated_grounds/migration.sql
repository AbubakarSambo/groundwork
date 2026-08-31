-- Nineteen of twenty-two ground labels were written by a generator that fell back to the raw
-- scenario enum: "NEW HIRE ground", "PIP ground", "COHORT CHECK ground". That label is interpolated
-- into the participant invite subject, so a person on a performance plan received an email headed
-- "Sahar Okonkwo invited you to check in on: PIP ground".
--
-- The generator is fixed. This repairs the rows it already wrote.
--
-- MATCHED NARROWLY, on the generator's exact shape: capitals, then the literal word " ground".
-- Anything somebody typed themselves is left alone - three rows here are typed test labels and are
-- untouched. Replacement text is the label from the situation card the person actually chose, so the
-- new subject line uses the product's own words.
--
-- PIP DELIBERATELY DOES NOT BECOME "Performance improvement plan", which is its card label. This
-- string lands in a subject line read by the person being reviewed, and participant-facing copy does
-- not carry "performance". It becomes the reframed wording the card list itself now uses.
UPDATE "grounds" SET "label" = CASE "scenario"
  WHEN 'NEW_HIRE'         THEN 'New hire'
  WHEN 'NEW_PROJECT'      THEN 'New project'
  WHEN 'NEW_ADVISOR'      THEN 'New advisor or board member'
  WHEN 'NEW_COFOUNDER'    THEN 'A new partner or co-founder'
  WHEN 'NEW_MANAGER'      THEN 'A new manager taking over'
  WHEN 'CONTRACT_RENEWAL' THEN 'Contract or renewal'
  WHEN 'RECOGNITION'      THEN 'Raise, promotion, or recognition'
  WHEN 'OKR_ALIGNMENT'    THEN 'Goals and planning'
  WHEN 'WORKPLAN_BUDGET'  THEN 'Workplan and budget'
  WHEN 'BOARD_STRATEGY'   THEN 'Board and leadership strategy'
  WHEN 'PULSE_CHECK'      THEN 'A regular read on live work'
  WHEN 'REALIGN_TEAM'     THEN 'Getting the team back on the same page'
  WHEN 'COHORT_CHECK'     THEN 'Many people in the same role'
  WHEN 'ACUTE_SHOCK'      THEN 'A shock just hit'
  WHEN 'DRIFT'            THEN 'Something is off track'
  WHEN 'PIP'              THEN 'Work that is off track'
  ELSE "label"
END
WHERE "label" ~ '^[A-Z][A-Z ]* ground$';
