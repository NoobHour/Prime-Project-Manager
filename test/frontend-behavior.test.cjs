const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { of, throwError, Subject } = require('rxjs');

/** Accepts decorator metadata; returns a no-op decorator for component behavior tests without a DOM. */
function decorator() {
  return function decorate() {};
}
/** Accepts a feature source path; returns its transpiled exports with only Angular wiring stubbed. */
function component(relative) {
  const filename = path.join(
    __dirname,
    '../libs/customer/feature/src/lib',
    relative,
  );
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      experimentalDecorators: true,
    },
  }).outputText;
  const exports = {};
  /** Accepts an import ID; returns the real reactive primitives or minimal Angular wiring. */
  function load(id) {
    if (id === 'rxjs') return require(id);
    if (id === '@angular/core')
      return { Component: decorator, NgModule: decorator, Input: decorator, Output: decorator, HostListener: decorator, ViewChild: decorator, ContentChildren: decorator, EventEmitter: class {
        /** Accepts no input; provides the no-op output hook used by the file gallery tests. */
        emit() {}
      } };
    if (id === '@angular/router')
      return { RouterModule: { forChild: decorator } };
    if (id === '@angular/forms')
      return {
        Validators: {
          required: decorator,
          email: decorator,
          maxLength: decorator,
        },
      };
    if (id === 'angular-calendar')
      return { CalendarView: { Month: 'month', Week: 'week', Day: 'day' } };
    if (
      ['@angular/common', '@angular/common/http', '@mgmt/user/shared'].includes(
        id,
      )
    )
      return {};
    throw new Error('Unexpected component dependency: ' + id);
  }
  vm.runInNewContext(
    output,
    {
      exports,
      require: load,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      document: { hidden: false },
      crypto: require('node:crypto').webcrypto,
    },
    { filename },
  );
  return exports;
}
/** Accepts initial form controls; returns a small mutable form double for persistence behavior checks. */
function group(controls) {
  return {
    value: Object.fromEntries(
      Object.entries(controls).map(([key, value]) => [key, value[0]]),
    ),
    /** Accepts partial server values; updates only those fields and returns nothing. */
    patchValue(data) {
      Object.assign(this.value, data);
    },
    /** Accepts replacement form values; resets the appointment editor without Angular's DOM. */
    reset(data) { this.value = { ...data }; },
    /** Accepts no input; provides the Angular form state hook for draft restoration tests. */
    markAsUntouched() {},
  };
}

/** Accepts no input; verifies shared tab keyboard navigation, unique panel associations and subscription cleanup. */
test('resource tabs navigate with the keyboard and keep projected panels intact', () => {
  const { LegacyTabView, LegacyTabPanel } = component('../../../../shared/common/src/lib/legacy-tabs.module.ts');
  const panels = [new LegacyTabPanel(), new LegacyTabPanel(), new LegacyTabPanel()];
  const changes = new Subject();
  panels.changes = changes;
  const host = new LegacyTabView({
    /** Accepts no input; provides the initialization change-detection hook without an Angular view. */
    detectChanges() {},
  });
  host.panels = panels;
  host.ngAfterContentInit();
  panels[0].draft = 'Unsent message';
  let focused = -1;
  const buttons = panels.map((_panel, index) => ({
    /** Accepts no input; records the focused tab for keyboard navigation assertions. */
    focus() { focused = index; },
  }));
  let prevented = false;
  const event = {
    key: 'ArrowLeft',
    /** Accepts no input; records that a recognized tab-navigation key suppresses native scrolling. */
    preventDefault() { prevented = true; },
    currentTarget: { parentElement: { parentElement: {
      /** Accepts a tab selector; returns only this host's button doubles. */
      querySelectorAll() { return buttons; },
    } } },
  };
  host.navigate(event, 0);
  assert.equal(host.selected, 2);
  assert.equal(focused, 2);
  assert.equal(prevented, true);
  assert.equal(panels[0].active, false);
  assert.equal(panels[2].active, true);
  assert.equal(panels[0].draft, 'Unsent message');
  assert.equal(new Set(panels.map(panel => panel.panelId)).size, 3);
  const sibling = new LegacyTabView({ detectChanges: () => {} });
  sibling.panels = [new LegacyTabPanel()];
  sibling.select(0);
  assert.notEqual(sibling.panels[0].panelId, panels[0].panelId);
  event.key = 'Home';
  host.navigate(event, 2);
  assert.equal(host.selected, 0);
  assert.equal(focused, 0);
  host.ngOnDestroy();
  host.selected = 2;
  panels.pop();
  changes.next();
  assert.equal(host.selected, 2);
});

