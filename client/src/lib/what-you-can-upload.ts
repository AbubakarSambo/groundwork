/**
 * ONE LIST OF WHAT YOU CAN UPLOAD, BECAUSE THERE WERE THREE.
 *
 * Found while working through the Context page. The same question - what can I attach - had three
 * different answers depending on which screen you were standing on:
 *
 *   the API                 PDF, TXT, CSV, HTML, code/text, DOCX, XLSX, JPEG, PNG, HEIC
 *   the lead's page         PDF, DOCX, JPEG, PNG, CSV, XLSX
 *   a participant's page    PDF, DOCX, JPEG, PNG
 *
 * Each was written when its own screen was, none was wrong when written, and nothing reconciled
 * them. The cost falls on the person with the file: a participant holding meeting notes as a .txt
 * reads "PDF, DOCX, JPEG, PNG" and does not try.
 *
 * HEIC IS THE ONE THAT MATTERS MOST, and neither screen mentioned it. It is what an iPhone camera
 * produces, the API has always accepted it, and a photographed whiteboard or a snapshot of a signed
 * page is exactly the context this page exists to collect. People were being told they could not do
 * the thing the product is best at.
 *
 * Kept in step by `what-you-can-upload.spec.ts`, which reads the API's own list and fails if the two
 * drift. A constant shared between two client pages solves half the problem; the half that caused
 * this is the gap across the two packages.
 */
/*
 * POWERPOINT WAS THE SIXTH ANSWER, AND THE API HAD ACCEPTED IT ALL ALONG.
 *
 * "I should be able to add ppt." The server has parsed `.pptx` for a long time - it unzips the
 * deck and reads every run of text off the slides, and it even tells somebody holding an older
 * `.ppt` to save it as `.pptx` and try again. Neither the sentence nor the file picker mentioned
 * it, which is the exact failure this file was written to end: a format the product supports,
 * refused by an attribute on the way in.
 *
 * A deck is often the only written thing that exists at the start of a piece of work.
 */
export const WHAT_YOU_CAN_UPLOAD = 'PDF, Word, PowerPoint, Excel, CSV, text or code, and photos (JPEG, PNG, HEIC)'

/** The same thing said shorter, for places with one line to spend. */
export const WHAT_YOU_CAN_UPLOAD_SHORT = 'PDF, Word, PowerPoint, Excel, text, or a photo'

/**
 * THE LIST THE FILE PICKER ITSELF ENFORCES, and the one that actually stopped people.
 *
 * The two pages carried a fourth and fifth answer here - `.pdf,.docx,.jpeg,.jpg,.png,.csv,.xlsx` on
 * one and `.pdf,.docx,.jpeg,.jpg,.png` on the other - so the copy could promise a format the picker
 * then greyed out. Worse than a wrong sentence: the file is on screen, in the dialog, and cannot be
 * chosen.
 *
 * `.heic` is the one that mattered. An iPhone photo of a whiteboard was refused by an attribute
 * while the server had accepted it all along.
 */
export const UPLOAD_ACCEPT_ATTR =
  '.pdf,.doc,.docx,.pptx,.xls,.xlsx,.csv,.txt,.md,.html,.json,.xml,.jpeg,.jpg,.png,.heic'
