import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '@mgmt/shared/api/foundation';
import { Repository } from 'typeorm';
import { Job } from './job.entity';

@Injectable()
export class JobService extends BaseService<Job> {
  /** Accepts repository; initializes JobService and its dependencies. */
  constructor(
    @InjectRepository(Job)
    repository: Repository<Job>,
  ) {
    super();
    this.repository = repository;
  }
}
