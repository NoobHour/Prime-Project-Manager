import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './customer.entity';
import { CustomerService } from './customer.service';
import { CommentService } from './comment.service';
import { FileSysService } from './filesys.service';
import { FileSys } from './filesys.entity';
import { Job } from './job.entity';
import { JobService } from './job.service';
import { Comment } from './comment.entity';
import { Upload } from './upload.entity';
import { UploadService } from './upload.service';
import { Calendar } from './calendar.entity';
import { CalendarService } from './calendar.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      Comment,
      Job,
      Upload,
      Calendar,
      FileSys,
    ]),
  ],
  providers: [
    CustomerService,
    CommentService,
    JobService,
    UploadService,
    CalendarService,
    FileSysService,
  ],
  exports: [
    CustomerService,
    CommentService,
    JobService,
    UploadService,
    CalendarService,
    FileSysService,
  ],
})
export class CustomerApiSharedModule {}
