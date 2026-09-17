-- THE COACHING FLOOR'S OWN SENTENCES, REWRITTEN, AND THE HISTORY THAT MATCHES ON THEM.
--
-- The five universal behaviours were read back as "Yoda": a long clause first, an abstract noun
-- where a person should be, the point last. They are the lines MOST people get - 93% of people on
-- record have no confident role map - so they are the product's coaching voice for almost everybody.
--
-- WHY THIS IS A MIGRATION AND NOT JUST AN EDIT. Recurrence is matched on the STORED text: a step is
-- offered when the same `noticed` string appears in two distinct sessions. Change the wording in
-- code alone and every person's history stops matching their next session, so everybody who was one
-- session away from a step goes back to zero, silently.
--
-- Old text to new, in both places it is kept: `observations` (the array recurrence reads) and
-- `last_input` (what the last session decided, kept for reading). Safe to run twice.
UPDATE "coaching_states"
SET "observations" = REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE("observations"::text,
              'The things you named did not come with a date, a number or a name attached, so there is nothing in them anybody could check later.',
              'Nothing you named has a date, a number or a name on it, so nobody can check any of it later.'),
            'Several things were described as being considered or looked at, and none of them was described as decided.',
            'You said several things were being considered. You did not say that any of them had been decided.'),
          'What you did came through, and what changed because of it did not - so somebody reading this cannot tell what is different now.',
          'You said what you did. You did not say what changed because of it, so nobody can tell what is different now.'),
        'The work that went right and the trouble you headed off are not in your own account, so the only record of them is somebody else happening to mention it.',
        'What went well, and the trouble you stopped, are missing from your own account. The only record of them is somebody else mentioning it.'),
      'Something you were waiting on went quiet and the account moves on without saying what you did about it.',
      'Something you were waiting on went quiet, and you did not say what you did about it.')::jsonb
WHERE "observations" IS NOT NULL;

-- The same five, and the five destinations, wherever the last session's decision kept them.
UPDATE "coaching_states"
SET "last_input" = REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE("last_input"::text,
              'Each thing you name carries the one detail that would let somebody else tell whether it happened.',
              'Put one detail on each thing you name, so somebody else can tell whether it happened.'),
            'Each thing you did is followed by what somebody else can do now that they could not before.',
            'After each thing you did, say what somebody else can do now that they could not before.'),
          'What worked, and what you prevented, are in your account in your own words rather than waiting to be noticed.',
          'Say what worked and what you stopped, in your own words, instead of waiting for somebody to notice.'),
        'When a thing stalls, what you tried next is part of the account - including when the answer is that you decided to leave it.',
        'When something stalls, say what you tried next. Saying you left it is an answer.'),
      'The things you named did not come with a date, a number or a name attached, so there is nothing in them anybody could check later.',
      'Nothing you named has a date, a number or a name on it, so nobody can check any of it later.')::jsonb
WHERE "last_input" IS NOT NULL;

-- And the step somebody is holding right now, which is one of the destinations above.
UPDATE "coaching_states"
SET "current_step" = CASE "current_step"
  WHEN 'Each thing you name carries the one detail that would let somebody else tell whether it happened.'
    THEN 'Put one detail on each thing you name, so somebody else can tell whether it happened.'
  WHEN 'The ones that are yours to call get called, and the ones that are not get named as somebody else''s with a date on them.'
    THEN 'Decide the ones that are yours to decide. For the rest, say whose they are and by when.'
  WHEN 'Each thing you did is followed by what somebody else can do now that they could not before.'
    THEN 'After each thing you did, say what somebody else can do now that they could not before.'
  WHEN 'What worked, and what you prevented, are in your account in your own words rather than waiting to be noticed.'
    THEN 'Say what worked and what you stopped, in your own words, instead of waiting for somebody to notice.'
  WHEN 'When a thing stalls, what you tried next is part of the account - including when the answer is that you decided to leave it.'
    THEN 'When something stalls, say what you tried next. Saying you left it is an answer.'
  ELSE "current_step"
END
WHERE "current_step" IS NOT NULL;
