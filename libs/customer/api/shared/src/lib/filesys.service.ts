import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '@mgmt/shared/api/foundation';
import { Repository } from 'typeorm';
import { FileSys } from './filesys.entity';

@Injectable()
export class FileSysService extends BaseService<FileSys> {
  /** Accepts repository; initializes FileSysService and its dependencies. */
  constructor(
    @InjectRepository(FileSys)
    repository: Repository<FileSys>,
  ) {
    super();
    this.repository = repository;
  }
}
