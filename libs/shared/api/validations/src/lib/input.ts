import { BadRequestException } from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';

/** Accepts a value and bounds; returns trimmed text or rejects invalid input. */
export function text(
  value: unknown,
  label: string,
  max = 200,
  required = false,
): string {
  if (typeof value !== 'string' || value.length > max)
    throw new BadRequestException(
      `${label} must be text up to ${max} characters.`,
    );
  const result = value.trim();
  if (required && !result)
    throw new BadRequestException(`${label} is required.`);
  return result;
}
/** Accepts an email; returns a normalized address suitable for unique lookup. */
export function email(value: unknown, optional = false) {
  const result = text(value ?? '', 'Email', 254, !optional).toLowerCase();
  if (result && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result))
    throw new BadRequestException('Enter a valid email.');
  return result;
}
/** Accepts editor HTML; returns a sanitized formatting-only document with no remote embeds or scripts. */
export function richText(value: unknown) {
  return sanitizeHtml(text(value ?? '', 'Notes', 20000), {
    allowedTags: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      's',
      'ul',
      'ol',
      'li',
      'blockquote',
      'h1',
      'h2',
      'h3',
      'a',
      'span',
    ],
    allowedAttributes: { a: ['href', 'title'] },
    allowedSchemes: ['http', 'https', 'mailto'],
  });
}
/** Accepts a timestamp; returns a valid UTC representation. */
export function date(value: unknown) {
  const v = text(value, 'Date', 40, true);
  if (
    !/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(v) ||
    !Number.isFinite(Date.parse(v))
  )
    throw new BadRequestException('Use a date with a time zone.');
  const parts = v.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!parts) throw new BadRequestException('Invalid date.');
  const [year, month, day, hour, minute] = parts.slice(1).map(Number);
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > new Date(Date.UTC(year, month, 0)).getUTCDate() ||
    hour > 23 ||
    minute > 59
  )
    throw new BadRequestException('Invalid calendar date.');
  return new Date(v).toISOString();
}
/** Accepts raw pagination parameters; returns a bounded database page. */
export function paging(query: any) {
  const take = Number(query.limit ?? 50),
    skip = Number(query.offset ?? 0);
  if (
    !Number.isInteger(take) ||
    take < 1 ||
    take > 100 ||
    !Number.isInteger(skip) ||
    skip < 0 ||
    skip > 1000000
  )
    throw new BadRequestException('Invalid page.');
  return { take, skip };
}
