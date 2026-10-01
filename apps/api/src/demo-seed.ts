import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { UserService } from '@mgmt/user/api/shared';
import {
  CustomerService,
  JobService,
  CalendarService,
  CommentService,
  FileSysService,
} from '@mgmt/customer/api/shared';
import {
  runtime,
  dataDirectory,
} from '@mgmt/shared/api/config/src/lib/runtime';
import { randomUUID } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { crc32, deflateSync } from 'node:zlib';
/** Accepts a relative day and optional hour; returns an ISO date near today so fixtures remain useful. */
function when(days: number, hour = 10) {
  const value = new Date();
  value.setDate(value.getDate() + days);
  value.setHours(hour, 0, 0, 0);
  return value.toISOString();
}
/** Accepts a PNG chunk type and payload; returns the encoded chunk with its verified checksum. */
function chunk(type: string, bytes: Buffer) {
  const tag = Buffer.from(type);
  const result = Buffer.alloc(bytes.length + 12);
  result.writeUInt32BE(bytes.length, 0);
  tag.copy(result, 4);
  bytes.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([tag, bytes])), bytes.length + 8);
  return result;
}
/** Accepts no input; generates an fictional site illustration as PNG bytes. */
function illustration() {
  const width = 480,
    height = 280;
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const offset = y * (width * 4 + 1) + 1 + x * 4;
      const house = x > 100 && x < 380 && y > 110 && y < 240;
      const roof = y > 50 && y < 120 && Math.abs(x - 240) < (y - 45) * 2;
      const window =
        house &&
        y > 140 &&
        y < 190 &&
        ((x > 130 && x < 185) || (x > 295 && x < 350));
      const door = house && x > 215 && x < 265 && y > 170;
      const color = window
        ? [141, 208, 255]
        : door
          ? [32, 38, 46]
          : roof
            ? [78, 104, 129]
            : house
              ? [198, 209, 219]
              : y > 240
                ? [83, 120, 99]
                : [42, 50, 61];
      raw.set([...color, 255], offset);
    }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
