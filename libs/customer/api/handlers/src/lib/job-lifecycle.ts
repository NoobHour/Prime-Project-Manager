import { BadRequestException, ConflictException } from '@nestjs/common';

export type JobLane = 'planned' | 'active' | 'complete' | 'archived';
const lanes: JobLane[] = ['planned', 'active', 'complete', 'archived'];

/** Accepts a canonical lane; returns the compatibility flags stored alongside it. */
export function lifecycleFlags(lane: JobLane) {
  return { lane, isActive: lane === 'active', isComplete: lane === 'complete', isArchived: lane === 'archived' };
}

/** Accepts a stored job; returns its unambiguous status, leaving contradictory historical records untouched. */
export function storedLane(row: any): JobLane {
  const flagged = ['isActive', 'isComplete', 'isArchived'].filter((key) => row[key]);
  const inferred: JobLane = row.isArchived ? 'archived' : row.isComplete ? 'complete' : row.isActive ? 'active' : 'planned';
  if (flagged.length > 1 || (row.lane && (!lanes.includes(row.lane) || row.lane !== inferred)))
    throw new ConflictException('This job has conflicting historical statuses. Choose a status explicitly to reconcile it.');
  return row.lane || inferred;
}

/** Accepts submitted status fields and an optional stored job; returns canonical state or rejects contradictory input. */
export function jobLifecycle(data: any, row?: any) {
  const lane = data.lane ?? (row ? storedLane(row) : 'planned');
  if (!lanes.includes(lane)) throw new BadRequestException('Invalid job status.');
  const state = lifecycleFlags(lane);
  for (const key of ['isActive', 'isComplete', 'isArchived']) {
    if (data[key] !== undefined && data[key] !== state[key])
      throw new BadRequestException('Status flags must agree with the selected job status.');
  }
  return state;
}
