import { PropertyBlockedRange } from '../interfaces/property-document.interface';

const DAY_MS = 24 * 60 * 60 * 1000;

const toUtcMidnight = (date: Date): number =>
  Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

const toIsoDate = (utcMillis: number): string =>
  new Date(utcMillis).toISOString().substring(0, 10);

/**
 * Folds a sorted list of individually-blocked dates into contiguous ranges,
 * so a month of nightly `available = false` rows becomes a handful of
 * `{ from, to }` entries instead of one document field per night. `to` is
 * exclusive (the day after the last blocked night), matching the half-open
 * interval the DateAvailabilityFilter checks against.
 */
export function collapseBlockedDates(dates: Date[]): PropertyBlockedRange[] {
  if (dates.length === 0) return [];

  const sorted = [...dates].map(toUtcMidnight).sort((a, b) => a - b);

  const ranges: PropertyBlockedRange[] = [];
  let rangeStart = sorted[0];
  let rangeEnd = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    if (current === rangeEnd + DAY_MS) {
      rangeEnd = current;
      continue;
    }
    ranges.push({
      from: toIsoDate(rangeStart),
      to: toIsoDate(rangeEnd + DAY_MS),
    });
    rangeStart = current;
    rangeEnd = current;
  }
  ranges.push({
    from: toIsoDate(rangeStart),
    to: toIsoDate(rangeEnd + DAY_MS),
  });

  return ranges;
}