/** Accepts no input; seeds only a marked demo database once and preserves all subsequent tester edits. */
async function seed() {
  if (!runtime.demo)
    throw new Error('Seeding requires the dedicated demo launcher.');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });
  try {
    const users = app.get(UserService);
    if (await users.count()) {
      if (!existsSync(join(dataDirectory, '.seeded')))
        throw new Error(
          'Database already contains accounts but is not a completed demo seed.',
        );
      console.log('Using existing demo data; tester edits preserved.');
      return;
    }
    const customers = app.get(CustomerService),
      jobs = app.get(JobService),
      events = app.get(CalendarService),
      comments = app.get(CommentService),
      files = app.get(FileSysService);
    const accounts = [];
    for (const [username, email, jobTitle, role] of [
      ['Alex Morgan', 'demo.admin@example.test', 'Project manager', 'admin'],
      ['Jamie Chen', 'demo.staff@example.test', 'Site lead', 'staff'],
      ['Taylor Reed', 'demo.estimator@example.test', 'Estimator', 'staff'],
    ]) {
      const user = await users.register(
        { username, email, password: 'Prime-Demo-2026!' },
        role,
      );
      await users.repository.update(user.id, {
        jobTitle,
        phone: '555-010' + accounts.length,
        bio:
          username === 'Alex Morgan'
            ? 'I coordinate schedules, customer communication and project handoffs. This is a fictional demo profile.'
            : 'I help the team deliver clear estimates and well-organized site work. Fictional demo account.',
      });
      accounts.push(user);
    }
    const names = [
      'Maple House Renovation',
      'Riverbend Community Center',
      'Oak Street Kitchen',
      'Pinecrest Office Refresh',
      'Cedar Cottage Roof',
      'Lakeside Deck',
      'Willow Garage Conversion',
      'Elm Court Repairs',
    ];
    for (let i = 0; i < names.length; i++) {
      const customer = await customers.repository.save(
        customers.repository.create({
          slug: randomUUID(),
          name: names[i],
          email: `customer${i + 1}@example.test`,
          phone: `555-01${String(i + 10).padStart(2, '0')}`,
          address: `${100 + i * 10} Example Lane, Sample City`,
          body: '<p>Fictional project for testing customer records, scheduling and collaboration.</p>',
          authorId: accounts[i % 3].id,
          isLead: i > 5,
          isActive: i < 5,
          isComplete: i === 5,
          jobList: [],
          calendar: [],
          cstmrFilesShortL: [],
        }),
      );
      for (let j = 0; j < 2; j++) {
        const completed = i === 5;
        const lane = completed
          ? 'complete'
          : j === 0 && i < 5
            ? 'active'
            : 'planned';
        await jobs.repository.save(
          jobs.repository.create({
            customerSlug: customer.slug,
            jobSlug: randomUUID(),
            name:
              j === 0
                ? 'Site preparation & main work'
                : 'Inspection & customer handoff',
            body: '<p>Confirm the scope, coordinate materials and record progress before the next site visit.</p>',
            assigneeId: accounts[(i + j) % 3].id,
            dueDate: when(i + j - 2).slice(0, 10),
            priority: ['normal', 'high', 'urgent', 'low'][i % 4],
            lane,
            isActive: lane === 'active',
            isComplete: completed,
            taskList: [
              {
                id: randomUUID(),
                title: 'Confirm scope with customer',
                done: true,
              },
              {
                id: randomUUID(),
                title: 'Check materials and access',
                done: i % 2 === 0,
              },
              {
                id: randomUUID(),
                title: 'Capture progress photos',
                done: completed,
              },
            ],
          }),
        );
      }
      const primaryJob = await jobs.findOne({ customerSlug: customer.slug, name: 'Site preparation & main work' });
      await events.repository.save(
        events.repository.create({
          customerSlug: customer.slug,
          authorId: accounts[i % 3].id,
          calendarSlug: randomUUID(),
          jobSlug: primaryJob.jobSlug,
          subject: i > 5 ? 'Estimate walkthrough' : 'Site progress check',
          body: '<p>Review progress, access arrangements and any outstanding questions.</p>',
          start: when(i - 1, 10),
          end: when(i - 1, 11),
          apptDate: when(i - 1, 10),
        }),
      );
      for (let n = 0; n < 3; n++)
        await comments.repository.save(
          comments.repository.create({
            customerSlug: customer.slug,
            authorId: accounts[n % 3].id,
            body: [
              '<p>Scope and access notes are ready for review.</p>',
              '<p><strong>Materials update:</strong> delivery is planned before the next visit.</p>',
              '<p>Please add inspection photos to the Files tab after the walkthrough.</p>',
            ][n],
            createdAt: new Date(Date.now() - (3 - n) * 3600000),
          }),
        );
      const customerJobs = await jobs.findAll({ where: { customerSlug: customer.slug } });
      for (const job of customerJobs)
        for (let n = 0; n < 2; n++)
          await comments.repository.save(comments.repository.create({ customerSlug: customer.slug, jobSlug: job.jobSlug, authorId: accounts[n].id, body: n === 0 ? '<p>Job scope and access confirmed. Keep progress updates on this board.</p>' : '<p>Materials checked. Add photos tagged <strong>progress</strong> after the next visit.</p>' }));
      if (i < 3) {
        const image = illustration();
        await files.repository.save(
          files.repository.create({
            customerSlug: customer.slug,
            authorId: accounts[0].id,
            name: 'site-illustration.png',
            tags: ['site', 'progress'],
            jobSlug: primaryJob.jobSlug,
            fileType: 'image/png',
            fileSize: String(image.length),
            category: 'photo',
            content: image,
            currentDir: '',
          }),
        );
        const document = Buffer.from(
          'DEMO PROJECT BRIEF\nFictional customer and project.\nScope: prepare site, complete work, inspect, hand over.\n',
        );
        await files.repository.save(
          files.repository.create({
            customerSlug: customer.slug,
            authorId: accounts[0].id,
            name: 'project-brief.txt',
            tags: ['scope', 'document'],
            jobSlug: primaryJob.jobSlug,
            fileType: 'application/octet-stream',
            fileSize: String(document.length),
            category: 'document',
            content: document,
            currentDir: '',
          }),
        );
      }
    }
    const updates = [
      'Welcome to the demo workspace. Everything here is fictional and safe to edit.',
      'This week: confirm site access, review urgent jobs and check upcoming inspections.',
      'Use My jobs on the Job Board to see your assignments.',
      'The Files tab has sample documents and an illustration to test viewing and downloading.',
      'Try editing a message, adding checklist items and changing a job deadline.',
      'Enter sends a message. Shift+Enter starts a new line.',
    ];
    for (let i = 0; i < updates.length; i++)
      await comments.repository.save(
        comments.repository.create({
          customerSlug: '__team__',
          authorId: accounts[i % 3].id,
          body: `<p>${updates[i]}</p>`,
          createdAt: new Date(Date.now() - (updates.length - i) * 1800000),
        }),
      );
    writeFileSync(join(dataDirectory, '.seeded'), 'prime-demo-v1', {
      flag: 'wx',
    });
    console.log(
      'Seeded 3 teammates, 8 customers, 16 jobs, 8 appointments, 62 messages and 6 files.',
    );
  } finally {
    await app.close();
  }
}
seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