/** Accepts no input; verifies posting-destination changes and message edits preserve independent unsent board drafts. */
test('combined discussion keeps independent drafts and restores the original board after editing', () => {
  const { ViewCommentsComponent } = component('view-comments/view-comments.component.ts');
  const board = new ViewCommentsComponent({}, {}, {}, {}, { group }, {});
  board.combined = true;
  board.commentForm.value.body = '<p>General draft</p>';
  board.chooseBoard('job-one');
  assert.equal(board.commentForm.value.body, '');
  board.commentForm.value.body = '<p>Job draft</p>';
  board.chooseBoard('');
  assert.equal(board.commentForm.value.body, '<p>General draft</p>');
  board.chooseBoard('job-one');
  board.edit({ id: 'other', jobSlug: 'job-two', body: '<p>Saved message</p>' });
  assert.equal(board.destination, 'job-two');
  board.cancelEdit();
  assert.equal(board.destination, 'job-one');
  assert.equal(board.commentForm.value.body, '<p>Job draft</p>');
  assert.equal(board.hasDraft, true);
});

/** Accepts no input; verifies failed sends preserve drafts, duplicate clicks are blocked, and successful off-filter sends do not contaminate the feed. */
test('discussion sends remain on their board and recover from errors', async () => {
  const { ViewCommentsComponent } = component('view-comments/view-comments.component.ts');
  const pending = new Subject();
  let writes = 0;
  const http = {
    /** Accepts a message URL and payload; verifies its board and returns a controlled write. */
    post(url, data) { writes++; assert.equal(data.jobSlug, 'one'); return pending; },
  };
  const board = new ViewCommentsComponent({}, {}, {}, http, { group }, {});
  board.slug = 'customer'; board.combined = true; board.filter = 'two'; board.destination = 'one';
  board.commentForm.value.body = '<p>Job update</p>';
  const sending = board.postComment();
  await board.postComment();
  assert.equal(writes, 1);
  pending.error({ error: { message: 'Try again' } });
  await sending;
  assert.equal(board.commentForm.value.body, '<p>Job update</p>');
  /** Accepts a retried message write; returns a persisted message on the selected destination. */
  http.post = () => of({ data: { id: 'saved', jobSlug: 'one', body: '<p>Job update</p>' } });
  await board.postComment();
  assert.equal(board.comments.length, 0);
  assert.equal(board.hiddenSentBoard, 'one');
  assert.equal(board.hasDraft, false);
});

/** Accepts no input; verifies a slow previous board cannot overwrite the selected board or its loading state. */
test('combined discussion ignores superseded board reads', async () => {
  const { ViewCommentsComponent } = component('view-comments/view-comments.component.ts');
  const responses = [new Subject(), new Subject()];
  const scopes = [];
  const board = new ViewCommentsComponent({}, {}, {}, {
    /** Accepts a discussion query; records its board and returns a controlled response. */
    get(_url, options) { scopes.push(options.params.jobSlug); return responses[scopes.length - 1]; },
  }, { group }, {});
  board.combined = true;
  board.filter = 'old-job';
  const older = board.filterChanged();
  board.filter = 'general';
  board.notice = 'Message hidden by the previous filter.';
  const current = board.filterChanged();
  assert.equal(board.notice, '');
  responses[1].next({ listData: [{ id: 'current', jobSlug: '', body: 'General' }], total: 1 });
  responses[1].complete();
  await current;
  responses[0].next({ listData: [{ id: 'old', jobSlug: 'old-job' }], total: 9 });
  responses[0].complete();
  await older;
  assert.deepEqual(scopes, ['old-job', '']);
  assert.equal(board.comments[0].id, 'current');
  assert.equal(board.total, 1);
  assert.equal(board.loading, false);
});

