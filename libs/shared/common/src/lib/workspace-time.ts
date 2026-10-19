/** Accepts an IANA timezone; returns its canonical name or throws for unsupported identifiers. */
export function validTimezone(value: string): string {
  if (!value || value.length > 100) throw new Error('Choose a workspace timezone.');
  return new Intl.DateTimeFormat('en', { timeZone: value }).resolvedOptions().timeZone;
}

/** Accepts an instant and named timezone; returns its date and minute as an ISO-shaped local wall clock. */
export function wallTime(instant: string | Date, zone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(instant));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

/** Accepts a local wall clock, timezone and optional repeated-hour choice; returns an instant, rejecting DST gaps and unresolved overlaps. */
export function wallToInstant(value: string, zone: string, occurrence: 'earlier' | 'later' | 'reject' = 'reject'): string {
  validTimezone(zone);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Enter a valid date and time.');
  const naive = Date.parse(value + ':00Z');
  if (!Number.isFinite(naive) || new Date(naive).toISOString().slice(0, 16) !== value) throw new Error('Enter a valid date and time.');
  const candidates = new Set<number>();
  // Sample offsets on both sides of the date. This also handles half-hour DST transitions.
  for (let hours = -36; hours <= 36; hours += 6) {
    const sample = naive + hours * 3600000;
    const offset = Date.parse(wallTime(new Date(sample), zone) + ':00Z') - sample;
    const candidate = naive - offset;
    if (wallTime(new Date(candidate), zone) === value) candidates.add(candidate);
  }
  const sorted = [...candidates].sort((a, b) => a - b);
  if (!sorted.length) throw new Error('This time does not exist because the clocks move forward. Choose another time.');
  if (sorted.length > 1 && occurrence === 'reject') throw new Error('This time occurs twice. Choose the earlier or later occurrence.');
  return new Date(occurrence === 'later' ? sorted[sorted.length - 1] : sorted[0]).toISOString();
}

/** Accepts a date-only value and day offset; returns a date-only result without timezone conversion. */
export function shiftDate(day: string, days: number): string {
  const date = new Date(day + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** A calendar-only wall-clock date. UTC accessors prevent the browser's DST gaps from shifting another timezone's displayed hours. */
export class CalendarWallDate extends Date {
  /** Accepts an epoch, ISO string or date components; creates a UTC-backed display value, never a persisted appointment instant. */
  constructor(...args: any[]) {
    super(args.length > 1 ? Date.UTC(args[0], args[1], args[2] ?? 1, args[3] ?? 0, args[4] ?? 0, args[5] ?? 0, args[6] ?? 0) : args.length ? args[0] : Date.now());
  }
  /** Accepts no input; returns the display year independently of browser timezone. */
  override getFullYear() { return this.getUTCFullYear(); }
  /** Accepts no input; returns the display month (zero-based). */
  override getMonth() { return this.getUTCMonth(); }
  /** Accepts no input; returns the display day of month. */
  override getDate() { return this.getUTCDate(); }
  /** Accepts no input; returns the display weekday. */
  override getDay() { return this.getUTCDay(); }
  /** Accepts no input; returns the display hour. */
  override getHours() { return this.getUTCHours(); }
  /** Accepts no input; returns the display minute. */
  override getMinutes() { return this.getUTCMinutes(); }
  /** Accepts no input; returns the display second. */
  override getSeconds() { return this.getUTCSeconds(); }
  /** Accepts no input; returns display milliseconds. */
  override getMilliseconds() { return this.getUTCMilliseconds(); }
  /** Accepts no input; returns zero because display coordinates have already been converted. */
  override getTimezoneOffset() { return 0; }
  /** Accepts a year and optional month/day; returns the updated display epoch. */
  override setFullYear(...args: [number, number?, number?]) { return Date.prototype.setUTCFullYear.apply(this, args); }
  /** Accepts a month and optional day; returns the updated display epoch. */
  override setMonth(...args: [number, number?]) { return Date.prototype.setUTCMonth.apply(this, args); }
  /** Accepts a day of month; returns the updated display epoch. */
  override setDate(day: number) { return this.setUTCDate(day); }
  /** Accepts hours and optional smaller units; returns the updated display epoch. */
  override setHours(...args: [number, number?, number?, number?]) { return Date.prototype.setUTCHours.apply(this, args); }
  /** Accepts minutes and optional smaller units; returns the updated display epoch. */
  override setMinutes(...args: [number, number?, number?]) { return Date.prototype.setUTCMinutes.apply(this, args); }
  /** Accepts seconds and optional milliseconds; returns the updated display epoch. */
  override setSeconds(...args: [number, number?]) { return Date.prototype.setUTCSeconds.apply(this, args); }
  /** Accepts milliseconds; returns the updated display epoch. */
  override setMilliseconds(value: number) { return this.setUTCMilliseconds(value); }
}

/** Accepts an instant and workspace timezone; returns UTC-backed wall coordinates for the existing date-fns calendar adapter. */
export function calendarDate(instant: string, zone: string): Date {
  return new CalendarWallDate(wallTime(instant, zone) + ':00Z');
}
