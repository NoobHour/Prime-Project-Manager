import { PlanningFields1790700000000 } from '@mgmt/shared/api/config/src/lib/migrations/planning-fields';
import { JobCalendar1790800000000 } from '@mgmt/shared/api/config/src/lib/migrations/job-calendar';
import { JobDiscussionsFileTags1790900000000 } from '@mgmt/shared/api/config/src/lib/migrations/job-discussions-file-tags';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { existsSync } from 'node:fs';
import { UserApiHandlersModule } from '@mgmt/user/api/handlers';
import { CustomerApiHandlersModule } from '@mgmt/customer/api/handlers';
import { User } from '@mgmt/user/api/shared';
import {
  Customer,
  Job,
  Calendar,
  Comment,
  FileSys,
  Upload,
} from '@mgmt/customer/api/shared';
import {
  runtime,
  persistDatabase,
} from '@mgmt/shared/api/config/src/lib/runtime';
// Schema initialization is permitted only for a new database, never for an existing one.
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqljs',
      location: runtime.database,
      autoSave: true,
      migrations: [PlanningFields1790700000000, JobCalendar1790800000000, JobDiscussionsFileTags1790900000000],
      migrationsRun: true,
      autoSaveCallback: persistDatabase,
      entities: [User, Customer, Job, Calendar, Comment, FileSys, Upload],
      synchronize: !existsSync(runtime.database),
    }),
    UserApiHandlersModule,
    CustomerApiHandlersModule,
  ],
})
export class AppModule {}
