import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'node:crypto';
import { User } from '../user.entity';
import { SKIP_AUTH_KEY } from '../skip-auth';
import { runtime } from '@mgmt/shared/api/config/src/lib/runtime';
@Injectable()
export class JwtAuthGuard implements CanActivate {
  /** Accepts metadata, token verifier and repository; stores dependencies for each request. */
  constructor(
    private reflector: Reflector,
    private jwt: JwtService,
    @InjectRepository(User) private users: Repository<User>,
  ) {}
  /** Accepts request context; validates the signed cookie, account state and mutation CSRF token. */
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const mutation = !['GET', 'HEAD'].includes(req.method);
    if (mutation && req.headers.origin !== runtime.origin)
      throw new ForbiddenException('Origin is not allowed.');
    // Inspect the matched route template, so alternate casing/encoding cannot bypass demo restrictions.
    const route = req.route?.path;
    if (runtime.sandbox && mutation &&
      (['/api/setup', '/api/users', '/api/staff/:id'].includes(route) ||
        (req.method === 'POST' && route === '/api/customers/:slug/files')))
      throw new ForbiddenException('Account changes and uploads are disabled in the shared demo.');
    if (
      this.reflector.getAllAndOverride(SKIP_AUTH_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const token = req.headers.cookie
      ?.split(';')
      .map((s: string) => s.trim())
      .find((s: string) => s.startsWith(runtime.cookieName + '='))
      ?.slice(runtime.cookieName.length + 1);
    if (!token) throw new UnauthorizedException();
    let payload;
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException();
    }
    const user = await this.users.findOneBy({ id: payload.sub, active: true });
    if (!user || payload.v !== user.sessionVersion)
      throw new UnauthorizedException();
    if (
      mutation &&
      req.headers['x-csrf-token'] !==
        createHash('sha256').update(token).digest('hex')
    )
      throw new ForbiddenException('Invalid session security token.');
    req.user = { ...user, sub: user.id };
    return true;
  }
}
