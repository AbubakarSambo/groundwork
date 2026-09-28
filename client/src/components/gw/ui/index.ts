/**
 * THE SHARED PARTS (design-audit.md section 4), one barrel so a rebuilt screen imports from one
 * place: `import { Page, PageTitle, ... } from '@/components/gw/ui'`.
 */
export { Page } from './Page'
export { PageTitle, type Crumb } from './PageTitle'
export { CheckInHeader, CHECK_IN_TABS, type CheckInTabKey } from './CheckInHeader'
export { Tabs, type TabItem } from './Tabs'
export { Section } from './Section'
export { Panel } from './Panel'
export { EdgeRow, EdgeList, type EdgeKind } from './EdgeRow'
export { PeopleTable, PeopleTableHead, PersonRow, PersonCell, PEOPLE_NAME_COLUMN } from './PeopleTable'
export { Avatar } from './Avatar'
export { FieldRows, FieldRow } from './FieldRow'
export { Choices, type Choice } from './Choices'
export { ChoiceCards, type ChoiceCard } from './ChoiceCards'
export { Toggle } from './Toggle'
export { FieldLabel, TextField, TextArea, Select } from './FormFields'
export { Button, type ButtonKind } from './Button'
export { Tag, type TagTone } from './Tag'
export { Note, Empty } from './NoteEmpty'
export { Toast } from './Toast'
export { Modal } from './Modal'
