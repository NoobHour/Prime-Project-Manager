import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@mgmt/shared/api/foundation';

// Persistent calendar fields retain the original API names.
@Entity('calendar')
@Index('IDX_calendar_customer_job', ['customerSlug', 'jobSlug'])
export class Calendar extends BaseEntity {
  @Column({ unique: true }) calendarSlug: string;
  @Column({ default: '' }) customerSlug: string;
  @Column({ default: '' }) jobSlug: string;
  @Column({ default: '' }) authorId: string;
  @Column({ default: '' }) apptDate: string;
  @Column({ default: '' }) subject: string;
  @Column({ default: '' }) body: string;
  @Column({ default: '' }) start: string;
  @Column({ default: '' }) end: string;
}