/** Accepts no input; verifies job and customer navigation preserve unsent board drafts until explicit discard. */
test('workspace navigation protects message drafts and pending sends', async () => {
  const { JobViewComponent } = component('job-view/job-view.component.ts');
  const { ViewCustomerComponent } = component('view-customer/view-customer.component.ts');
  const views = [new JobViewComponent({}, {}), new ViewCustomerComponent({}, {}, {}, {})];
  for (const view of views) {
    view.discussion = { hasDraft: true, busy: false };
    let leaving = view.canLeave();
    assert.equal(view.leavePrompt, true);
    view.resolveLeave(false);
    assert.equal(await leaving, false);
    assert.equal(view.discussion.hasDraft, true);
    leaving = view.canLeave();
    view.resolveLeave(true);
    assert.equal(await leaving, true);
    view.discussion = { hasDraft: false, busy: true };
    assert.equal(view.canLeave(), false);
  }
});

/** Accepts no input; verifies normalized tag editing never mutates the persisted row until save and invalid labels are rejected. */
test('file tags are normalized, deduplicated and edited in a separate draft', () => {
  const { FileUtilComponent } = component('file-util/file-util.component.ts');
  const files = new FileUtilComponent({}, {});
  const file = { tags: ['quote'] };
  files.edit(file);
  files.editTag = ' Quote ';
  assert.equal(files.addTag('edit'), true);
  files.editTag = 'Inspection'; files.addTag('edit');
  assert.deepEqual(Array.from(files.editing.tags), ['quote', 'inspection']);
  assert.deepEqual(file.tags, ['quote']);
  files.editTag = 'x'.repeat(201);
  assert.equal(files.addTag('edit'), false);
  files.removeTag('edit', 'quote');
  assert.deepEqual(Array.from(files.editing.tags), ['inspection']);
});

/** Accepts no input; verifies the customer editor saves contact fields only and protects a draft before opening a job. */
test('customer editor saves only the customer and guards unsaved navigation', async () => {
  const { EditorComponent } = component('editor/editor.component.ts');
  const writes = [];
  const editor = new EditorComponent({ group }, {
    /** Accepts the customer URL and fields; returns the saved customer without any job writes. */
    put(url, data) { writes.push(url); return of({ data: { ...data, slug: 'customer', version: 2 } }); },
  }, {}, {
    /** Accepts the destination; returns successful navigation after the draft baseline updates. */
    async navigate() { assert.equal(editor.canLeave(), true); return true; },
  });
  editor.custSlug = 'customer';
  editor.form.value.name = 'Changed contact';
  const decision = editor.canLeave();
  assert.equal(editor.leavePrompt, true);
  editor.resolveLeave(false);
  assert.equal(await decision, false);
  await editor.submit();
  assert.deepEqual(writes, ['/api/customers/customer']);
  assert.equal(editor.dirty, false);
});

/** Accepts no input; verifies atomic creation payloads, failed-save draft retention and duplicate-submit protection. */
test('new job workspace preserves customer and job drafts until creation succeeds', async () => {
  const { JobViewComponent } = component('job-view/job-view.component.ts');
  let pending = new Subject();
  const writes = [];
  const visits = [];
  const view = new JobViewComponent({
    /** Accepts the creation endpoint and payload; returns a controlled server response. */
    post(url, data) { writes.push({ url, data }); return pending; },
  }, {}, {
    /** Accepts the saved job route; records it and confirms navigation is not blocked by the saved draft. */
    async navigate(route) { visits.push(route); assert.equal(view.canLeave(), true); return true; },
  });
  view.creating = view.newReady = true;
  view.draft = { name: 'New roof', body: '<p>Scope</p>', taskList: [], lane: 'active' };
  view.customerMode = 'new';
  view.newCustomer.name = 'New customer';
  const first = view.save();
  await view.save();
  assert.equal(writes.length, 1);
  assert.equal(writes[0].url, '/api/jobs');
  assert.equal(writes[0].data.customer.name, 'New customer');
  assert.equal(writes[0].data.customerSlug, undefined);
  pending.error({ error: { message: 'Try again' } });
  await first;
  assert.equal(view.draft.name, 'New roof');
  assert.equal(view.newCustomer.name, 'New customer');
  assert.equal(view.dirty, true);
  assert.equal(visits.length, 0);
  pending = new Subject();
  view.customerMode = 'existing';
  view.customerSlug = 'selected';
  view.customer = { slug: 'selected', name: 'Existing customer', isArchived: false };
  const second = view.save();
  assert.equal(writes[1].data.customerSlug, 'selected');
  assert.equal(writes[1].data.customer, undefined);
  pending.next({ data: { jobSlug: 'saved-job' } });
  await second;
  assert.deepEqual(Array.from(visits[0]), ['/job', 'saved-job']);
  assert.equal(view.dirty, false);
});

