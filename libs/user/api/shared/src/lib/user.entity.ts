import { Column, Entity } from 'typeorm';
import { BaseEntity } from '@mgmt/shared/api/foundation';
@Entity('user')
export class User extends BaseEntity {
  @Column({ default: '' }) jobTitle: string;
  @Column({ default: '' }) phone: string;
  @Column({ unique: true }) email: string;
  @Column({ unique: true }) username: string;
  @Column() password: string;
  @Column({ default: '' }) bio: string;
  @Column({ default: '' }) image: string;
  @Column({ default: 'staff' }) role: string;
  @Column({ default: true }) active: boolean;
  @Column({ default: 0 }) sessionVersion: number;
}
