import { Module } from '@nestjs/common';
import { UserApiSharedModule } from '@mgmt/user/api/shared';
import { UserApiHandlersController } from './user-api-handlers.controller';

@Module({
  imports: [UserApiSharedModule],
  controllers: [UserApiHandlersController],
})
export class UserApiHandlersModule {}
