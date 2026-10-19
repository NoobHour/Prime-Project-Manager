import { IBase } from '@mgmt/shared/client-server';
import { IProfile } from '@mgmt/user/api-interfaces';
import { Length } from 'class-validator';
export abstract class ICustomer extends IBase {
  slug: string;
  name: string;
  email: string;
  body: string;
  jobList: string[];
  calendar: string[];
  author: IProfile;
  phone: string;
  address: string;
  isLead: boolean;
  isActive: boolean;
  isComplete: boolean;
  // Server lifecycle flag used by customer overview cards.
  isArchived: boolean;
  avatar: string;
  level: string;
  lane: string;
  cstmrFilesShortL: string[];
}

export abstract class INewCustomer {
  @Length(1, 200)
  name: string;
  @Length(1, 255)
  email: string;
  @Length(1, 2000)
  body: string;
  jobList: string[];
  calendar: string[];
  phone: string;
  address: string;
  isLead: boolean;
  isActive: boolean;
  isComplete: boolean;
}

export abstract class IUpdateCustomer {
  @Length(1, 200)
  name: string;
  @Length(1, 255)
  email: string;
  @Length(1, 2000)
  body: string;
  jobList: string[];
  calendar: string[];
  phone: string;
  address: string;
  isLead: boolean;
  isActive: boolean;
  isComplete: boolean;
  avatar: string;
  level: string;
  lane: string;
  cstmrFilesShortL: string[];
}

export abstract class IComment extends IBase {
  body: string;
  author: IProfile;
}

export abstract class INewComment {
  @Length(1, 1000)
  body: string;
}

export abstract class IJob extends IBase {
  // Internal work has no customer at the API boundary; legacy orphans remain customer work.
  customerSlug: string | null;
  workKind: 'customer' | 'internal';
  labels: string[];
  lane: 'planned' | 'active' | 'complete' | 'archived';
  assigneeId: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  dueDate: string;
  taskList: { id: string; title: string; done: boolean }[];
  body: string;
  jobSlug: string;
  isActive: boolean;
  isComplete: boolean;
  isArchived: boolean;
  name: string;
}

export abstract class INewJob {
  customerSlug?: string;
  name: string;
}

/** Creation chooses exactly one relationship; the server validates all planning fields and creates the pair atomically. */
export type ICreateJobWorkspace = {
  job: Pick<IJob, 'name'> & Partial<Pick<IJob, 'body' | 'lane' | 'assigneeId' | 'priority' | 'dueDate' | 'taskList' | 'labels'>>;
} & (
  { customerSlug: string; customer?: never; workKind?: 'customer' } |
  { customer: Partial<INewCustomer> & { name: string }; customerSlug?: never; workKind?: 'customer' } |
  { workKind: 'internal'; customerSlug?: never; customer?: never }
);

/** Persisted workspace policy; an empty timezone means an administrator still needs to complete setup. */
export interface IWorkspaceSettings { id: number; timezone: string; terminology: 'jobs' | 'projects'; version: number; }

/** Templates contain reusable planning data only; resources and customer history never belong to a template. */
export interface IWorkTemplate { id: string; name: string; body: string; priority: IJob['priority']; checklist: string[]; dueOffset: number | null; version: number; }

/** Agenda deadlines are date-only values; appointment starts/ends are ISO instants. */
export interface IAgendaEntry { type: 'appointment' | 'deadline'; id: string; title: string; start: string; end: string; allDay: number; jobSlug: string; customerSlug: string; jobName: string; customerName: string; }

export abstract class IUpdateJob {
  customerSlug: string;
  jobSlug: string;
  isActive: boolean;
  isComplete: boolean;
  isArchived: boolean;
  name: string;
  count: number;
}

export abstract class ICalendar extends IBase {
  jobSlug: string;
  customerSlug: string;
  calendarSlug: string;
  authorId: string;
  body: string;
  subject: string;
  apptDate: string;
  start: string;
  end: string;
}

export abstract class INewCalendar {
  customerSlug: string;
  calendarSlug: string;
  authorId: string;
  body: string;
  subject: string;
  apptDate: string;
  start: string;
  end: string;
}

export abstract class IUpdateCalendar {
  customerSlug: string;
  calendarSlug: string;
  authorId: string;
  body: string;
  subject: string;
  apptDate: string;
  start: string;
  end: string;
}
export abstract class IFileSys extends IBase {
  jobSlug: string;
  customerSlug: string;
  fileSize: string;
  fileType: string;
  isArchived: boolean;
  currentDir: string;
  filePath: string;
  name: string;
}

export abstract class INewFileSys {
  jobSlug: string;
  customerSlug: string;
  currentDir: string;
  filePath: string;
  name: string;
}

export abstract class IUpdateFileSys {
  jobSlug: string;
  customerSlug: string;
  fileSize: string;
  fileType: string;
  isArchived: boolean;
  currentDir: string;
  filePath: string;
  name: string;
}