/** Accepts no input; verifies customer search responses cannot replace a newer result or silently change the selection. */
test('new job customer search ignores stale results', async () => {
  const { JobViewComponent } = component('job-view/job-view.component.ts');
  const old = new Subject();
  const recent = new Subject();
  const view = new JobViewComponent({
    /** Accepts a search URL and parameters; returns the matching pending response. */
    get(url, options) { return options.params.search === 'old' ? old : recent; },
  }, {}, {});
  view.customerSearch = 'old';
  const first = view.searchCustomers();
  view.customerSearch = 'recent';
  const second = view.searchCustomers();
  recent.next({ listData: [{ slug: 'recent', name: 'Recent customer' }] });
  await second;
  view.selectCustomer('recent');
  old.next({ listData: [{ slug: 'old', name: 'Old customer' }] });
  await first;
  assert.equal(view.customerChoices[0].slug, 'recent');
  assert.equal(view.customerSlug, 'recent');
});

/** Accepts no input; verifies job conflicts keep the draft, successful saves advance versions, and duplicate writes are blocked. */
test('job workspace preserves drafts on conflict and saves only the selected job', async () => {
  const { JobViewComponent } = component('job-view/job-view.component.ts');
  const pending = new Subject();
  let writes = 0;
  let sent;
  const view = new JobViewComponent({
    /** Accepts the selected job URL and payload; records one controlled versioned write. */
    put(url, data) { writes++; sent = { url, data }; return pending; },
  }, {});
  view.job = { jobSlug: 'roof', version: 4, name: 'Roof', body: '<p>Scope</p>', lane: 'active', priority: 'normal', dueDate: '', assigneeId: '', taskList: [{ id: 'step', title: 'Inspect', done: false }] };
  view.jobs = [view.job, { jobSlug: 'other', name: 'Other' }];
  view.resetDraft();
  view.draft.taskList[0].done = true;
  view.draft.name = 'Updated roof';
  assert.equal(view.job.taskList[0].done, false);
  const saving = view.save();
  await view.save();
  assert.equal(writes, 1);
  assert.equal(sent.url, '/api/customers/jobs/roof');
  assert.equal(sent.data.version, 4);
  assert.equal(sent.data.isActive, true);
  pending.error({ error: { message: 'This record changed. Reload before saving.' } });
  await saving;
  assert.equal(view.dirty, true);
  assert.equal(view.draft.name, 'Updated roof');
  assert.equal(view.job.version, 4);
  /** Accepts a job URL and payload; returns a confirmed save with the next version. */
  view.http.put = (url, data) => of({ data: { ...view.job, ...data, version: 5 } });
  await view.save();
  assert.equal(view.job.version, 5);
  assert.equal(view.dirty, false);
  assert.equal(view.jobs[1].name, 'Other');
});

