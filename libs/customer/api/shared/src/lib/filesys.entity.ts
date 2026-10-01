import { Column, Entity } from 'typeorm';
import { BaseEntity } from '@mgmt/shared/api/foundation';

// Persistent filesys fields retain the original API names.
@Entity('filesys')
export class FileSys extends BaseEntity {
  @Column({ default: '' }) jobSlug: string;
  @Column({ default: '' }) customerSlug: string;
  @Column({ default: '' }) fileSize: string;
  @Column({ default: '' }) fileType: string;
  @Column({ default: false }) isArchived: boolean;
  @Column({ default: '' }) currentDir: string;
  @Column({ default: '' }) filePath: string;
  @Column({ default: '' }) name: string;
  @Column({ default: '' }) authorId: string;
  @Column({ default: '' }) category: string;
  @Column({ type: 'simple-json', default: '[]' }) tags: string[];
  @Column({ type: 'blob', select: false, nullable: true }) content: Buffer;
}
