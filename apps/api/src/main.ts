import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import {
  runtime,
  dataDirectory,
} from '@mgmt/shared/api/config/src/lib/runtime';
import { UserService } from '@mgmt/user/api/shared';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import express from 'express';
import { resolve } from 'node:path';
/** Accepts no input; starts the API and serves the compiled Angular application. Resolves when listening. */
async function bootstrap() {
  const origin = new URL(runtime.origin);
  if (
    origin.origin !== runtime.origin ||
    (!['localhost', '127.0.0.1'].includes(origin.hostname) &&
      origin.protocol !== 'https:')
  )
    throw new Error('Configure an exact HTTPS origin for remote use.');
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          'script-src': ["'self'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'blob:', 'data:', 'https:'],
          'upgrade-insecure-requests': null,
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use((req, res, next) => {
    if (req.headers.host !== origin.host)
      return res.status(403).json({ message: 'Use ' + runtime.origin });
    if (req.path.startsWith('/api/'))
      res.setHeader('Cache-Control', 'no-store');
    next();
  });
  // Readiness exposes no account or setup information and retains the exact Host check above.
  app.use('/api/health', (req, res, next) => {
    if (req.method === 'GET') return res.json({ status: 'ok' });
    next();
  });
  app.use(
    '/api/users/login',
    rateLimit({
      windowMs: 900000,
      limit: 30,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
    }),
  );
  app.use(
    '/api/setup',
    rateLimit({
      windowMs: 900000,
      limit: 10,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
    }),
  );
  if (runtime.sandbox) {
    // Bound shared traffic without trusting client-supplied forwarding headers.
    app.use('/api', rateLimit({ windowMs: 60000, limit: 600,
      standardHeaders: 'draft-8', legacyHeaders: false }));
  }
  const web = resolve('dist/apps/mgmtapp/browser');
  app.use(express.static(web, { index: false }));
  app.use((req, res, next) => {
    if (
      req.method === 'GET' &&
      !req.path.startsWith('/api/') &&
      !req.path.includes('.')
    )
      return res.sendFile(resolve(web, 'index.html'));
    next();
  });
  app.enableShutdownHooks();
  await app.listen(runtime.port, runtime.host);
  console.log(
    'Prime Project Manager: ' + runtime.origin + '\nData: ' + dataDirectory,
  );
  if ((await app.get(UserService).count()) === 0)
    console.log('First-run setup code: ' + runtime.setupCode);
}
bootstrap();
