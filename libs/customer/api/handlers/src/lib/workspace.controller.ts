import { Body, Controller, Get, Put, Query, Req } from '@nestjs/common';
import { UserService } from '@mgmt/user/api/shared';
import { WorkspaceService } from './workspace.service';

@Controller()
export class WorkspaceController {
  /** Accepts shared workspace and account services; exposes authenticated planning routes. */
  constructor(private workspace: WorkspaceService, private users: UserService) {}
  /** Accepts no input; returns workspace settings and a date only after explicit timezone setup. */
  @Get('workspace') async settings() { return { success: true, data: await this.workspace.settings(), today: await this.workspace.today() }; }
  /** Accepts an administrator and versioned settings; saves the timezone and terminology preference. */
  @Put('workspace') async save(@Req() req: any, @Body() data: any) {
    this.users.requireAdmin(req.user);
    return { success: true, data: await this.workspace.saveSettings(data) };
  }
  /** Accepts bounded range/scope filters; returns the shared team agenda without attributing responsibility to appointment authors. */
  @Get('schedule') async schedule(@Query() query: any) { return this.workspace.agenda(query); }
}
