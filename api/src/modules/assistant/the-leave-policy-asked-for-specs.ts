/* Test-only; nothing in the product imports it. */
/**
 * THE LEAVE POLICY'S QUESTIONS (Hafsah, 20 November 2026), asked after who approves and before who holds each job, and Grace's plain
 * answers: only annual leave, so it stays one number of days; no notice; Monday to Friday; weekends and holidays not counted; Kenya;
 * no list of holidays drafted; no other offices; all given at the start of a January year; nothing carried over.
 */
export const THE_POLICY_ASKED = [
  'Which types of leave do you have? For example, annual, sick, compassionate, maternity, paternity, adoption and unpaid leave. You can name others too.',
  'How many days’ notice does leave need before it starts? You can say none.',
  'Which days of the week do people work? For example, Monday to Friday.',
  "When somebody's leave runs over Saturday and Sunday, do those days count as leave days?",
  'When a public holiday falls inside somebody’s leave, does it count as a leave day?',
  'Which country is your organisation in?',
  /* Changed 20 November 2026: holidays that follow the moon are not guessed (the real model put Eid al-Fitr 2027 on 9 May). */
  'Do you give the usual public holidays of Kenya? If you say yes, I will draft the list for you to check before anything is set. Holidays that follow the moon, such as Eid, are added when their dates are announced.',
  'Do you have offices in other countries, with their own public holidays? If so, name each office and its country, for example “Lagos, in Nigeria”. You can say no.',
  'Is annual leave given all at the start of the leave year, or built up each month?',
  'In which month does the leave year start? For example, January.',
  'Can people carry annual leave they have not used into the next leave year? You can say no, all of it, or up to a number of days.',
];
export const THE_POLICY = ['Only annual leave', 'None', 'Monday to Friday', 'No', 'No', 'Kenya', 'No', 'No', 'At the start', 'January', 'No'];
/** The policy said back, after the days a year, one rule a line. */
export const THE_POLICY_RULES = [
  'Leave needs no notice.',
  'People work Monday to Friday.',
  'Saturday and Sunday do not count as leave days.',
  'Public holidays do not count as leave days.',
  'Your organisation is in Kenya.',
  'The leave year starts in January.',
  'Leave is given all at the start of the leave year.',
  'Leave that is not used by the end of the leave year is not carried over.',
  'You have no offices in other countries.',
];
export const THE_POLICY_SAID = THE_POLICY_RULES.join(' ');