/** Accepts no input; verifies a slow previous job cannot replace the currently opened workspace. */
test('job navigation ignores stale detail reads', async () => {
  const { JobViewComponent } = component('job-view/job-view.component.ts');
  const older = new Subject();
  const view = new JobViewComponent({
    /** Accepts a detail/context URL; returns one delayed job and immediately available newer context. */
    get(url) {
      if (url.endsWith('/old')) return older;
      if (url.endsWith('/newer-job')) return of({ detailData: { jobSlug: 'newer-job', customerSlug: 'c', name: 'New', lane: 'planned', taskList: [] } });
      if (url === '/api/team') return of({ listData: [] });
      if (url.endsWith('/jobs')) return of({ listData: [], total: 1 });
      return of({ detailData: { slug: 'c', name: 'Customer' } });
    },
  }, {});
  const slow = view.load('old');
  await view.load('newer-job');
  older.next({ detailData: { jobSlug: 'old', customerSlug: 'c' } });
  older.complete();
  await slow;
  assert.equal(view.job.jobSlug, 'newer-job');
  assert.equal(view.draft.name, 'New');
  assert.equal(view.loading, false);
});

/** Accepts no input; verifies scoped files filter across the current job and stale pages cannot replace new ones. */
test('job files use job and tag filters and ignore superseded reads', async () => {
  const { FileUtilComponent } = component('file-util/file-util.component.ts');
  const replies = [new Subject(), new Subject()];
  const queries = [];
  const files = new FileUtilComponent({
    /** Accepts a file query; records its scope and returns a controlled page. */
    get(url, options) { if (url.endsWith('/file-tags')) return of({ listData: ['scope'] }); queries.push(options.params); return replies[queries.length - 1]; },
  }, {});
  files.customer = { slug: 'c' };
  files.scopeJobSlug = 'one';
  files.activeTag = 'scope';
  const old = files.load();
  files.scopeJobSlug = 'two';
  const current = files.load();
  replies[1].next({ listData: [{ name: 'Current' }], total: 1 }); replies[1].complete();
  await current;
  replies[0].next({ listData: [{ name: 'Old' }], total: 1 }); replies[0].complete();
  await old;
  assert.equal(queries[0].jobSlug, 'one');
  assert.equal(queries[0].tag, 'scope');
  assert.equal(Object.hasOwn(queries[0], 'folder'), false);
  assert.equal(files.files[0].name, 'Current');
});

/** Accepts no input; verifies declining navigation preserves edits while explicit discard resolves a pending leave. */
test('job navigation requires an explicit discard decision for dirty drafts', async () => {
  const { JobViewComponent } = component('job-view/job-view.component.ts');
  const view = new JobViewComponent({}, {});
  view.job = { name: 'Work', lane: 'active', taskList: [] };
  view.resetDraft();
  assert.equal(view.canLeave(), true);
  view.draft.name = 'Unsaved';
  let leaving = view.canLeave();
  assert.equal(view.leavePrompt, true);
  view.resolveLeave(false);
  assert.equal(await leaving, false);
  assert.equal(view.draft.name, 'Unsaved');
  leaving = view.canLeave();
  view.resolveLeave(true);
  assert.equal(await leaving, true);
  assert.equal(view.leavePrompt, false);
  view.saving = true;
  assert.equal(view.canLeave(), false);
});

/** Accepts no input; verifies failed checklist writes never show an unsaved completion and successful writes refresh versions. */
test('board checklist merges confirmed writes and retains state on conflict', async () => {
  const { JobBoardComponent } = component('job-board.module.ts');
  let reject = true;
  const http = {
    /** Accepts a versioned job body; returns either a conflict or the confirmed update. */
    put(_url, body) {
      return reject
        ? throwError(() => ({
            error: { message: 'Job changed. Reload before saving.' },
          }))
        : of({ data: { ...body, version: 2 } });
    },
  };
  const board = new JobBoardComponent(http, { url: '/jobs' }, {}, {});
  const job = {
    jobSlug: 'job',
    name: 'Work',
    version: 1,
    taskList: [{ id: 'task', title: 'Inspect', done: false }],
  };
  await board.toggleTask(job, job.taskList[0]);
  assert.equal(job.taskList[0].done, false);
  assert.match(board.error, /Reload/);
  reject = false;
  await board.toggleTask(job, job.taskList[0]);
  assert.equal(job.taskList[0].done, true);
  assert.equal(job.version, 2);
  assert.equal(board.saving, '');
});

