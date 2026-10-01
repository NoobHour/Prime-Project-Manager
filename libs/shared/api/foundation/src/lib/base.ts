import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
/** Common persisted identity, timestamps, archive marker and optimistic edit version. */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid') id?: string;
  @CreateDateColumn() createdAt?: Date;
  @UpdateDateColumn() updatedAt?: Date;
  @DeleteDateColumn() deletedDate?: Date;
  @VersionColumn() version?: number;
}
