import { Module } from '@nestjs/common';
import { CustomerApiSharedModule } from '@mgmt/customer/api/shared';
import { UserApiSharedModule } from '@mgmt/user/api/shared';
import { CustomerApiHandlersController } from './customer-api-handlers.controller';

@Module({
  controllers: [CustomerApiHandlersController],
  providers: [],
  imports: [CustomerApiSharedModule, UserApiSharedModule],
})
export class CustomerApiHandlersModule {}
