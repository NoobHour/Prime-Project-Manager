import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '@mgmt/shared/api/foundation';
import { Repository } from 'typeorm';
import { Calendar } from './calendar.entity';

@Injectable()
export class CalendarService extends BaseService<Calendar> {
  /** Accepts repository; initializes CalendarService and its dependencies. */
  constructor(
    @InjectRepository(Calendar)
    repository: Repository<Calendar>,
  ) {
    super();
    this.repository = repository;
  }
}
