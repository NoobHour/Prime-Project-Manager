import { zipFiles } from '@mgmt/shared/api/config/src/lib/zip';
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Like, Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { jobLifecycle } from './job-lifecycle';
import { WorkspaceService } from './workspace.service';
import {
  CustomerService,
  Customer,
  Comment,
  Job,
  JobService,
  CalendarService,
  CommentService,
  FileSysService,
} from '@mgmt/customer/api/shared';
import { UserService } from '@mgmt/user/api/shared';
import {
  text,
  email,
  richText,
  date,
  paging,
} from '@mgmt/shared/api/validations/src/lib/input';

/** Customer routes backed by TypeORM feature services. */
@Controller()
export class CustomerApiHandlersController {
  /** Accepts the feature services; keeps customer, job, calendar and file responsibilities separate. */
  constructor(
    private customers: CustomerService,
    private jobs: JobService,
    private calendars: CalendarService,
    private comments: CommentService,
    private files: FileSysService,
    private users: UserService,
    private workspace: WorkspaceService,
  ) {}
  /** Accepts a slug; returns its customer or a safe not-found response. */
  private async customer(slug: string) {
    const row = await this.customers.findOne({ slug });
    if (!row) throw new NotFoundException('Customer not found.');
    return row;
  }
  /** Accepts a customer and optional job slug; returns a validated association or rejects a job from another customer. */
  private async jobAssociation(customerSlug: string, value: any) {
    const jobSlug = text(value ?? '', 'Job', 100);
    await this.workspace.scope(customerSlug, jobSlug);
    return jobSlug;
  }
  /** Accepts a customer/team identity and optional job; returns a valid board association without allowing team messages into jobs. */
  private async discussionJob(customerSlug: string, value: any) {
    if (customerSlug === '__team__') {
      if (value) throw new BadRequestException('Team messages cannot belong to a job.');
      return '';
    }
    return this.jobAssociation(customerSlug, value);
  }
  /** Accepts a routed job and optional submitted scope; returns its validated parent, rejecting mismatched associations. */
  private async routedScope(jobSlug: string, supplied?: string) {
    if (supplied !== undefined && supplied !== jobSlug) throw new BadRequestException('Resource scope must match the routed job.');
    return this.workspace.jobScope(jobSlug);
  }
  /** Accepts a job and page; returns only that job's discussion, including internal projects. */
  @Get('jobs/:jobSlug/comments') async jobComments(@Param('jobSlug') jobSlug: string, @Query() query: any) {
    const scope = await this.routedScope(jobSlug, query.jobSlug);
    return this.listComments(scope.customerSlug, { ...query, jobSlug });
  }
  /** Accepts a job, author and message; posts to the job's validated resource scope. */
  @Post('jobs/:jobSlug/comments') async postJobComment(@Param('jobSlug') jobSlug: string, @Req() req: any, @Body() data: any) {
    const scope = await this.routedScope(jobSlug, data.jobSlug);
    return this.createComment(req, scope.customerSlug, { ...data, jobSlug });
  }
  /** Accepts a job, message identity and versioned text; edits only a message from that exact job. */
  @Put('jobs/:jobSlug/comments/:id') async editJobComment(@Param('jobSlug') jobSlug: string, @Param('id') id: string, @Req() req: any, @Body() data: any) {
    const scope = await this.routedScope(jobSlug);
    if (!(await this.comments.findOne({ id, jobSlug }))) throw new NotFoundException();
    return this.editComment(req, scope.customerSlug, id, data);
  }
  /** Accepts a job, message identity and author; removes only a message from that exact job. */
  @Delete('jobs/:jobSlug/comments/:id') async removeJobComment(@Param('jobSlug') jobSlug: string, @Param('id') id: string, @Req() req: any) {
    const scope = await this.routedScope(jobSlug);
    if (!(await this.comments.findOne({ id, jobSlug }))) throw new NotFoundException();
    return this.deleteComment(req, scope.customerSlug, id);
  }
  /** Accepts a job and page; returns its appointments without requiring a customer record. */
  @Get('jobs/:jobSlug/calendar') async jobEvents(@Param('jobSlug') jobSlug: string, @Query() query: any) {
    const scope = await this.routedScope(jobSlug, query.jobSlug);
    return this.events(scope.customerSlug, { ...query, jobSlug });
  }
  /** Accepts a job, author and appointment; validates and creates a job-owned appointment. */
  @Post('jobs/:jobSlug/calendar') async postJobEvent(@Param('jobSlug') jobSlug: string, @Req() req: any, @Body() data: any) {
    const scope = await this.routedScope(jobSlug, data.jobSlug);
    return this.createEvent(req, scope.customerSlug, { ...data, jobSlug });
  }
  /** Accepts a job and metadata filters; returns a bounded page of only that job's files. */
  @Get('jobs/:jobSlug/files') async jobFiles(@Param('jobSlug') jobSlug: string, @Query() query: any) {
    const scope = await this.routedScope(jobSlug, query.jobSlug);
    return this.listFiles(scope.customerSlug, { ...query, jobSlug });
  }
  /** Accepts a job; returns tags from that job's visible file metadata. */
  @Get('jobs/:jobSlug/file-tags') async jobFileTags(@Param('jobSlug') jobSlug: string) {
    const scope = await this.routedScope(jobSlug);
    return this.availableFileTags(scope.customerSlug, { jobSlug });
  }
  /** Accepts a job and selected IDs; streams a ZIP only when every selected file belongs to the routed job. */
  @Post('jobs/:jobSlug/files/download') async downloadJobFiles(@Param('jobSlug') jobSlug: string, @Body() data: any, @Res() res: any) {
    const scope = await this.routedScope(jobSlug);
    return this.downloadFiles(scope.customerSlug, data, res, jobSlug);
  }
  /** Accepts a routed job, authenticated author and bounded multipart upload; stores bytes under the validated job scope. */
  @Post('jobs/:jobSlug/files')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 4 } }))
  async uploadJobFile(@Param('jobSlug') jobSlug: string, @Req() req: any, @UploadedFile() file: any, @Body() data: any) {
    const scope = await this.routedScope(jobSlug, data.jobSlug);
    return this.upload(req, scope.customerSlug, file, { ...data, jobSlug });
  }
  /** Accepts a tag array or multipart JSON string; returns bounded, normalized unique tags or a safe validation error. */
  private fileTags(value: any) {
    if (typeof value === 'string') {
      try { value = JSON.parse(value); }
      catch { throw new BadRequestException('Tags must be a list of text labels.'); }
    }
    if (!Array.isArray(value) || value.length > 20)
      throw new BadRequestException('Use at most 20 tags per file.');
    return [...new Set<string>(value.map((tag) => text(tag, 'Tag', 200, true).normalize('NFC').trim().toLowerCase()))];
  }
  /** Accepts submitted version and current row; rejects stale edits. */
  private version(data: any, row: any) {
    if (data.version !== row.version)
      throw new ConflictException('This record changed. Reload before saving.');
  }
  /** Accepts request and owned row; permits author or administrator removal. */
  private author(req: any, row: any) {
    if (row.authorId !== req.user.id && req.user.role !== 'admin')
      throw new ForbiddenException(
        'Only the author or an administrator may remove this item.',
      );
  }
  /** Accepts customer editor values; returns a whitelist of normalized writable properties. */
  private customerFields(data: any) {
    return {
      name: text(data.name, 'Name', 200, true),
      email: email(data.email, true),
      phone: text(data.phone ?? '', 'Phone', 80),
      address: text(data.address ?? '', 'Address', 500),
      body: richText(data.body),
      isLead: data.isLead === true,
      isActive: data.isActive === true,
      isComplete: data.isComplete === true,
      isArchived: data.isArchived === true,
    };
  }
  /** Accepts query filters; returns bounded customers with a single batched author lookup. */
  @Get('customers') async list(@Query() query: any) {
    const where: any = {};
    for (const key of ['isLead', 'isActive', 'isComplete', 'isArchived'])
      if (query[key] !== undefined) {
        if (!['true', 'false'].includes(String(query[key])))
          throw new BadRequestException('Invalid status filter.');
        where[key] = query[key] === 'true';
      }
    if (query.search || query.q)
      where.name = Like(
        '%' + text(query.search || query.q, 'Search', 200) + '%',
      );
    if (query.author) {
      const author = await this.users.findOne({ username: query.author });
      if (!author) return { success: true, listData: [], total: 0 };
      where.authorId = author.id;
    }
    const [rows, total] = await this.customers.repository.findAndCount({
      where,
      ...paging(query),
      order: { createdAt: 'DESC' },
    });
    const authors = await this.users.findAll();
    return {
      success: true,
      total,
      listData: rows.map((row) => ({
        ...row,
        author: this.users.profile(
          authors.find((user) => user.id === row.authorId),
        ),
      })),
    };
  }
  /** Accepts a customer slug; returns its record, author and normalized related job list. */
  @Get('customers/:slug') async detail(@Param('slug') slug: string) {
    const row = await this.customer(slug);
    const jobs = await this.jobs.findAll({
      where: { customerSlug: slug },
      order: { createdAt: 'ASC' },
    });
    return {
      success: true,
      detailData: {
        ...row,
        jobList: jobs.map((job) => job.name),
        author: this.users.profile(
          await this.users.findOne({ id: row.authorId }),
        ),
      },
    };
  }
  /** Accepts new customer fields; returns the persisted customer with a collision-resistant slug. */
  @Post('customers') async create(@Req() req: any, @Body() data: any) {
    const row = this.customers.repository.create({
      ...this.customerFields(data),
      slug: randomUUID(),
      authorId: req.user.id,
      jobList: [],
      calendar: [],
      cstmrFilesShortL: [],
    });
    return { success: true, data: await this.customers.repository.save(row) };
  }
  /** Accepts slug and versioned customer fields; updates only the selected record. */
  @Put('customers/:slug') async update(
    @Param('slug') slug: string,
    @Body() data: any,
  ) {
    const row = await this.customer(slug);
    this.version(data, row);
    const changed = await this.customers.repository.update(
      { id: row.id, version: data.version },
      { ...this.customerFields(data), version: row.version + 1 },
    );
    if (!changed.affected)
      throw new ConflictException('Customer changed. Reload before saving.');
    return { success: true, data: await this.customer(slug) };
  }
  /** Accepts customer identity; archives rather than removing customer history. */
  @Delete('customers/:slug') async archive(@Param('slug') slug: string, @Body() data: any) {
    const row = await this.customer(slug);
    this.version(data, row);
    const changed = await this.customers.repository.update(
      { id: row.id, version: row.version },
      { isArchived: true, version: row.version + 1 },
    );
    if (!changed.affected) throw new ConflictException('Customer changed. Reload before archiving.');
    return { success: true, data: null };
  }
  /** Accepts customer slug and page; returns jobs attached to that customer. */
  @Get('customers/:slug/jobs') async listJobs(
    @Param('slug') slug: string,
    @Query() query: any,
  ) {
    await this.customer(slug);
    const [listData, total] = await this.jobs.repository.findAndCount({
      where: { customerSlug: slug },
      ...paging(query),
      order: { createdAt: 'ASC' },
    });
    return { success: true, listData, total };
  }
  /** Accepts board status; returns active or completed jobs with their customer labels. */
  @Get('jobs') async board(@Query() query: any, @Req() req?: any) {
    const today = await this.workspace.today();
    if ((query.overdue === 'true' || query.attention === 'true' || query.dueSoon === 'true') && !today)
      throw new ConflictException('Choose the workspace timezone before using date-relative views.');
    const qb = this.jobs.repository
      .createQueryBuilder('job')
      .leftJoin('customer', 'customer', 'customer.slug=job.customerSlug')
      .where("((job.workKind='internal' AND job.customerSlug='') OR (job.workKind='customer' AND customer.slug IS NOT NULL))")
      .andWhere(query.archived === 'true' ? '(customer.isArchived=1 OR job.isArchived=1)' : '(customer.isArchived=0 OR job.workKind=\'internal\') AND job.isArchived=0');
    if (query.archived !== 'true') {
      if (query.complete === 'true') qb.andWhere('job.isComplete=1');
      else qb.andWhere('job.isComplete=0');
    }
    if (query.attention === 'true')
      qb.andWhere(
        "(job.priority='urgent' OR (job.dueDate<>'' AND job.dueDate<:attentionToday))",
        { attentionToday: today },
      );
    if (query.lane) {
      if (!['planned', 'active', 'complete'].includes(query.lane))
        throw new BadRequestException('Invalid status filter.');
      qb.andWhere('job.lane=:lane', { lane: query.lane });
    }
    if (query.assignee)
      qb.andWhere('job.assigneeId=:assignee', {
        assignee: text(query.assignee, 'Assignee', 100),
      });
    if (query.scope === 'mine') qb.andWhere('job.assigneeId=:currentUser', { currentUser: req.user.id });
    if (query.scope === 'unassigned') qb.andWhere("job.assigneeId=''");
    if (query.dueSoon === 'true') qb.andWhere("job.dueDate<>'' AND job.dueDate<=date(:today,'+14 days')", { today });
    if (query.label) qb.andWhere('EXISTS(SELECT 1 FROM json_each(job.labels) label WHERE label.value=:label)', { label: this.fileTags([query.label])[0] });
    if (query.priority)
      qb.andWhere('job.priority=:priority', {
        priority: text(query.priority, 'Priority', 20),
      });
    if (query.search)
      qb.andWhere('(job.name LIKE :search OR customer.name LIKE :search)', {
        search: '%' + text(query.search, 'Search', 200) + '%',
      });
    if (query.overdue === 'true')
      qb.andWhere(
        "job.dueDate<>'' AND job.dueDate<:today AND job.isComplete=0",
        { today },
      );
    const page = paging(query);
    const total = await qb.getCount();
    const rows = await qb
      .orderBy(
        "CASE WHEN job.dueDate<>'' AND job.dueDate<:sortToday AND job.isComplete=0 THEN 0 ELSE 1 END",
        'ASC',
      )
      .setParameter('sortToday', today || '')
      .addOrderBy(
        "CASE job.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END",
        'ASC',
      )
      .addOrderBy(
        "CASE WHEN job.dueDate='' THEN '9999-12-31' ELSE job.dueDate END",
        'ASC',
      )
      .addOrderBy('job.createdAt', 'ASC')
      // Each job joins exactly one customer; direct SQL pagination preserves computed sort expressions.
      .offset(page.skip)
      .limit(page.take)
      .getMany();
    const customers = await this.customers.findAll();
    return {
      success: true,
      total,
      today,
      listData: rows.map((row) => ({
        ...row,
        customerName: row.workKind === 'internal' ? 'Internal project' : customers.find((c) => c.slug === row.customerSlug)?.name,
        customerSlug: row.customerSlug || null,
        customerArchived: !!customers.find((c) => c.slug === row.customerSlug)?.isArchived,
      })),
    };
  }
  /** Accepts incoming planning fields and the stored job; returns validated owner, date, priority and checklist values. */
  private async planning(data: any, row: any = {}) {
    const assigneeId = text(
      data.assigneeId ?? row.assigneeId ?? '',
      'Assignee',
      100,
    );
    if (
      assigneeId &&
      assigneeId !== row.assigneeId &&
      !(await this.users.findOne({ id: assigneeId, active: true }))
    )
      throw new BadRequestException('Choose an enabled team member.');
    const dueDate = text(data.dueDate ?? row.dueDate ?? '', 'Due date', 10);
    if (
      dueDate &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) ||
        !Number.isFinite(Date.parse(dueDate + 'T12:00:00Z')) ||
        new Date(dueDate + 'T12:00:00Z').toISOString().slice(0, 10) !== dueDate)
    )
      throw new BadRequestException('Choose a valid due date.');
    const priority = data.priority ?? row.priority ?? 'normal';
    if (!['low', 'normal', 'high', 'urgent'].includes(priority))
      throw new BadRequestException('Invalid priority.');
    const incoming = data.taskList ?? row.taskList ?? [];
    if (!Array.isArray(incoming) || incoming.length > 100)
      throw new BadRequestException('Use at most 100 checklist items.');
    const taskList = incoming.map((item) => {
      if (!item || typeof item.done !== 'boolean')
        throw new BadRequestException('Invalid checklist item.');
      return {
        id: text(item.id || randomUUID(), 'Checklist ID', 100, true),
        title: text(item.title, 'Checklist title', 200, true),
        done: item.done,
      };
    });
    if (new Set(taskList.map((item) => item.id)).size !== taskList.length)
      throw new BadRequestException('Checklist IDs must be unique.');
    return { assigneeId, dueDate, priority, taskList, labels: this.fileTags(data.labels ?? row.labels ?? []) };
  }
  /** Accepts parent/message identity and version; only its author may edit sanitized, nonempty text. */
  @Put('customers/:slug/comments/:id') async editComment(
    @Req() req: any,
    @Param('slug') customerSlug: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    const row = await this.comments.findOne({ id, customerSlug });
    if (!row) throw new NotFoundException();
    if (row.authorId !== req.user.id)
      throw new ForbiddenException('Only the author can edit a message.');
    this.version(data, row);
    const body = richText(data.body);
    if (
      !body
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim()
    )
      throw new BadRequestException('Enter a message.');
    const changed = await this.comments.repository.update(
      { id, version: row.version },
      { body, version: row.version + 1 },
    );
    if (!changed.affected)
      throw new ConflictException('Message changed. Refresh before saving.');
    return { success: true, data: await this.comments.findOne({ id }) };
  }
  /** Accepts a job slug; returns one job in the detail response shape. */
  @Get('customers/jobs/:slug') async job(@Param('slug') jobSlug: string) {
    const row = await this.jobs.findOne({ jobSlug });
    if (!row) throw new NotFoundException();
    return { success: true, detailData: { ...row, customerSlug: row.customerSlug || null } };
  }
  /** Accepts job form values; returns validated creation fields with consistent lifecycle flags. */
  private async newJobFields(data: any) {
    if (!data || typeof data !== 'object' || Array.isArray(data))
      throw new BadRequestException('Enter job details.');
    return {
      name: text(data.name, 'Job name', 200, true),
      body: richText(data.body),
      ...(await this.planning(data)),
      ...jobLifecycle(data),
    };
  }
  /** Accepts an authenticated author, job fields and exactly one customer choice; returns the job after saving both records atomically. */
  @Post('jobs') async createJobWorkspace(@Req() req: any, @Body() data: any) {
    const customerSlug = text(data.customerSlug ?? '', 'Customer', 100);
    const hasNewCustomer = data.customer !== undefined;
    const internal = data.workKind === 'internal';
    if (data.workKind !== undefined && !['customer', 'internal'].includes(data.workKind)) throw new BadRequestException('Invalid work kind.');
    if (Number(!!customerSlug) + Number(hasNewCustomer) + Number(internal) !== 1)
      throw new BadRequestException('Choose exactly one: existing customer, new customer, or internal project.');
    if (hasNewCustomer && (!data.customer || typeof data.customer !== 'object' || Array.isArray(data.customer)))
      throw new BadRequestException('Enter customer details.');
    const fields = await this.newJobFields(data.job);
    const customerFields = hasNewCustomer ? this.customerFields({ ...data.customer, isActive: true, isArchived: false }) : null;
    // A transaction prevents orphan customers if saving the associated job fails.
    return this.jobs.repository.manager.transaction(
      /** Accepts the transaction manager; returns the saved job, rolling back both inserts on failure. */
      async (manager) => {
        const customers = manager.getRepository(Customer);
        const jobs = manager.getRepository(Job);
        const customer = customerFields
          ? await customers.save(customers.create({ ...customerFields, slug: randomUUID(), authorId: req.user.id }))
          : internal ? null : await customers.findOne({ where: { slug: customerSlug } });
        if (!internal && !customer) throw new NotFoundException('Customer not found.');
        if (customer?.isArchived) throw new ConflictException('Restore the customer before adding work.');
        const job = await jobs.save(jobs.create({ ...fields, workKind: internal ? 'internal' : 'customer', customerSlug: customer?.slug || '', jobSlug: randomUUID() }));
        await this.workspace.changes(manager, null, job, req.user.id);
        return { success: true, data: { ...job, customerSlug: job.customerSlug || null } };
      },
    );
  }
  /** Accepts customer identity and job fields; returns a saved job without duplicating customer JSON state. */
  @Post('customers/:slug/jobs') async createJob(
    @Param('slug') customerSlug: string,
    @Body() data: any,
    @Req() req: any,
  ) {
    return this.createJobWorkspace(req, { customerSlug, job: data });
  }
  /** Accepts job slug and editable fields; updates status and scope with conflict detection. */
  @Put('customers/jobs/:slug') async updateJob(
    @Param('slug') jobSlug: string,
    @Body() data: any,
    @Req() req?: any,
  ) {
    const row = (await this.job(jobSlug)).detailData;
    this.version(data, row);
    const lifecycle = jobLifecycle(data, row);
    if ((data.workKind !== undefined && data.workKind !== row.workKind) || (data.customerSlug !== undefined && data.customerSlug !== row.customerSlug))
      throw new BadRequestException('Moving existing work between customers or work kinds is not supported.');
    if (row.customerSlug && row.isArchived && !lifecycle.isArchived && (await this.customer(row.customerSlug)).isArchived)
      throw new ConflictException('Restore the customer before restoring this job.');
    const planning = await this.planning(data, row);
    return this.jobs.repository.manager.transaction(
      /** Accepts the write transaction; returns the confirmed job with its history committed together. */
      async (manager) => {
    const changed = await manager.getRepository(Job).update(
      { id: row.id, version: data.version },
      {
        name: text(data.name, 'Job name', 200, true),
        body: richText(data.body ?? row.body),
        ...planning,
        ...lifecycle,
        version: row.version + 1,
      },
    );
    if (!changed.affected)
      throw new ConflictException('Job changed. Reload before saving.');
    const saved = await manager.getRepository(Job).findOne({ where: { jobSlug } });
    await this.workspace.changes(manager, row, saved, req?.user?.id || '');
    return { success: true, data: { ...saved, customerSlug: saved.customerSlug || null } };
    });
  }
  /** Accepts job identity; archives the job and retains its attachments. */
  @Delete('customers/jobs/:slug') async archiveJob(
    @Param('slug') jobSlug: string,
    @Body() data: any,
    @Req() req?: any,
  ) {
    const row = (await this.job(jobSlug)).detailData;
    return this.updateJob(jobSlug, { name: row.name, version: data.version, lane: 'archived' }, req);
  }
  /** Accepts a job identity and version; restores it to planned work through the same lifecycle and concurrency rules. */
  @Post('jobs/:slug/restore') async restoreJob(@Param('slug') jobSlug: string, @Body() data: any, @Req() req: any) {
    const row = (await this.job(jobSlug)).detailData;
    if (!row.isArchived) throw new ConflictException('This job is not archived.');
    return this.updateJob(jobSlug, { name: row.name, version: data.version, lane: 'planned' }, req);
  }
  /** Accepts scope, paging and an optional bounded time range or exact identity; returns matching appointments. */
  @Get('customers/calendar/:slug') async events(
    @Param('slug') customerSlug: string,
    @Query() query: any,
  ) {
    const jobSlug = await this.jobAssociation(customerSlug, query.jobSlug);
    const qb = this.calendars.repository.createQueryBuilder('event').where('event.customerSlug=:customerSlug', { customerSlug });
    if (query.jobSlug !== undefined) qb.andWhere('event.jobSlug=:jobSlug', { jobSlug });
    if (query.id) qb.andWhere('event.calendarSlug=:id', { id: text(query.id, 'Appointment', 100) });
    if (query.from || query.to) {
      const from = date(query.from), to = date(query.to);
      if (to <= from || Date.parse(to) - Date.parse(from) > 93 * 86400000) throw new BadRequestException('Choose a range of at most 93 days.');
      qb.andWhere('julianday(event.start) < julianday(:to) AND julianday(event.end) > julianday(:from)', { from, to });
    }
    const page = paging(query);
    const [listData, total] = await qb.orderBy('event.start', 'ASC').addOrderBy('event.id', 'ASC').skip(page.skip).take(page.take).getManyAndCount();
    return { success: true, listData, total };
  }
  /** Accepts event fields; returns sanitized subject, notes and a valid UTC time range. */
  private eventFields(data: any) {
    const start = date(data.start),
      end = date(data.end);
    if (end <= start) throw new BadRequestException('End must be after start.');
    return {
      subject: text(data.subject, 'Subject', 200, true),
      body: richText(data.body),
      start,
      end,
      apptDate: start,
    };
  }
  /** Accepts customer and event details; persists an appointment owned by the current staff member. */
  @Post('customers/:slug/calendar') async createEvent(
    @Req() req: any,
    @Param('slug') customerSlug: string,
    @Body() data: any,
  ) {
    const scope = await this.workspace.scope(customerSlug, data.jobSlug || '');
    if (scope.archived) throw new ConflictException('Restore this work before scheduling appointments.');
    return {
      success: true,
      data: await this.calendars.repository.save(
        this.calendars.repository.create({
          ...this.eventFields(data),
          customerSlug,
          jobSlug: await this.jobAssociation(customerSlug, data.jobSlug),
          calendarSlug: randomUUID(),
          authorId: req.user.id,
        }),
      ),
    };
  }
  /** Accepts appointment identity and version; edits the existing appointment. */
  @Put('calendar/:slug') async editEvent(
    @Param('slug') calendarSlug: string,
    @Body() data: any,
  ) {
    const row = await this.calendars.findOne({ calendarSlug });
    if (!row) throw new NotFoundException();
    await this.workspace.scope(row.customerSlug, row.jobSlug);
    if (!row.customerSlug && data.jobSlug !== undefined && data.jobSlug !== row.jobSlug) throw new BadRequestException('Internal appointments must stay with their project.');
    this.version(data, row);
    const result = await this.calendars.repository.update(
      { id: row.id, version: data.version },
      { ...this.eventFields(data), jobSlug: await this.jobAssociation(row.customerSlug, data.jobSlug ?? row.jobSlug), version: row.version + 1 },
    );
    if (!result.affected) throw new ConflictException('Appointment changed.');
    return {
      success: true,
      data: await this.calendars.findOne({ calendarSlug }),
    };
  }
  /** Accepts appointment identity; lets its author or an administrator cancel it. */
  @Delete('calendar/:slug') async deleteEvent(
    @Req() req: any,
    @Param('slug') calendarSlug: string,
  ) {
    const row = await this.calendars.findOne({ calendarSlug });
    if (!row) throw new NotFoundException();
    this.author(req, row);
    await this.calendars.softDelete({ id: row.id });
    return { success: true, data: null };
  }
  /** Accepts a customer or team-board slug; returns bounded messages with author profiles. */
  @Get('customers/:slug/comments') async listComments(
    @Param('slug') customerSlug: string,
    @Query() query: any,
  ) {
    await this.workspace.scope(customerSlug, query.jobSlug || '', true);
    const jobSlug = await this.discussionJob(customerSlug, query.jobSlug);
    const [rows, total] = await this.comments.repository.findAndCount({
      where: { customerSlug, ...(query.jobSlug !== undefined ? { jobSlug } : {}), ...(query.id ? { id: text(query.id, 'Message', 100) } : {}) },
      ...paging(query),
      order: { createdAt: 'DESC', id: 'DESC' },
    });
    const authors = await this.users.findAll();
    const jobs = customerSlug === '__team__' ? [] : await this.jobs.findAll({ where: { customerSlug } });
    return {
      success: true,
      total,
      listData: rows.map((row) => ({
        ...row,
        jobName: jobs.find((job) => job.jobSlug === row.jobSlug)?.name || '',
        author: this.users.profile(
          authors.find((user) => user.id === row.authorId),
        ),
      })),
    };
  }
  /** Accepts a customer/team slug and rich-text message; saves a sanitized discussion entry. */
  @Post('customers/:slug/comments') async createComment(
    @Req() req: any,
    @Param('slug') customerSlug: string,
    @Body() data: any,
  ) {
    await this.workspace.scope(customerSlug, data.jobSlug || '', true);
    const jobSlug = await this.discussionJob(customerSlug, data.jobSlug);
    const body = richText(data.body);
    if (!body.replace(/<[^>]*>/g, '').trim())
      throw new BadRequestException('Enter a message.');
    return this.comments.repository.manager.transaction(
      /** Accepts a transaction; returns a message and commits its update event in the same write. */
      async (manager) => {
        const repository = manager.getRepository(Comment);
        const row = await repository.save(repository.create({ body, customerSlug, jobSlug, authorId: req.user.id }));
        if (jobSlug) await manager.query('INSERT INTO work_event(jobSlug,actorId,kind,beforeValue,afterValue,messageId,createdAt) VALUES(?,?,?,?,?,?,?)', [jobSlug, req.user.id, 'message', '', '', row.id, new Date().toISOString()]);
        return { success: true, data: { ...row, author: this.users.profile(req.user), jobName: jobSlug ? (await this.jobs.findOne({ jobSlug })).name : '' } };
      },
    );
  }
  /** Accepts parent and message identity; verifies ownership before archiving the message. */
  @Delete('customers/:slug/comments/:id') async deleteComment(
    @Req() req: any,
    @Param('slug') customerSlug: string,
    @Param('id') id: string,
  ) {
    const row = await this.comments.findOne({ id, customerSlug });
    if (!row) throw new NotFoundException();
    this.author(req, row);
    await this.comments.softDelete({ id });
    return { success: true, data: null };
  }
  /** Accepts customer identity; returns file metadata without loading binary data. */
  @Get('customers/:slug/files') async listFiles(
    @Param('slug') customerSlug: string,
    @Query() query: any,
  ) {
    const jobSlug = await this.jobAssociation(customerSlug, query.jobSlug);
    const qb = this.files.repository.createQueryBuilder('file')
      .where('file.customerSlug=:customerSlug AND file.isArchived=0', { customerSlug });
    if (query.jobSlug !== undefined) qb.andWhere('file.jobSlug=:jobSlug', { jobSlug });
    if (query.id) qb.andWhere('file.id=:id', { id: text(query.id, 'File', 100) });
    if (query.tag) qb.andWhere('EXISTS (SELECT 1 FROM json_each(file.tags) tag WHERE tag.value=:tag)', { tag: this.fileTags([query.tag])[0] });
    if (query.search) qb.andWhere('file.name LIKE :search', { search: '%' + text(query.search, 'Search', 200) + '%' });
    const page = paging(query);
    const [listData, total] = await qb.orderBy('file.createdAt', 'DESC').addOrderBy('file.id', 'DESC').skip(page.skip).take(page.take).getManyAndCount();
    return { success: true, listData, total };
  }
  /** Accepts a customer and optional job scope; returns available tag choices from metadata only, independent of the current filter. */
  @Get('customers/:slug/file-tags') async availableFileTags(@Param('slug') customerSlug: string, @Query() query: any) {
    const jobSlug = await this.jobAssociation(customerSlug, query.jobSlug);
    const rows = await this.files.repository.find({
      where: { customerSlug, isArchived: false, ...(query.jobSlug !== undefined ? { jobSlug } : {}) },
      select: { tags: true },
    });
    return { success: true, listData: [...new Set(rows.flatMap((row) => row.tags))].sort() };
  }
  /** Accepts customer and up to 50 selected file IDs; returns a private ZIP bounded to 50 MB. */
  @Post('customers/:slug/files/download') async downloadFiles(
    @Param('slug') customerSlug: string,
    @Body() data: any,
    @Res() res: any,
    scopeJobSlug = '',
  ) {
    await this.workspace.scope(customerSlug, scopeJobSlug);
    if (
      !Array.isArray(data.ids) ||
      !data.ids.length ||
      data.ids.length > 50 ||
      data.ids.some((id) => typeof id !== 'string')
    )
      throw new BadRequestException('Select 1 to 50 files.');
    const rows = await this.files.repository
      .createQueryBuilder('f')
      .where('f.customerSlug=:customerSlug AND f.isArchived=0', {
        customerSlug,
      })
      .andWhere('f.id IN (:...ids)', { ids: [...new Set(data.ids)] })
      .andWhere(scopeJobSlug ? 'f.jobSlug=:scopeJobSlug' : '1=1', { scopeJobSlug })
      .getMany();
    if (rows.length !== new Set(data.ids).size)
      throw new NotFoundException('A selected file no longer exists.');
    if (rows.reduce((sum, f) => sum + Number(f.fileSize), 0) > 50 * 1024 * 1024)
      throw new BadRequestException('Select at most 50 MB per download.');
    const files = await this.files.repository
      .createQueryBuilder('f')
      .addSelect('f.content')
      .where('f.id IN (:...ids)', { ids: rows.map((f) => f.id) })
      .getMany();
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="files.zip"');
    res.send(
      zipFiles(
        files.map((f) => ({ name: f.name, bytes: Buffer.from(f.content) })),
      ),
    );
  }
  /** Accepts uploaded bytes; returns an inline-safe image MIME type or generic download type. */
  private imageType(bytes: Buffer) {
    if (
      bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    )
      return 'image/png';
    if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
      return 'image/jpeg';
    if (['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString()))
      return 'image/gif';
    if (
      bytes.subarray(0, 4).toString() === 'RIFF' &&
      bytes.subarray(8, 12).toString() === 'WEBP'
    )
      return 'image/webp';
    return 'application/octet-stream';
  }
  /** Accepts authenticated multipart file, parent, category and optional job; saves protected bytes and metadata. */
  @Post('customers/:slug/files')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 4 },
    }),
  )
  async upload(
    @Req() req: any,
    @Param('slug') customerSlug: string,
    @UploadedFile() file: any,
    @Body() data: any,
  ) {
    const scope = await this.workspace.scope(customerSlug, data.jobSlug || '');
    if (scope.archived) throw new ConflictException('Restore this work before uploading files.');
    if (!file?.buffer?.length)
      throw new BadRequestException('Choose a nonempty file.');
    const name = text(file.originalname, 'Filename', 200, true);
    if (/[\\/\r\n]/.test(name))
      throw new BadRequestException('Invalid filename.');
    const jobSlug = data.jobSlug || '';
    if (jobSlug && !(await this.jobs.findOne({ jobSlug, customerSlug })))
      throw new BadRequestException('Job does not belong to this customer.');
    const category = data.category || 'document';
    if (!customerSlug && category === 'avatar') throw new BadRequestException('Internal projects do not have customer avatars.');
    if (!['document', 'photo', 'avatar', 'misc'].includes(category))
      throw new BadRequestException('Invalid category.');
    const fileType = this.imageType(file.buffer);
    if (
      category === 'avatar' &&
      (fileType === 'application/octet-stream' || file.size > 2 * 1024 * 1024)
    )
      throw new BadRequestException('Choose an image avatar under 2 MB.');
    const used = await this.files.repository
      .createQueryBuilder('f')
      .select('COALESCE(SUM(CAST(f.fileSize AS INTEGER)),0)', 'bytes')
      .getRawOne();
    if (Number(used.bytes) + file.size > 500 * 1024 * 1024)
      throw new BadRequestException('Workspace file storage is full.');
    const row = await this.files.repository.save(
      this.files.repository.create({
        customerSlug,
        jobSlug,
        name,
        fileType,
        fileSize: String(file.size),
        category,
        content: file.buffer,
        authorId: req.user.id,
        filePath: '',
        tags: this.fileTags(data.tags ?? []),
        currentDir: '',
      }),
    );
    if (category === 'avatar')
      await this.customers.update(
        { slug: customerSlug },
        { avatar: `/api/files/${row.id}/view` },
      );
    const { content, ...metadata } = row;
    return { success: true, data: metadata };
  }
  /** Accepts file ID and requested disposition; sends image bytes inline or any file as an authenticated download. */
  @Get('files/:id/:mode') async serveFile(
    @Param('id') id: string,
    @Param('mode') mode: string,
    @Res() res: any,
  ) {
    if (!['view', 'download'].includes(mode)) throw new NotFoundException();
    const row = await this.files.repository
      .createQueryBuilder('file')
      .addSelect('file.content')
      .where('file.id=:id AND file.isArchived=0', { id })
      .getOne();
    if (!row) throw new NotFoundException();
    const inline = mode === 'view' && row.fileType.startsWith('image/');
    await this.workspace.scope(row.customerSlug, row.jobSlug);
    res.setHeader(
      'Content-Type',
      inline ? row.fileType : 'application/octet-stream',
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename="file"; filename*=UTF-8''${encodeURIComponent(row.name).replace(/'/g, '%27')}`,
    );
    res.send(Buffer.from(row.content));
  }
  /** Accepts file identity and versioned metadata; renames or moves a file without moving server paths. */
  @Put('files/:id') async editFile(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    const row = await this.files.findOne({ id });
    if (!row) throw new NotFoundException();
    this.author(req, row);
    this.version(data, row);
    const name = text(data.name, 'Filename', 200, true);
    if (/[\\/\r\n]/.test(name))
      throw new BadRequestException('Invalid filename.');
    const jobSlug = text(data.jobSlug ?? row.jobSlug, 'Job', 100);
    await this.workspace.scope(row.customerSlug, jobSlug);
    if (!row.customerSlug && jobSlug !== row.jobSlug) throw new BadRequestException('Moving files between internal projects is not supported.');
    const category = data.category ?? row.category;
    if (!row.customerSlug && category === 'avatar') throw new BadRequestException('Internal projects do not have customer avatars.');
    if (!['document', 'photo', 'avatar', 'misc'].includes(category))
      throw new BadRequestException('Invalid category.');
    const changed = await this.files.repository.update(
      { id, version: row.version },
      {
        name,
        jobSlug,
        category,
        tags: this.fileTags(data.tags ?? row.tags),
        version: row.version + 1,
      },
    );
    if (!changed.affected)
      throw new ConflictException('File changed. Reload before saving.');
    return { success: true, data: await this.files.findOne({ id }) };
  }
  /** Accepts a file ID; checks ownership and removes its bytes without any filesystem paths. */
  @Delete('files/:id') async deleteFile(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    const row = await this.files.findOne({ id });
    if (!row) throw new NotFoundException();
    this.author(req, row);
    await this.customers.repository.update(
      { avatar: `/api/files/${id}/view` },
      { avatar: '' },
    );
    await this.files.repository.delete({ id });
    return { success: true, data: null };
  }
}
