import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  Res,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { SkipAuth, UserService } from '@mgmt/user/api/shared';
import { runtime } from '@mgmt/shared/api/config/src/lib/runtime';
@Controller()
export class UserApiHandlersController {
  /** Accepts an authenticated request; returns enabled colleagues for assignments and directory views. */
  @Get('team') async team() {
    return {
      success: true,
      listData: (
        await this.users.findAll({
          where: { active: true },
          order: { username: 'ASC' },
        })
      ).map((user) => this.users.profile(user)),
    };
  }
  private settingUp = false;
  /** Accepts the existing user service; exposes authentication and staff routes. */
  constructor(private users: UserService) {}
  /** Accepts no input; returns whether first-run setup is needed. */
  @SkipAuth() @Get('setup') async setupStatus() {
    return { required: (await this.users.count()) === 0, demo: runtime.demo,
      sandbox: runtime.sandbox, resetAt: runtime.resetAt };
  }
  /** Accepts setup code and administrator fields; creates exactly one first account. */
  @SkipAuth() @Post('setup') async setup(
    @Body() data: any,
    @Res({ passthrough: true }) res: any,
  ) {
    if (this.settingUp || (await this.users.count()))
      throw new ConflictException('Setup is complete or in progress.');
    if (data.code !== runtime.setupCode)
      throw new ForbiddenException(
        'Enter the setup code from the server terminal.',
      );
    this.settingUp = true;
    try {
      const user = await this.users.register(data, 'admin');
      return { success: true, data: await this.users.session(user, res) };
    } finally {
      this.settingUp = false;
    }
  }
  /** Accepts login credentials; returns a session profile and sets its HttpOnly cookie. */
  @SkipAuth() @Post('users/login') async login(
    @Body() data: any,
    @Res({ passthrough: true }) res: any,
  ) {
    return {
      success: true,
      data: await this.users.session(await this.users.login(data), res),
    };
  }
  /** Accepts an authenticated request; clears its cookie and invalidates all old tokens for that account. */
  @Post('users/logout') async logout(
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    // Shared demo accounts must not log out other visitors using the same account.
    if (!runtime.sandbox) await this.users.repository.increment(
      { id: req.user.id },
      'sessionVersion',
      1,
    );
    res.clearCookie(runtime.cookieName, { path: '/' });
    return { success: true };
  }
  /** Accepts administrator request and new staff fields; returns the created profile. */
  @Post('users') async register(@Req() req: any, @Body() data: any) {
    this.users.requireAdmin(req.user);
    return {
      success: true,
      data: this.users.profile(await this.users.register(data)),
    };
  }
  /** Accepts the current user request; returns its profile without password/token internals. */
  @Get('user') current(@Req() req: any) {
    return { success: true, detailData: this.users.profile(req.user) };
  }
  /** Accepts current-password-verified profile edits; returns the new session. */
  @Put('users') async update(
    @Req() req: any,
    @Body() data: any,
    @Res({ passthrough: true }) res: any,
  ) {
    return {
      success: true,
      data: await this.users.session(
        await this.users.updateUserInfo(req.user.id, data),
        res,
      ),
    };
  }
  /** Accepts a username; returns the existing staff profile screen's data. */
  @Get('profiles/:username') async profile(
    @Param('username') username: string,
  ) {
    return { success: true, detailData: await this.users.getProfile(username) };
  }
  /** Accepts an administrator request; returns staff profiles for account management. */
  @Get('staff') async staff(@Req() req: any) {
    this.users.requireAdmin(req.user);
    return {
      success: true,
      listData: (await this.users.findAll()).map((user) =>
        this.users.profile(user),
      ),
    };
  }
  /** Accepts target ID and enabled state; disables/re-enables staff without deleting their history. */
  @Put('staff/:id') async setStaff(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    this.users.requireAdmin(req.user);
    if (id === req.user.id)
      throw new ForbiddenException('You cannot disable yourself.');
    if (typeof data.active !== 'boolean')
      throw new ForbiddenException('Active must be a boolean.');
    await this.users.repository.update({ id }, { active: data.active });
    await this.users.repository.increment({ id }, 'sessionVersion', 1);
    return { success: true };
  }
}
