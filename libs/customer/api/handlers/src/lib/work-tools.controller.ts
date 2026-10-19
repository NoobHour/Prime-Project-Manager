import { BadRequestException, Body, ConflictException, Controller, Delete, Get, NotFoundException, Param, Post, Put, Query, Req } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UserService } from '@mgmt/user/api/shared';
import { paging, richText, text } from '@mgmt/shared/api/validations/src/lib/input';
import { WorkspaceService, visibleJob } from './workspace.service';

// Archived work remains accessible through explicit links; orphaned customer jobs do not become internal projects.
const accessibleJob = `j.deletedDate IS NULL AND ((j.workKind='internal' AND j.customerSlug='') OR (j.workKind='customer' AND c.slug=j.customerSlug AND c.deletedDate IS NULL))`;

@Controller()
export class WorkToolsController {
  /** Accepts workspace/account services; exposes reusable work, private views, search and per-user updates. */
  constructor(private workspace: WorkspaceService, private users: UserService) {}
  /** Accepts no input; returns the shared transactional database manager. */
  private get db() { return this.workspace.jobs.repository.manager; }
  /** Accepts template fields; returns bounded reusable scope and checklist titles without customer history or resource content. */
  private templateFields(data: any) {
    const name = text(data.name, 'Template name', 120, true);
    const body = richText(data.body);
    if (!['low', 'normal', 'high', 'urgent'].includes(data.priority)) throw new BadRequestException('Invalid priority.');
    if (!Array.isArray(data.checklist) || data.checklist.length > 100) throw new BadRequestException('Use at most 100 checklist titles.');
    const checklist = data.checklist.map((title) => text(title, 'Checklist title', 200, true));
    const dueOffset = data.dueOffset === null || data.dueOffset === '' || data.dueOffset === undefined ? null : Number(data.dueOffset);
    if (dueOffset !== null && (!Number.isInteger(dueOffset) || dueOffset < 0 || dueOffset > 365)) throw new BadRequestException('Use a deadline offset from 0 to 365 days.');
    return { name, body, priority: data.priority, checklist, dueOffset };
  }
  /** Accepts pagination; returns editable template copies with decoded checklist titles. */
  @Get('templates') async templates(@Query() query: any) {
    const page = paging(query);
    const rows = await this.db.query('SELECT * FROM work_template ORDER BY name,id LIMIT ? OFFSET ?', [page.take, page.skip]);
    return { success: true, listData: rows.map((row) => ({ ...row, checklist: JSON.parse(row.checklist) })), total: (await this.db.query('SELECT count(*) AS count FROM work_template'))[0].count };
  }
  /** Accepts a template identity; returns one reusable preview without pagination ambiguity. */
  @Get('templates/:id') async template(@Param('id') id: string) {
    const row = (await this.db.query('SELECT * FROM work_template WHERE id=?', [id]))[0];
    if (!row) throw new NotFoundException('Template not found.');
    return { success: true, data: { ...row, checklist: JSON.parse(row.checklist) } };
  }
  /** Accepts an administrator and template draft; creates reusable work without creating any job. */
  @Post('templates') async createTemplate(@Req() req: any, @Body() data: any) {
    this.users.requireAdmin(req.user);
    const fields = this.templateFields(data), id = randomUUID();
    await this.db.query('INSERT INTO work_template(id,name,body,priority,checklist,dueOffset) VALUES(?,?,?,?,?,?)', [id, fields.name, fields.body, fields.priority, JSON.stringify(fields.checklist), fields.dueOffset]);
    return { success: true, data: { id, ...fields, version: 1 } };
  }
  /** Accepts an administrator, template ID and versioned draft; updates the template while leaving existing jobs unchanged. */
  @Put('templates/:id') async editTemplate(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    this.users.requireAdmin(req.user);
    const fields = this.templateFields(data);
    const changed = await this.db.query('UPDATE work_template SET name=?,body=?,priority=?,checklist=?,dueOffset=?,version=version+1 WHERE id=? AND version=? RETURNING version', [fields.name, fields.body, fields.priority, JSON.stringify(fields.checklist), fields.dueOffset, id, data.version]);
    if (!changed.length) throw new ConflictException('Template changed. Reload before saving.');
    return { success: true, data: { id, ...fields, version: data.version + 1 } };
  }
  /** Accepts an existing job; returns a duplication preview with fresh steps and deliberately empty relationship, owner and deadline choices. */
  @Get('jobs/:jobSlug/duplicate') async duplicate(@Param('jobSlug') jobSlug: string) {
    await this.workspace.jobScope(jobSlug);
    const job = await this.workspace.jobs.findOne({ jobSlug });
    return { success: true, data: { name: job.name + ' (copy)', body: job.body, priority: job.priority, lane: 'planned', assigneeId: '', dueDate: '', labels: job.labels, taskList: job.taskList.map((step) => ({ id: randomUUID(), title: step.title, done: false })) } };
  }
  /** Accepts an account; returns only that account's named filter views. */
  @Get('views') async views(@Req() req: any) { return { success: true, listData: await this.db.query('SELECT id,name,query FROM saved_view WHERE userId=? ORDER BY name', [req.user.id]) }; }
  /** Accepts an account and named job-query filters; saves a private view containing only supported URL state. */
  @Post('views') async saveView(@Req() req: any, @Body() data: any) {
    const name = text(data.name, 'View name', 80, true);
    const incoming = new URLSearchParams(text(data.query, 'Filters', 2000));
    const query = new URLSearchParams();
    for (const key of ['search', 'assignee', 'priority', 'lane', 'overdue', 'attention', 'archived', 'complete', 'label', 'scope', 'dueSoon']) {
      if (incoming.has(key)) query.set(key, text(incoming.get(key), 'Filter', 200));
    }
    const count = (await this.db.query('SELECT count(*) AS count FROM saved_view WHERE userId=?', [req.user.id]))[0].count;
    if (count >= 50 && !(await this.db.query('SELECT id FROM saved_view WHERE userId=? AND name=?', [req.user.id, name])).length) throw new BadRequestException('Use at most 50 saved views.');
    await this.db.query('INSERT INTO saved_view(id,userId,name,query) VALUES(?,?,?,?) ON CONFLICT(userId,name) DO UPDATE SET query=excluded.query', [randomUUID(), req.user.id, name, query.toString()]);
    return this.views(req);
  }
  /** Accepts an account and view ID; removes only that account's saved view. */
  @Delete('views/:id') async deleteView(@Req() req: any, @Param('id') id: string) { await this.db.query('DELETE FROM saved_view WHERE id=? AND userId=?', [id, req.user.id]); return { success: true }; }
  /** Accepts a search phrase and bounded page; returns grouped customer, job and file metadata results without reading file bytes or messages. */
  @Get('search') async search(@Query() query: any) {
    const phrase = text(query.q, 'Search', 200, true), page = paging(query);
    const pattern = '%' + phrase + '%';
    const sql = `SELECT * FROM (
      SELECT 'customer' AS type,c.slug AS id,c.name AS title,'' AS jobSlug,c.slug AS customerSlug,c.name AS customerName FROM customer c WHERE c.deletedDate IS NULL AND c.isArchived=0 AND (c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ? OR c.address LIKE ?)
      UNION ALL SELECT 'job',j.jobSlug,j.name,j.jobSlug,j.customerSlug,COALESCE(c.name,'Internal project') FROM job j LEFT JOIN customer c ON c.slug=j.customerSlug WHERE ${visibleJob} AND j.name LIKE ?
      UNION ALL SELECT 'file',f.id,f.name,f.jobSlug,f.customerSlug,COALESCE(c.name,'Internal project') FROM filesys f LEFT JOIN job j ON j.jobSlug=f.jobSlug LEFT JOIN customer c ON c.slug=f.customerSlug WHERE f.deletedDate IS NULL AND f.isArchived=0 AND (f.name LIKE ? OR EXISTS(SELECT 1 FROM json_each(f.tags) tag WHERE tag.value LIKE ?)) AND ((f.jobSlug='' AND c.slug IS NOT NULL AND c.isArchived=0 AND c.deletedDate IS NULL) OR (f.jobSlug<>'' AND j.customerSlug=f.customerSlug AND ${visibleJob}))
    )`;
    const values = Array(7).fill(pattern);
    const total = (await this.db.query(`SELECT count(*) AS count FROM (${sql})`, values))[0].count;
    return { success: true, total, listData: await this.db.query(sql + ' ORDER BY type,title,id LIMIT ? OFFSET ?', [...values, page.take, page.skip]) };
  }
  /** Accepts an account and job; returns its follow state and a bounded, structured history page. */
  @Get('jobs/:jobSlug/history') async history(@Req() req: any, @Param('jobSlug') jobSlug: string, @Query() query: any) {
    await this.workspace.jobScope(jobSlug);
    const page = paging(query);
    return { success: true, following: !!(await this.db.query('SELECT 1 FROM job_follow WHERE userId=? AND jobSlug=?', [req.user.id, jobSlug])).length, listData: await this.db.query('SELECT e.*,u.username AS actor FROM work_event e LEFT JOIN user u ON u.id=e.actorId WHERE jobSlug=? ORDER BY sequence DESC LIMIT ? OFFSET ?', [jobSlug, page.take, page.skip]), total: (await this.db.query('SELECT count(*) AS count FROM work_event WHERE jobSlug=?', [jobSlug]))[0].count };
  }
  /** Accepts an account, job and explicit boolean; follows or unfollows only that job for this user. */
  @Put('jobs/:jobSlug/follow') async follow(@Req() req: any, @Param('jobSlug') jobSlug: string, @Body() data: any) {
    await this.workspace.jobScope(jobSlug);
    if (typeof data.following !== 'boolean') throw new BadRequestException('Choose whether to follow this job.');
    if (data.following) await this.db.query('INSERT OR IGNORE INTO job_follow(userId,jobSlug) VALUES(?,?)', [req.user.id, jobSlug]);
    else await this.db.query('DELETE FROM job_follow WHERE userId=? AND jobSlug=?', [req.user.id, jobSlug]);
    return { success: true, following: data.following };
  }
  /** Accepts an account and page; coalesces unread relevant events per job/kind and rechecks current record visibility. */
  @Get('updates') async updates(@Req() req: any, @Query() query: any) {
    const page = paging(query);
    const sql = `SELECT max(e.sequence) AS sequence,e.jobSlug,e.kind,count(*) AS count FROM work_event e JOIN job j ON j.jobSlug=e.jobSlug LEFT JOIN customer c ON c.slug=j.customerSlug LEFT JOIN update_read r ON r.userId=? AND r.jobSlug=e.jobSlug WHERE ${accessibleJob} AND e.actorId<>? AND e.sequence>COALESCE(r.sequence,0) AND (e.recipientId=? OR EXISTS(SELECT 1 FROM job_follow f WHERE f.userId=? AND f.jobSlug=e.jobSlug)) GROUP BY e.jobSlug,e.kind`;
    const args = [req.user.id, req.user.id, req.user.id, req.user.id];
    const total = (await this.db.query(`SELECT count(*) AS count FROM (${sql})`, args))[0].count;
    const rows = await this.db.query(`SELECT e.*,x.count,j.name AS jobName,u.username AS actor FROM (${sql}) x JOIN work_event e ON e.sequence=x.sequence JOIN job j ON j.jobSlug=e.jobSlug LEFT JOIN user u ON u.id=e.actorId ORDER BY e.sequence DESC LIMIT ? OFFSET ?`, [...args, page.take, page.skip]);
    return { success: true, listData: rows, total };
  }
  /** Accepts an account, job and last displayed event; advances only that job's read position without swallowing later events. */
  @Post('jobs/:jobSlug/read') async read(@Req() req: any, @Param('jobSlug') jobSlug: string, @Body() data: any) {
    await this.workspace.jobScope(jobSlug);
    if (!Number.isSafeInteger(data.sequence) || data.sequence < 1 || !(await this.db.query('SELECT 1 FROM work_event WHERE jobSlug=? AND sequence=?', [jobSlug, data.sequence])).length) throw new BadRequestException('Choose a displayed update.');
    await this.db.query('INSERT INTO update_read(userId,jobSlug,sequence) VALUES(?,?,?) ON CONFLICT(userId,jobSlug) DO UPDATE SET sequence=max(sequence,excluded.sequence)', [req.user.id, jobSlug, data.sequence]);
    return { success: true };
  }
}
