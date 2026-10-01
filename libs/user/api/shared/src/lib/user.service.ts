import { runtime } from '@mgmt/shared/api/config/src/lib/runtime';
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { hash, compare } from 'bcryptjs';
import { createHash } from 'node:crypto';
import { User } from './user.entity';
import { BaseService } from '@mgmt/shared/api/foundation';
import { email, text } from '@mgmt/shared/api/validations/src/lib/input';

/** User operations keep password hashes and signed cookies out of response profiles. */
@Injectable()
export class UserService extends BaseService<User> {
  /** Accepts the user repository and JWT signer; initializes the existing feature service. */
  constructor(
    @InjectRepository(User) repository: Repository<User>,
    private jwt: JwtService,
  ) {
    super();
    this.repository = repository;
  }
  /** Accepts a password; returns its slow hash after enforcing length limits. */
  async hashPassword(value: any) {
    if (
      typeof value !== 'string' ||
      value.length < 12 ||
      Buffer.byteLength(value) > 72
    )
      throw new BadRequestException('Use a password of 12–72 UTF-8 bytes.');
    return hash(value, 12);
  }
  /** Accepts an entity; returns only its public profile and staff access fields. */
  profile(user: User) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      bio: user.bio,
      jobTitle: user.jobTitle,
      phone: user.phone,
      image: user.image,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
    };
  }
  /** Accepts a user and response; writes a signed HttpOnly cookie and returns profile plus CSRF token. */
  async session(user: User, res: any) {
    const signed = await this.jwt.signAsync(
      { sub: user.id, v: user.sessionVersion },
      { expiresIn: '8h' },
    );
    res.cookie(runtime.cookieName, signed, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.MGMT_ORIGIN?.startsWith('https:') || false,
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    });
    return {
      ...this.profile(user),
      token: createHash('sha256').update(signed).digest('hex'),
    };
  }
  /** Accepts login credentials; returns a verified account or a uniform authentication error. */
  async login(data: any) {
    const user = await this.repository.findOneBy({ email: email(data.email) });
    const valid = await compare(
      typeof data.password === 'string' ? data.password : '',
      user?.password ||
        '$2b$12$C6UzMDM.H6dfI/f/IKcEe.5QpUCzrCPdeDyQLLRY7xtGHOE5rvayK',
    );
    const current = user
      ? await this.repository.findOneBy({ id: user.id })
      : null;
    if (
      !current?.active ||
      current.sessionVersion !== user.sessionVersion ||
      !valid
    )
      throw new UnauthorizedException('Email or password is incorrect.');
    return user;
  }
  /** Accepts account fields and authorized role; returns the new saved account without signing it in. */
  async register(data: any, role = 'staff') {
    const username = text(data.username, 'Name', 60, true),
      address = email(data.email);
    const existing = await this.repository.findOne({
      where: [{ email: address }, { username }],
    });
    if (existing)
      throw new ConflictException('Email or name is already in use.');
    return this.repository.save(
      this.repository.create({
        username,
        email: address,
        password: await this.hashPassword(data.password),
        role,
        bio: '',
        image: '',
        active: true,
      }),
    );
  }
  /** Accepts user ID and editable profile; verifies current password and returns the changed account. */
  async updateUserInfo(id: string, data: any) {
    const user = await this.repository.findOneBy({ id });
    if (
      !user ||
      ((data.currentPassword ||
        email(data.email) !== user.email ||
        data.password) &&
        !(await compare(data.currentPassword || '', user.password)))
    )
      throw new BadRequestException('Current password is incorrect.');
    const credentialsChanged =
      email(data.email) !== user.email || !!data.password;
    user.email = email(data.email);
    user.username = text(data.username, 'Name', 60, true);
    user.bio = text(data.bio ?? '', 'Bio', 1000);
    user.jobTitle = text(
      data.jobTitle ?? user.jobTitle ?? '',
      'Job title',
      100,
    );
    user.phone = text(data.phone ?? user.phone ?? '', 'Phone', 80);
    const image = text(data.image ?? '', 'Profile image', 500);
    if (
      image &&
      !/^https:\/\//.test(image) &&
      !/^\/api\/files\/[a-f0-9-]+\/view$/.test(image)
    )
      throw new BadRequestException(
        'Use an HTTPS image URL or an uploaded image.',
      );
    user.image = image;
    if (data.password) user.password = await this.hashPassword(data.password);
    if (credentialsChanged) user.sessionVersion++;
    return this.repository.save(user);
  }
  /** Accepts a username; returns its public profile for the profile screen. */
  async getProfile(username: string) {
    const user = await this.repository.findOneBy({ username });
    if (!user) throw new BadRequestException('Profile not found.');
    return this.profile(user);
  }
  /** Accepts an authenticated account; rejects non-administrators. */
  requireAdmin(user: User) {
    if (user.role !== 'admin')
      throw new ForbiddenException('Administrator access required.');
  }
}
