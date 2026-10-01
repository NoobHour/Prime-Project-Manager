import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@mgmt/shared/api/foundation';

// Persistent comment fields retain the original API names.
@Entity('comment')
@Index('IDX_comment_customer_job', ['customerSlug', 'jobSlug'])
export class Comment extends BaseEntity {
  @Column({ default: '' }) customerSlug: string;
  @Column({ default: '' }) jobSlug: string;
  @Column({ default: '' }) authorId: string;
  @Column({ default: '' }) body: string;
}