/** Accepts no input; verifies restored URLs and same-route Back changes load the requested job filters. */
test('board follows query changes and stops listening after destruction', () => {
  const { JobBoardComponent } = component('job-board.module.ts');
  const queryParamMap = new Subject();
  const queries = [];
  const http = {
    /** Accepts a team/job read; records filter parameters and returns an empty successful page. */
    get(url, options) {
      if (url === '/api/jobs') queries.push(options.params);
      return of({ listData: [], total: 0 });
    },
  };
  const board = new JobBoardComponent(
    http,
    { url: '/jobs' },
    { queryParamMap },
    {},
  );
  board.ngOnInit();
  queryParamMap.next(
    new Map([
      ['search', 'Deck'],
      ['priority', 'high'],
      ['overdue', 'true'],
    ]),
  );
  assert.equal(queries[0].search, 'Deck');
  assert.equal(queries[0].priority, 'high');
  assert.equal(queries[0].overdue, true);
  queryParamMap.next(new Map());
  assert.equal(queries[1].search, '');
  assert.equal(queries[1].overdue, false);
  board.ngOnDestroy();
  queryParamMap.next(new Map([['search', 'Ignored']]));
  assert.equal(queries.length, 2);
});

/** Accepts no input; checks valid, missing, reversed, equal and invalid local appointment timestamps. */
test('calendar validates appointment ranges before submitting', () => {
  const { appointmentTimeRange } = component('calendar/calendar.component.ts');
  assert.equal(appointmentTimeRange({ value: { start: '', end: '' } }), null);
  assert.equal(
    appointmentTimeRange({
      value: { start: '2026-10-01T09:00', end: '2026-10-01T10:00' },
    }),
    null,
  );
  for (const end of ['2026-10-01T08:00', '2026-10-01T09:00', 'invalid']) {
    assert.equal(
      appointmentTimeRange({ value: { start: '2026-10-01T09:00', end } })
        .timeRange,
      true,
    );
  }
});

/** Accepts no input; verifies calendar pagination stops if concurrent deletions leave an empty final page. */
test('calendar pagination terminates on an empty page', async () => {
  const { CustomerCalendarComponent } = component(
    'calendar/calendar.component.ts',
  );
  let reads = 0;
  const calendar = new CustomerCalendarComponent(
    {
      /** Accepts an appointment read; returns an empty page with a stale total. */
      get() {
        reads++;
        return of({ listData: [], total: 3 });
      },
    },
    {},
    { group },
  );
  await calendar.fetchEvents();
  assert.equal(reads, 1);
  assert.equal(calendar.loading, false);
});

/** Accepts no input; verifies newer customer searches win races and failures preserve the confirmed page. */
test('customer search ignores stale responses and recovers after a failed page', async () => {
  const { CustomerListComponent } = component(
    'components/customer-list/customer-list.component.ts',
  );
  const replies = [new Subject(), new Subject(), new Subject(), new Subject()];
  const calls = [];
  const list = new CustomerListComponent({
    /** Accepts a customer URL and query options; returns a controlled response for request-order checks. */
    get(url, options) {
      calls.push(options.params);
      return replies[calls.length - 1];
    },
  });
  list.search = 'older';
  const older = list.load();
  list.search = 'newer';
  const newer = list.load();
  replies[1].next({ listData: [{ name: 'Newer' }], total: 26 });
  replies[1].complete();
  await newer;
  replies[0].next({ listData: [{ name: 'Older' }], total: 99 });
  replies[0].complete();
  await older;
  assert.equal(list.customers[0].name, 'Newer');
  assert.equal(list.total, 26);
  assert.equal(list.loading, false);
  const failed = list.load(25);
  replies[2].error({ error: { message: 'Temporary failure' } });
  await failed;
  assert.equal(list.offset, 0);
  assert.equal(list.customers[0].name, 'Newer');
  assert.equal(list.error, 'Temporary failure');
  const retry = list.load(25);
  assert.equal(list.error, '');
  replies[3].next({ listData: [{ name: 'Last page' }], total: 26 });
  replies[3].complete();
  await retry;
  assert.equal(list.offset, 25);
  assert.equal(list.loading, false);
  assert.equal(calls[1].search, 'newer');
});
