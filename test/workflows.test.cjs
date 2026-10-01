const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const directory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'prime-original-test-'),
);
const root = path.resolve(__dirname, '..');
const origin = 'http://localhost:39617';
let child,
  logs = '',
  cookie = '',
  token = '';
/** Accepts no arguments; starts the compiled PPM API against an isolated test database. */
async function start() {
  logs = '';
  child = spawn(process.execPath, ['dist/api/apps/api/src/main.js'], {
    cwd: root,
    env: {
      ...process.env,
      MGMT_DATA_DIR: directory,
      MGMT_PORT: '39617',
      MGMT_ORIGIN: origin,
    },
    windowsHide: true,
  });
  child.stdout.on('data', (data) => (logs += data));
  child.stderr.on('data', (data) => (logs += data));
  for (let i = 0; i < 150; i++) {
    if (logs.includes('Prime Project Manager:')) return;
    if (child.exitCode !== null) throw new Error(logs);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Server startup timed out: ' + logs);
}
/** Accepts no arguments; stops the test server and waits until its port is released. */
async function stop() {
  if (!child || child.exitCode !== null) return;
  const exited = new Promise((resolve) => child.once('exit', resolve));
  child.kill();
  await exited;
}
/** Accepts method, API path, body and overrides; returns the raw HTTP response with test authentication. */
async function request(method, url, body, headers = {}) {
  const multipart = body instanceof FormData;
  return fetch(origin + '/api' + url, {
    method,
    headers: {
      Origin: origin,
      Cookie: cookie,
      'X-CSRF-Token': token,
      ...(body && !multipart ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? (multipart ? body : JSON.stringify(body)) : undefined,
  });
}
/** Accepts an HTTP response and status; verifies it and returns its decoded JSON body. */
async function json(response, status = 200) {
  assert.equal(response.status, status, await response.clone().text());
  return response.json();
}
/** Accepts a Host value; returns the readiness status using a raw request that preserves that header. */
function readinessStatus(host) {
  return new Promise((resolve, reject) => {
    const probe = http.get(
      origin + '/api/health',
      { headers: { Host: host }, timeout: 4000 },
      (response) => {
        response.resume();
        resolve(response.statusCode);
      },
    );
    probe.on('error', reject);
    probe.on('timeout', () =>
      probe.destroy(new Error('Readiness probe timed out')),
    );
  });
}
/** Accepts an authentication response; stores its cookie and CSRF token for subsequent requests. */
async function session(response) {
  const result = await json(response, 201);
  cookie = response.headers.get('set-cookie').split(';')[0];
  token = result.data.token;
  assert.match(response.headers.get('set-cookie'), /HttpOnly/);
  return result.data;
}
/** Accepts a file buffer/name/category; creates a browser-equivalent multipart upload. */
function upload(bytes, name, category = 'photo') {
  const form = new FormData();
  form.append('file', new Blob([bytes]), name);
  form.append('category', category);
  return form;
}
/** Accepts no arguments; removes only this test's verified temporary directory after stopping its process. */
after(async () => {
  await stop();
  assert.ok(
    path
      .resolve(directory)
      .startsWith(
        path.resolve(os.tmpdir()) + path.sep + 'prime-original-test-',
      ),
  );
  fs.rmSync(directory, { recursive: true, force: true });
});
/** Accepts the test context; exercises PPM routes, persistence and security against real HTTP. */
test('PPM application workflows', async (t) => {
  await start();
  await t.test(
    'readiness is public, minimal and still enforces the configured Host',
    async () => {
      const health = await json(await request('GET', '/health'));
      assert.deepEqual(health, { status: 'ok' });
      assert.equal(await readinessStatus('invalid.example'), 403);
    },
  );
  let customer, job, event, file, admin, staff, comment;
  await t.test(
    'first-run setup is protected and creates one administrator',
    async () => {
      assert.equal((await json(await request('GET', '/setup'))).required, true);
      await json(await request('POST', '/setup', { code: 'wrong' }), 403);
      admin = await session(
        await request('POST', '/setup', {
          code: logs.match(/First-run setup code: (\w+)/)[1],
          username: 'Review Admin',
          email: 'admin@example.test',
          password: 'Testing-Original-2026!',
        }),
      );
      assert.equal(admin.role, 'admin');
      await json(await request('POST', '/setup', {}), 409);
    },
  );
  await t.test(
    'authentication, CSRF, origin and page bounds are enforced',
    async () => {
      await json(await request('GET', '/customers', null, { Cookie: '' }), 401);
      await json(
        await request(
          'POST',
          '/customers',
          { name: 'Rejected' },
          { 'X-CSRF-Token': '' },
        ),
        403,
      );
      await json(
        await request(
          'POST',
          '/customers',
          { name: 'Rejected' },
          { Origin: 'https://attacker.example' },
        ),
        403,
      );
      await json(await request('GET', '/customers?limit=0'), 400);
    },
  );
  await t.test(
    'customer creation, safe notes, version conflict and filters',
    async () => {
      customer = (
        await json(
          await request('POST', '/customers', {
            name: 'Review Customer',
            isActive: true,
            body: '<p>Scope</p><script>alert(1)</script>',
          }),
          201,
        )
      ).data;
      assert.equal(customer.body, '<p>Scope</p>');
      await json(
        await request('PUT', '/customers/' + customer.slug, {
          ...customer,
          version: 0,
        }),
        409,
      );
      customer = (
        await json(
          await request('PUT', '/customers/' + customer.slug, {
            ...customer,
            phone: '555-0100',
          }),
        )
      ).data;
      assert.equal(
        (await json(await request('GET', '/customers?search=Review&limit=1')))
          .total,
        1,
      );
    },
  );
  await t.test(
    'jobs move through planned, active and completed boards',
    async () => {
      job = (
        await json(
          await request('POST', `/customers/${customer.slug}/jobs`, {
            name: 'Roof repair',
          }),
          201,
        )
      ).data;
      job = (
        await json(
          await request('PUT', '/customers/jobs/' + job.jobSlug, {
            ...job,
            lane: 'active',
            isActive: true,
            body: 'Replace shingles',
          }),
        )
      ).data;
      assert.equal(
        (await json(await request('GET', '/jobs'))).listData[0].name,
        'Roof repair',
      );
      job = (
        await json(
          await request('PUT', '/customers/jobs/' + job.jobSlug, {
            ...job,
            lane: 'complete',
            isComplete: true,
          }),
        )
      ).data;
      assert.equal(
        (await json(await request('GET', '/jobs?complete=true'))).total,
        1,
      );
    },
  );
  await t.test(
    'calendar creates, edits and validates appointments',
    async () => {
      event = (
        await json(
          await request('POST', `/customers/${customer.slug}/calendar`, {
            subject: 'Site visit',
            start: '2026-10-01T09:00:00-05:00',
            end: '2026-10-01T10:00:00-05:00',
          }),
          201,
        )
      ).data;
      assert.equal(event.start, '2026-10-01T14:00:00.000Z');
      event = (
        await json(
          await request('PUT', '/calendar/' + event.calendarSlug, {
            ...event,
            subject: 'Inspection',
          }),
        )
      ).data;
      await json(
        await request('PUT', '/calendar/' + event.calendarSlug, {
          ...event,
          end: event.start,
        }),
        400,
      );
      assert.equal(
        (
          await json(
            await request('GET', '/customers/calendar/' + customer.slug),
          )
        ).total,
        1,
      );
      await json(
        await request('PUT', '/calendar/' + event.calendarSlug, {
          ...event,
          start: '2026-02-30T09:00:00Z',
        }),
        400,
      );
    },
  );
  /** Accepts no input; verifies job calendars exclude general/other-job visits and reject cross-customer associations. */
  await t.test('job appointments are scoped, versioned and bound to the right customer', async () => {
    const visit = { subject: 'Job inspection', start: '2026-10-03T14:00:00Z', end: '2026-10-03T15:00:00Z', jobSlug: job.jobSlug };
    const created = (await json(await request('POST', `/customers/${customer.slug}/calendar`, visit), 201)).data;
    const scoped = await json(await request('GET', `/customers/calendar/${customer.slug}?jobSlug=${job.jobSlug}`));
    assert.equal(scoped.total, 1);
    assert.equal(scoped.listData[0].calendarSlug, created.calendarSlug);
    assert.equal((await json(await request('GET', `/customers/calendar/${customer.slug}?jobSlug=`))).total, 1);
    const updated = (await json(await request('PUT', '/calendar/' + created.calendarSlug, { ...created, subject: 'Updated inspection' }))).data;
    assert.equal(updated.jobSlug, job.jobSlug);
    await json(await request('PUT', '/calendar/' + created.calendarSlug, created), 409);
    const other = (await json(await request('POST', '/customers', { name: 'Another customer' }), 201)).data;
    await json(await request('POST', `/customers/${other.slug}/calendar`, visit), 400);
    await json(await request('GET', `/customers/calendar/${other.slug}?jobSlug=${job.jobSlug}`), 400);
    await json(await request('PUT', '/calendar/' + event.calendarSlug, { ...event, jobSlug: 'missing-job' }), 400);
    assert.equal((await json(await request('GET', '/customers/jobs/' + job.jobSlug))).detailData.customerSlug, customer.slug);
    await json(await request('GET', '/customers/jobs/missing-job'), 404);
  });
  await t.test(
    'customer and team discussions preserve safe formatting',
    async () => {
      comment = (
        await json(
          await request('POST', `/customers/${customer.slug}/comments`, {
            body: '<p><strong>Approved</strong><img src=x onerror=alert(1)></p>',
          }),
          201,
        )
      ).data;
      assert.equal(comment.body, '<p><strong>Approved</strong></p>');
      await json(
        await request('POST', '/customers/__team__/comments', {
          body: 'Team update',
        }),
        201,
      );
      assert.equal(
        (await json(await request('GET', '/customers/__team__/comments')))
          .total,
        1,
      );
    },
  );
  await t.test(
    'owners, priorities, deadlines and checklists are validated and filterable',
    async () => {
      job = (
        await json(
          await request('PUT', '/customers/jobs/' + job.jobSlug, {
            ...job,
            assigneeId: admin.id,
            dueDate: '2026-01-10',
            priority: 'urgent',
            taskList: [{ id: 'scope', title: 'Confirm scope', done: true }],
          }),
        )
      ).data;
      assert.equal(job.taskList[0].done, true);
      assert.equal(
        (
          await json(
            await request(
              'GET',
              '/jobs?complete=true&assignee=' + admin.id + '&priority=urgent',
            ),
          )
        ).total,
        1,
      );
      await json(
        await request('PUT', '/customers/jobs/' + job.jobSlug, {
          ...job,
          dueDate: '2026-02-30',
        }),
        400,
      );
      await json(
        await request('PUT', '/customers/jobs/' + job.jobSlug, {
          ...job,
          assigneeId: 'missing',
        }),
        400,
      );
      await json(
        await request('PUT', '/customers/jobs/' + job.jobSlug, {
          ...job,
          taskList: [{ id: 'x', title: 'bad', done: 'yes' }],
        }),
        400,
      );
      assert.equal(
        (await json(await request('GET', '/team'))).listData[0].id,
        admin.id,
      );
    },
  );
  await t.test(
    'authors can edit messages with conflict protection',
    async () => {
      const result = await json(
        await request(
          'PUT',
          `/customers/${customer.slug}/comments/${comment.id}`,
          { body: '<p>Edited update</p>', version: comment.version },
        ),
      );
      assert.equal(result.data.body, '<p>Edited update</p>');
      assert.equal(result.data.version, comment.version + 1);
      await json(
        await request(
          'PUT',
          `/customers/${customer.slug}/comments/${comment.id}`,
          { body: 'Stale edit', version: comment.version },
        ),
        409,
      );
      comment = result.data;
    },
  );
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
    'base64',
  );
  /** Accepts no input; verifies one message per board, combined history, exact general/job filtering and immutable associations during edits. */
  await t.test('job boards combine once on the customer and reject unrelated associations', async () => {
    const sibling = (await json(await request('POST', `/customers/${customer.slug}/jobs`, { name: 'Sibling job' }), 201)).data;
    const first = (await json(await request('POST', `/customers/${customer.slug}/comments`, { body: '<p>First job update</p>', jobSlug: job.jobSlug }), 201)).data;
    const second = (await json(await request('POST', `/customers/${customer.slug}/comments`, { body: '<p>Sibling update</p>', jobSlug: sibling.jobSlug }), 201)).data;
    const combined = await json(await request('GET', `/customers/${customer.slug}/comments`));
    assert.equal(new Set(combined.listData.map((row) => row.id)).size, combined.total);
    assert.ok(combined.listData.some((row) => row.id === first.id && row.jobName === job.name));
    assert.ok(combined.listData.some((row) => row.id === second.id));
    const scoped = await json(await request('GET', `/customers/${customer.slug}/comments?jobSlug=${job.jobSlug}`));
    assert.equal(scoped.total, 1); assert.equal(scoped.listData[0].id, first.id);
    const general = await json(await request('GET', `/customers/${customer.slug}/comments?jobSlug=`));
    assert.ok(general.listData.every((row) => row.jobSlug === ''));
    assert.ok(general.listData.some((row) => row.id === comment.id));
    const pageOne = await json(await request('GET', `/customers/${customer.slug}/comments?limit=1&offset=0`));
    const pageTwo = await json(await request('GET', `/customers/${customer.slug}/comments?limit=1&offset=1`));
    assert.notEqual(pageOne.listData[0].id, pageTwo.listData[0].id);
    const edited = (await json(await request('PUT', `/customers/${customer.slug}/comments/${first.id}`, { body: '<p>Updated job message</p>', version: first.version, jobSlug: sibling.jobSlug }))).data;
    assert.equal(edited.jobSlug, job.jobSlug);
    await json(await request('PUT', `/customers/${customer.slug}/comments/${first.id}`, { body: 'Stale', version: first.version }), 409);
    const other = (await json(await request('POST', '/customers', { name: 'Unrelated board customer' }), 201)).data;
    await json(await request('POST', `/customers/${other.slug}/comments`, { body: 'Wrong board', jobSlug: job.jobSlug }), 400);
    await json(await request('GET', `/customers/${other.slug}/comments?jobSlug=${job.jobSlug}`), 400);
    await json(await request('POST', '/customers/__team__/comments', { body: 'Wrong team board', jobSlug: job.jobSlug }), 400);
    await json(await request('GET', `/customers/${customer.slug}/comments?jobSlug=missing`), 400);
  });
  await t.test(
    'images render inline and download byte-for-byte with authentication',
    async () => {
      file = (
        await json(
          await request(
            'POST',
            `/customers/${customer.slug}/files`,
            upload(png, 'review.png'),
          ),
          201,
        )
      ).data;
      let response = await request('GET', `/files/${file.id}/view`);
      assert.equal(response.headers.get('content-type'), 'image/png');
      assert.match(response.headers.get('content-disposition'), /^inline/);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), png);
      response = await request('GET', `/files/${file.id}/download`);
      assert.match(response.headers.get('content-disposition'), /^attachment/);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), png);
      await json(
        await request('GET', `/files/${file.id}/view`, null, { Cookie: '' }),
        401,
      );
      assert.equal(
        (await json(await request('GET', `/customers/${customer.slug}/files`)))
          .listData[0].content,
        undefined,
      );
    },
  );
  await t.test('selected files download as a valid stored ZIP', async () => {
    const response = await request(
      'POST',
      `/customers/${customer.slug}/files/download`,
      { ids: [file.id] },
    );
    assert.equal(response.status, 201);
    assert.equal(response.headers.get('content-type'), 'application/zip');
    const zip = Buffer.from(await response.arrayBuffer());
    assert.equal(zip.readUInt32LE(0), 0x04034b50);
    const offset = 30 + zip.readUInt16LE(26);
    assert.deepEqual(zip.subarray(offset, offset + zip.readUInt32LE(18)), png);
    assert.equal(zip.readUInt32LE(zip.length - 22), 0x06054b50);
  });
  await t.test(
    'files can be renamed, tagged and attached to jobs',
    async () => {
      file = (
        await json(
          await request('PUT', '/files/' + file.id, {
            ...file,
            name: 'inspection.png',
            tags: ['Inspection', ' inspection ', 'photos'],
            jobSlug: job.jobSlug,
          }),
        )
      ).data;
      assert.deepEqual(file.tags, ['inspection', 'photos']);
      const scopedFiles = await json(await request('GET', `/customers/${customer.slug}/files?jobSlug=${job.jobSlug}`));
      assert.equal(scopedFiles.total, 1);
      assert.equal(scopedFiles.listData[0].id, file.id);
      assert.equal((await json(await request('GET', `/customers/${customer.slug}/files?jobSlug=`))).total, 0);
      await json(await request('GET', `/customers/${customer.slug}/files?jobSlug=missing-job`), 400);
      assert.equal(
        (
          await json(
            await request('GET', `/customers/${customer.slug}/files?tag=not-present`),
          )
        ).total,
        0,
      );
      assert.equal(
        (
          await json(
            await request(
              'GET',
              `/customers/${customer.slug}/files?tag=inspection`,
            ),
          )
        ).total,
        1,
      );
    },
  );
  /** Accepts no input; verifies uploading from a job retains its association and tags and rejects unrelated jobs. */
  await t.test('job uploads retain scope while sibling jobs stay separate', async () => {
    const form = upload(Buffer.from('Fictional quote'), 'quote.txt', 'document');
    form.append('jobSlug', job.jobSlug);
    form.append('tags', JSON.stringify(['Quote', 'document']));
    const quote = (await json(await request('POST', `/customers/${customer.slug}/files`, form), 201)).data;
    assert.equal(quote.jobSlug, job.jobSlug);
    assert.deepEqual(quote.tags, ['quote', 'document']);
    const scoped = await json(await request('GET', `/customers/${customer.slug}/files?jobSlug=${job.jobSlug}`));
    assert.equal(scoped.total, 2);
    assert.ok(scoped.listData.some((row) => row.id === quote.id));
    const sibling = (await json(await request('POST', `/customers/${customer.slug}/jobs`, { name: 'Separate work' }), 201)).data;
    assert.equal((await json(await request('GET', `/customers/${customer.slug}/files?jobSlug=${sibling.jobSlug}`))).total, 0);
    const wrong = upload(Buffer.from('Rejected quote'), 'wrong.txt', 'document');
    wrong.append('jobSlug', 'missing-job');
    await json(await request('POST', `/customers/${customer.slug}/files`, wrong), 400);
  });
  /** Accepts no input; verifies tag filtering matches whole labels, tag choices cover the full scope, and malformed metadata cannot be saved. */
  await t.test('file tags filter exact labels, combine with search and preserve data on rejection', async () => {
    const exact = await json(await request('GET', `/customers/${customer.slug}/files?tag=QUOTE&search=quote`));
    assert.equal(exact.total, 1);
    assert.equal((await json(await request('GET', `/customers/${customer.slug}/files?tag=quo`))).total, 0);
    const choices = await json(await request('GET', `/customers/${customer.slug}/file-tags?jobSlug=${job.jobSlug}`));
    assert.deepEqual(choices.listData, ['document', 'inspection', 'photos', 'quote']);
    await json(await request('PUT', '/files/' + file.id, { ...file, tags: ['x'.repeat(201)] }), 400);
    await json(await request('PUT', '/files/' + file.id, { ...file, tags: [''] }), 400);
    await json(await request('PUT', '/files/' + file.id, { ...file, tags: Array.from({ length: 21 }, (_, i) => 'tag' + i) }), 400);
    const malformed = upload(Buffer.from('No data'), 'bad-tags.txt', 'document'); malformed.append('tags', 'not-json');
    await json(await request('POST', `/customers/${customer.slug}/files`, malformed), 400);
    const unchanged = await json(await request('GET', `/customers/${customer.slug}/files?tag=inspection`));
    assert.deepEqual(unchanged.listData[0].tags, ['inspection', 'photos']);
  });
  await t.test(
    'unsafe uploads remain downloads and cannot become avatars',
    async () => {
      const form = upload(Buffer.from('<script>alert(1)</script>'), 'fake.png');
      const row = (
        await json(
          await request('POST', `/customers/${customer.slug}/files`, form),
          201,
        )
      ).data;
      assert.equal(row.fileType, 'application/octet-stream');
      assert.match(
        (await request('GET', `/files/${row.id}/view`)).headers.get(
          'content-disposition',
        ),
        /^attachment/,
      );
      await json(
        await request(
          'POST',
          `/customers/${customer.slug}/files`,
          upload(Buffer.from('no image'), 'fake.png', 'avatar'),
        ),
        400,
      );
    },
  );
  const adminCookie = cookie,
    adminToken = token;
  await t.test(
    'staff creation preserves admin session and enforces roles and ownership',
    async () => {
      staff = (
        await json(
          await request('POST', '/users', {
            username: 'Staff',
            email: 'staff@example.test',
            password: 'Testing-Staff-2026!',
          }),
          201,
        )
      ).data;
      assert.equal(
        (await json(await request('GET', '/user'))).detailData.id,
        admin.id,
      );
      await session(
        await request('POST', '/users/login', {
          email: staff.email,
          password: 'Testing-Staff-2026!',
        }),
      );
      await json(await request('GET', '/staff'), 403);
      await json(
        await request(
          'PUT',
          `/customers/${customer.slug}/comments/${comment.id}`,
          { body: 'Not mine', version: comment.version },
        ),
        403,
      );
      await json(await request('DELETE', '/files/' + file.id), 403);
      await json(
        await request(
          'DELETE',
          `/customers/${customer.slug}/comments/${comment.id}`,
        ),
        403,
      );
    },
  );
  const staffCookie = cookie,
    staffToken = token;
  cookie = adminCookie;
  token = adminToken;
  await t.test('disabling staff revokes existing sessions', async () => {
    await json(await request('PUT', '/staff/' + staff.id, { active: false }));
    await json(
      await request('GET', '/user', null, {
        Cookie: staffCookie,
        'X-CSRF-Token': staffToken,
      }),
      401,
    );
  });
  await t.test(
    'customer archival preserves history and can be restored',
    async () => {
      await json(await request('DELETE', '/customers/' + customer.slug));
      assert.equal(
        (await json(await request('GET', '/customers?isArchived=true'))).total,
        1,
      );
      customer = (
        await json(await request('GET', '/customers/' + customer.slug))
      ).detailData;
      customer = (
        await json(
          await request('PUT', '/customers/' + customer.slug, {
            ...customer,
            isArchived: false,
            isActive: true,
          }),
        )
      ).data;
    },
  );
  await t.test(
    'database and protected files survive process restart',
    async () => {
      await stop();
      await start();
      assert.equal(
        (await json(await request('GET', '/setup'))).required,
        false,
      );
      assert.equal(
        (await json(await request('GET', '/customers/' + customer.slug)))
          .detailData.phone,
        '555-0100',
      );
      assert.deepEqual(
        Buffer.from(
          await (
            await request('GET', `/files/${file.id}/download`)
          ).arrayBuffer(),
        ),
        png,
      );
    },
  );
  await t.test(
    'profile-only edits need no password and preserve the session',
    async () => {
      const response = await request('PUT', '/users', {
        username: 'Review Admin',
        email: 'admin@example.test',
        bio: 'Team lead',
        jobTitle: 'Project manager',
        phone: '555-0110',
        image: '',
      });
      const result = await json(response);
      cookie = response.headers.get('set-cookie').split(';')[0];
      token = result.data.token;
      assert.equal(result.data.jobTitle, 'Project manager');
      assert.equal(
        (await json(await request('GET', '/user'))).detailData.phone,
        '555-0110',
      );
      await json(
        await request('PUT', '/users', {
          username: 'Review Admin',
          email: 'other@example.test',
        }),
        400,
      );
    },
  );
  await t.test(
    'profile changes require current password and rotate sessions',
    async () => {
      const data = {
        username: 'Review Admin',
        email: 'admin@example.test',
        bio: 'Updated profile',
        image: '',
        currentPassword: 'wrong',
      };
      await json(await request('PUT', '/users', data), 400);
      const oldCookie = cookie;
      const response = await request('PUT', '/users', {
        ...data,
        email: 'updated@example.test',
        currentPassword: 'Testing-Original-2026!',
      });
      const result = await json(response);
      cookie = response.headers.get('set-cookie').split(';')[0];
      token = result.data.token;
      assert.equal(result.data.bio, 'Updated profile');
      await json(
        await request('GET', '/user', null, { Cookie: oldCookie }),
        401,
      );
      assert.equal(
        (await json(await request('GET', '/profiles/Review%20Admin')))
          .detailData.username,
        'Review Admin',
      );
    },
  );
  // Accepts the shared HTTP fixture; verifies dashboard selection, server ordering and paginated search.
  await t.test(
    'attention dashboard and live-search filters select and order only matching open work',
    async () => {
      for (const [name, priority, dueDate, lane] of [
        ['Focus urgent', 'urgent', '2099-01-01', 'planned'],
        ['Focus overdue', 'normal', '2000-01-01', 'active'],
        ['Focus upcoming', 'normal', '2099-01-01', 'planned'],
        ['Focus finished', 'urgent', '2000-01-01', 'complete'],
      ]) {
        const created = (
          await json(
            await request('POST', '/customers/' + customer.slug + '/jobs', {
              name,
            }),
            201,
          )
        ).data;
        await json(
          await request('PUT', '/customers/jobs/' + created.jobSlug, {
            ...created,
            name,
            priority,
            dueDate,
            lane,
            isActive: lane === 'active',
            isComplete: lane === 'complete',
          }),
        );
      }
      const focus = await json(
        await request('GET', '/jobs?attention=true&search=Focus'),
      );
      assert.deepEqual(
        focus.listData.map((row) => row.name),
        ['Focus overdue', 'Focus urgent'],
      );
      const page = await json(
        await request(
          'GET',
          '/jobs?attention=true&search=Focus&limit=1&offset=1',
        ),
      );
      assert.equal(page.total, 2);
      assert.equal(page.listData[0].name, 'Focus urgent');
      const active = await json(
        await request('GET', '/jobs?search=Focus&lane=active'),
      );
      assert.equal(active.total, 1);
      assert.equal(active.listData[0].name, 'Focus overdue');
      assert.equal(
        (await json(await request('GET', '/jobs?search=NoMatchingJobHere')))
          .total,
        0,
      );
      await json(await request('GET', '/jobs?lane=invalid'), 400);
    },
  );
  await t.test('logout revokes old authentication cookies', async () => {
    await json(await request('POST', '/users/logout', {}), 201);
    await json(await request('GET', '/user'), 401);
  });
});
