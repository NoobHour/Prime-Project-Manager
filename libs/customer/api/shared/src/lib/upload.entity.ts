import { Column, Entity } from 'typeorm';
import { BaseEntity } from '@mgmt/shared/api/foundation';

// Persistent upload fields retain the original API names.
@Entity('upload')
export class Upload extends BaseEntity {
  @Column({ default: '' }) jobSlug: string;
  @Column({ default: '' }) customerSlug: string;
  @Column({ default: '' }) name: string;
}
