import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '@mgmt/shared/api/foundation';
import { Repository } from 'typeorm';
import { Customer } from './customer.entity';

@Injectable()
export class CustomerService extends BaseService<Customer> {
  /** Accepts repository; initializes CustomerService and its dependencies. */
  constructor(
    @InjectRepository(Customer)
    repository: Repository<Customer>,
  ) {
    super();
    this.repository = repository;
  }
}
