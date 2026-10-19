import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@mgmt/shared/api/foundation';

// Persistent job fields retain the original API names.
@Entity('job')
@Index('IDX_job_assignee_due', ['assigneeId', 'dueDate'])
export class Job extends BaseEntity {
  // An empty parent is valid only for explicitly internal work; legacy orphans remain customer work.
  @Column({ default: 'customer' }) workKind: 'customer' | 'internal';
  @Column({ type: 'simple-json', default: '[]' }) labels: string[];
  @Column({ default: '' }) assigneeId: string;
  @Column({ default: '' }) dueDate: string;
  @Column({ default: 'normal' }) priority: string;
  @Column({ type: 'simple-json', default: '[]' }) taskList: {
    id: string;
    title: string;
    done: boolean;
  }[];
  @Column({ unique: true }) jobSlug: string;
  @Column({ default: '' }) customerSlug: string;
  @Column({ default: 0 }) count: number;
  @Column({ default: false }) isActive: boolean;
  @Column({ default: false }) isComplete: boolean;
  @Column({ default: false }) isArchived: boolean;
  @Column({ default: '' }) name: string;
  @Column({ default: '' }) body: string;
  @Column({ default: '' }) lane: string;
}
