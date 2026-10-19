import { Module } from '@nestjs/common';
import { CustomerApiSharedModule } from '@mgmt/customer/api/shared';
import { UserApiSharedModule } from '@mgmt/user/api/shared';
import { CustomerApiHandlersController } from './customer-api-handlers.controller';
import { WorkspaceService } from './workspace.service';
import { WorkspaceController } from './workspace.controller';
import { WorkToolsController } from './work-tools.controller';

@Module({
  controllers: [CustomerApiHandlersController, WorkspaceController, WorkToolsController],
  providers: [WorkspaceService],
  imports: [CustomerApiSharedModule, UserApiSharedModule],
})
export class CustomerApiHandlersModule {}
