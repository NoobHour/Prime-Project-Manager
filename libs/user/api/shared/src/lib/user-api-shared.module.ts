import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { runtime } from '@mgmt/shared/api/config/src/lib/runtime';
import { User } from './user.entity';
import { UserService } from './user.service';
import { JwtAuthGuard } from './jwt-strategy/jwt-auth.guard';
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.register({ secret: runtime.jwtSecret }),
  ],
  providers: [UserService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
  exports: [UserService, TypeOrmModule],
})
export class UserApiSharedModule {}
