import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { JobService, CustomerService } from '@mgmt/customer/api/shared';
import { EntityManager } from 'typeorm';
import { date, paging, text } from '@mgmt/shared/api/validations/src/lib/input';
import { validTimezone, wallTime } from '@mgmt/shared/common/src/lib/workspace-time';

// All authenticated staff share this workspace. These predicates also exclude invalid legacy parent relationships.
export const visibleJob = `j.deletedDate IS NULL AND j.isArchived=0 AND ((j.workKind='internal' AND j.customerSlug='') OR (j.workKind='customer' AND c.slug=j.customerSlug AND c.deletedDate IS NULL AND c.isArchived=0))`;

@Injectable()
export class WorkspaceService {
  /** Accepts the job and customer repositories; provides common scope, settings and agenda rules. */
  constructor(public jobs: JobService, private customers: CustomerService) {}
  /** Accepts no input; returns the single persisted workspace-settings record. */
  async settings() { return (await this.jobs.repository.manager.query('SELECT * FROM workspace_settings WHERE id=1'))[0]; }
  /** Accepts versioned settings; validates the explicit timezone and returns the saved record. */
  async saveSettings(data: any) {
    let timezone: string;
    try { timezone = validTimezone(text(data.timezone, 'Timezone', 100, true)); }
    catch { throw new BadRequestException('Choose a valid IANA timezone, such as America/Chicago.'); }
    if (!['jobs', 'projects'].includes(data.terminology)) throw new BadRequestException('Choose Jobs/Customers or Projects/Contacts.');
    const manager = this.jobs.repository.manager;
    const changed = await manager.query('UPDATE workspace_settings SET timezone=?, terminology=?, version=version+1 WHERE id=1 AND version=? RETURNING version', [timezone, data.terminology, data.version]);
    if (!changed.length) throw new ConflictException('Workspace settings changed. Reload before saving.');
    return this.settings();
  }
  /** Accepts no input; returns the chosen timezone or a setup-required conflict instead of inheriting the server timezone. */
  async timezone() {
    const settings = await this.settings();
    if (!settings.timezone) throw new ConflictException('An administrator must choose the workspace timezone in Workspace settings.');
    return settings.timezone as string;
  }
  /** Accepts an optional instant; returns the workspace's date-only Today or null until timezone setup is complete. */
  async today(instant = new Date()) {
    const settings = await this.settings();
    return settings.timezone ? wallTime(instant, settings.timezone).slice(0, 10) : null;
  }
  /** Accepts a customer/team identity and optional job; returns a validated resource scope, never converting legacy orphans into internal work. */
  async scope(customerSlug: string, jobSlug = '', discussion = false) {
    if (customerSlug === '__team__') {
      if (!discussion || jobSlug) throw new BadRequestException('Team scope supports general discussion only.');
      return { customerSlug, jobSlug: '', archived: false };
    }
    const job = jobSlug ? await this.jobs.findOne({ jobSlug }) : null;
    if (jobSlug && (!job || job.customerSlug !== customerSlug)) throw new BadRequestException('Job does not belong to this customer.');
    if (!customerSlug) {
      if (!job || job.workKind !== 'internal') throw new BadRequestException('Choose a valid customer or internal project.');
      return { customerSlug: '', jobSlug, archived: job.isArchived };
    }
    const customer = await this.customers.findOne({ slug: customerSlug });
    if (!customer || (job && job.workKind !== 'customer')) throw new NotFoundException('Customer not found.');
    return { customerSlug, jobSlug, archived: customer.isArchived || !!job?.isArchived };
  }
  /** Accepts a job identity; resolves its stored relationship for job-first resource endpoints. */
  async jobScope(jobSlug: string) {
    const job = await this.jobs.findOne({ jobSlug });
    if (!job) throw new NotFoundException('Job not found.');
    return this.scope(job.customerSlug, jobSlug);
  }
  /** Accepts an explicit instant range and optional scope/type filters; returns one bounded page of overlapping appointments and computed deadlines. */
  async agenda(query: any) {
    const zone = await this.timezone();
    const from = date(query.from), to = date(query.to);
    if (to <= from || Date.parse(to) - Date.parse(from) > 93 * 86400000) throw new BadRequestException('Choose an increasing range of at most 93 days.');
    const page = paging(query);
    const customer = text(query.customerSlug || '', 'Customer', 100);
    const job = text(query.jobSlug || '', 'Job', 100);
    if (query.type && !['appointment', 'deadline'].includes(query.type)) throw new BadRequestException('Invalid event type.');
    const startDay = wallTime(from, zone).slice(0, 10), endDay = wallTime(to, zone).slice(0, 10);
    const sql = `SELECT * FROM (
      SELECT 'appointment' AS type,a.calendarSlug AS id,a.subject AS title,a.start,a.end,0 AS allDay,a.jobSlug,a.customerSlug,COALESCE(j.name,'') AS jobName,COALESCE(c.name,'Internal project') AS customerName
      FROM calendar a LEFT JOIN job j ON j.jobSlug=a.jobSlug LEFT JOIN customer c ON c.slug=a.customerSlug
      WHERE a.deletedDate IS NULL AND a.start<? AND a.end>? AND ((a.jobSlug='' AND c.slug IS NOT NULL AND c.isArchived=0 AND c.deletedDate IS NULL) OR (a.jobSlug<>'' AND j.customerSlug=a.customerSlug AND ${visibleJob}))
      UNION ALL
      SELECT 'deadline',j.jobSlug,j.name,j.dueDate,j.dueDate,1,j.jobSlug,j.customerSlug,j.name,COALESCE(c.name,'Internal project')
      FROM job j LEFT JOIN customer c ON c.slug=j.customerSlug WHERE ${visibleJob} AND j.isComplete=0 AND j.dueDate>=? AND j.dueDate<?
    ) WHERE (?='' OR customerSlug=?) AND (?='' OR jobSlug=?) AND (?='' OR type=?)`;
    const values = [to, from, startDay, endDay, customer, customer, job, job, query.type || '', query.type || ''];
    const manager = this.jobs.repository.manager;
    const total = (await manager.query(`SELECT count(*) AS count FROM (${sql})`, values))[0].count;
    const listData = await manager.query(sql + ' ORDER BY start,type,id LIMIT ? OFFSET ?', [...values, page.take, page.skip]);
    return { success: true, listData, total, timezone: zone };
  }
  /** Accepts a transaction, old/new job and actor; appends structured changes atomically with the corresponding write. */
  async changes(manager: EntityManager, before: any, after: any, actorId: string) {
    for (const key of ['lane', 'assigneeId', 'dueDate']) {
      if ((before?.[key] || '') === (after[key] || '')) continue;
      await manager.query('INSERT INTO work_event(jobSlug,actorId,kind,beforeValue,afterValue,recipientId,createdAt) VALUES(?,?,?,?,?,?,?)', [after.jobSlug, actorId, key, before?.[key] || '', after[key] || '', key === 'assigneeId' ? after.assigneeId || '' : '', new Date().toISOString()]);
    }
  }
}
