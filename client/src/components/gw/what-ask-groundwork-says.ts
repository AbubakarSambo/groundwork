/**
 * The panel's own fixed words, from the prototype's screens (docs/prototype/screens/D1-ask-groundwork/*.txt).
 *
 * Everything that names Ask, or describes what it can do - its name, its caption, the one line
 * about adding context or documents, its greeting and its starter questions - is served by the
 * engine on `GET /ask` (`askName`, `caption`, `addLine`, `welcome`, `starters`:
 * docs/answers-from-engine.md, "Request 153", and docs/ask-definition.md). This file now keeps
 * only the one line that is not served: the privacy sentence under the "About" choice, which the
 * engine does not send as its own field (docs/ask-definition.md, "What stays private").
 */
export const PRIVATE_LINE =
  'Your questions and the answers are private. Only you see them. They are never part of your check-in or a report.'
