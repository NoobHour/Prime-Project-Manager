import { Column, Entity } from 'typeorm';
import { BaseEntity } from '@mgmt/shared/api/foundation';

// Persistent customer fields retain the original API names.
@Entity('customer')
export class Customer extends BaseEntity {
  @Column({ unique: true }) slug: string;
  @Column({ default: '' }) name: string;
  @Column({ default: '' }) email: string;
  @Column({ default: '' }) body: string;
  @Column({ default: '' }) authorId: string;
  @Column({ type: 'simple-json', default: '[]' }) jobList: string[];
  @Column({ type: 'simple-json', default: '[]' }) calendar: string[];
  @Column({ default: '' }) phone: string;
  @Column({ default: '' }) address: string;
  @Column({ default: false }) isLead: boolean;
  @Column({ default: false }) isActive: boolean;
  @Column({ default: false }) isComplete: boolean;
  @Column({ default: '' }) avatar: string;
  @Column({ default: '' }) level: string;
  @Column({ default: '' }) lane: string;
  @Column({ default: false }) isArchived: boolean;
  @Column({ type: 'simple-json', default: '[]' }) cstmrFilesShortL: string[];
}
