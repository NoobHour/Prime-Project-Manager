import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '@mgmt/shared/api/foundation';
import { Repository } from 'typeorm';
import { Comment } from './comment.entity';

@Injectable()
export class CommentService extends BaseService<Comment> {
  /** Accepts repository; initializes CommentService and its dependencies. */
  constructor(
    @InjectRepository(Comment)
    repository: Repository<Comment>,
  ) {
    super();
    this.repository = repository;
  }
}
