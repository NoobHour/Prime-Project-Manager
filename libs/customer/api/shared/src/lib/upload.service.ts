import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '@mgmt/shared/api/foundation';
import { Repository } from 'typeorm';
import { Customer } from './customer.entity';

@Injectable()
export class UploadService extends BaseService<Customer> {
  /** Accepts repository; initializes UploadService and its dependencies. */
  constructor(
    @InjectRepository(Customer)
    repository: Repository<Customer>,
  ) {
    super();
    this.repository = repository;
  }
}
