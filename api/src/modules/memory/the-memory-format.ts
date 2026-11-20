import { createHash } from 'crypto';

/**
 * THE FORM OF A MEMORY FILE (docs/groundwork-memory-system.md, sections 3 and 8). Pure: no database here.
 *
 * A file is a header (its front matter) and sections. Each section says who reads it, and each statement in it cites what it rests on
 * and says "as of" when. A statement with no citation is not a statement: `checkTheFile` refuses the file, so no writer can store one.
 * The Markdown a person or an agent reads is rendered from the sections THAT READER MAY READ (`renderFor`); nothing is stored as one
 * block, so there is no copy of a private section sitting inside a file everybody can open.
 */

export type MemoryKind = 'org' | 'team' | 'person' | 'project';

/**
 * WHO READS A SECTION. A fixed set, decided in code from what the section holds, never by a model (privacy is a fixed rule).
 *   everyone       anybody in the organisation
 *   leaders        an admin, or anybody who runs a check-in here (the rule for what the organisation has kept: mayReadWhatIsKept)
 *   admin          an admin of the organisation
 *   team           the people on that check-in, and whoever runs it
 *   lead           whoever runs that check-in (its lead, or the admin who set it up for them), never every admin
 *   person         the person the file is about
 *   project-people the people named on the project
 */
export type ReaderKind = 'everyone' | 'leaders' | 'admin' | 'team' | 'lead' | 'person' | 'project-people';

/** A citation: `a:<check-in id>` is that check-in's assessment; `r:<table>:<id>` is a row of the record. */
export type Cite = string;

export interface AStatement {
  text: string;
  cites: Cite[];
  /** The day it was true, YYYY-MM-DD. */
  asOf: string;
}

export interface ASection {
  key: string;
  title: string;
  readers: ReaderKind[];
  statements: AStatement[];
}

/** What the file is about, and where its readers are found. */
export interface TheScope {
  groundId?: string;
  participantId?: string;
  /** Sign-in ids, for a project's people. */
  userIds?: string[];
}

export interface TheHeader {
  subject: { kind: MemoryKind; id: string | null; label: string };
  scope: TheScope;
  writer: 'the memory writer';
  version: number;
  updatedAt: string;
  /** The assessments and rows it was built from. */
  builtFrom: Cite[];
  /** When it should next be checked: a week after it was built. */
  reviewBy: string;
  /** True once the person has left: the file keeps its header and nothing else. */
  retired?: boolean;
}

export interface AMemoryFile {
  path: string;
  kind: MemoryKind;
  header: TheHeader;
  sections: ASection[];
}

/** What a builder makes, before the writer gives it a version. */
export type AFileToWrite = Omit<AMemoryFile, 'header'> & { header: Omit<TheHeader, 'version' | 'updatedAt' | 'reviewBy'> };

export const pathOf = (kind: MemoryKind, id?: string | null): string => (kind === 'org' ? 'org.md' : `${kind}/${id}.md`);

export const theDay = (d: Date) => d.toISOString().slice(0, 10);

const CITE = /^(a:[\w-]+|r:[a-z-]+:[\w-]+)$/;

/** The one check that stands between a builder and the database: a header that fits, and every statement cited. Returns what is wrong. */
export function checkTheFile(f: AFileToWrite): string[] {
  const wrong: string[] = [];
  if (!f.path || f.path !== pathOf(f.kind, f.header.subject.id)) wrong.push(`The path ${f.path} is not the path of a ${f.kind} file.`);
  if (!f.header.subject?.label) wrong.push('The header has no subject.');
  if (f.header.writer !== 'the memory writer') wrong.push('The header does not name its writer.');
  if (!Array.isArray(f.header.builtFrom)) wrong.push('The header does not say what it was built from.');
  for (const s of f.sections) {
    if (!s.readers.length) wrong.push(`The section "${s.key}" says nobody reads it.`);
    for (const st of s.statements) {
      if (!st.text.trim()) wrong.push(`The section "${s.key}" has an empty statement.`);
      if (!st.cites.length) wrong.push(`A statement in "${s.key}" cites nothing: ${st.text.slice(0, 60)}`);
      for (const c of st.cites) if (!CITE.test(c)) wrong.push(`A statement in "${s.key}" cites ${c}, which is not an assessment or a row.`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(st.asOf)) wrong.push(`A statement in "${s.key}" has no "as of" day.`);
    }
  }
  return wrong;
}

/**
 * A fingerprint of everything a file was built from. The same record again gives the same one, so a rebuild that finds nothing new writes
 * nothing. The "as of" days are left out on purpose: a statement is as of the day its evidence was last read, and a file must not become a
 * new version every day only because the day changed. Freshness is the header's `reviewBy`, which the writer acts on.
 */
export function fingerprintOf(f: Pick<AFileToWrite, 'sections' | 'header'>): string {
  const sections = f.sections.map((s) => ({ ...s, statements: s.statements.map(({ text, cites }) => ({ text, cites })) }));
  const body = JSON.stringify({ subject: f.header.subject, scope: f.header.scope, retired: !!f.header.retired, builtFrom: [...f.header.builtFrom].sort(), sections });
  return createHash('sha256').update(body).digest('hex').slice(0, 32);
}

/** One line for the catalogue: what the book is, where it is, how fresh. Never the contents. */
export function catalogueLine(f: Pick<AMemoryFile, 'path' | 'kind' | 'header'>, readableSections: number): string {
  const what = f.kind === 'org' ? 'The organisation' : f.kind === 'team' ? 'A team' : f.kind === 'person' ? 'A person' : 'A project';
  return `${f.path}: ${what}, ${f.header.subject.label}. Version ${f.header.version}, updated ${f.header.updatedAt.slice(0, 10)}, check by ${f.header.reviewBy}. ${readableSections} ${readableSections === 1 ? 'section' : 'sections'} you may read.`;
}

/** Markdown of a file, from the sections the caller has already filtered to what the reader may read. */
export function renderFor(f: Pick<AMemoryFile, 'path' | 'header'>, sections: ASection[]): string {
  const h = f.header;
  const lines = [
    '---',
    `subject: ${h.subject.label}`,
    `kind: ${h.subject.kind}`,
    `version: ${h.version}`,
    `updated: ${h.updatedAt.slice(0, 10)}`,
    `written by: ${h.writer}`,
    `built from: ${h.builtFrom.length} ${h.builtFrom.length === 1 ? 'source' : 'sources'}`,
    `check by: ${h.reviewBy}`,
    '---',
    '',
    `# ${h.subject.label}`,
  ];
  if (h.retired) lines.push('', 'This person has left, so nothing more is kept here.');
  for (const s of sections) {
    if (!s.statements.length) continue;
    lines.push('', `## ${s.title}`, '');
    for (const st of s.statements) lines.push(`- ${st.text} (as of ${st.asOf}; from ${st.cites.join(', ')})`);
  }
  return lines.join('\n') + '\n';
}

/** About four characters to a token: enough to compare how much one way of reading hands over against another. */
export const roughTokens = (s: string) => Math.ceil(s.length / 4);

/** What the assistant is handed from a book: the sections' statements and when each was true, with no header and no citations to read aloud. */
export function renderForTheAssistant(f: Pick<AMemoryFile, 'header'>, sections: ASection[]): string {
  const lines: string[] = [];
  for (const s of sections) {
    if (!s.statements.length) continue;
    lines.push(`${s.title}`);
    for (const st of s.statements) lines.push(`- ${st.text} (as of ${st.asOf})`);
    lines.push('');
  }
  return lines.join('\n').trim();
}
