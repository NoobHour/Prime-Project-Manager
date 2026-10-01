import {
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
} from 'typeorm';
/** Repository adapter retaining the original feature-service interface on TypeORM 0.3. */
export abstract class BaseService<T extends ObjectLiteral> {
  public repository: Repository<T>;
  /** Accepts find options; returns matching entities. */
  findAll(options?: FindManyOptions<T>) {
    return this.repository.find(options);
  }
  /** Accepts find options; returns the matching count. */
  count(options: FindManyOptions<T> = {}) {
    return this.repository.count(options);
  }
  /** Accepts field conditions and options; returns one entity or null. */
  findOne(
    conditions: FindOptionsWhere<T>,
    options: Omit<FindOneOptions<T>, 'where'> = {},
  ) {
    return this.repository.findOne({ ...options, where: conditions });
  }
  /** Accepts writable entity fields; returns the persisted entity with generated identity. */
  insert(data: any) {
    return this.repository.save(this.repository.create(data));
  }
  /** Accepts conditions and changed fields; returns affected-row metadata. */
  update(conditions: FindOptionsWhere<T>, data: any) {
    return this.repository.update(conditions, data);
  }
  /** Accepts identity conditions; archives matching rows without removing historical data. */
  softDelete(conditions: FindOptionsWhere<T>) {
    return this.repository.softDelete(conditions);
  }
}
