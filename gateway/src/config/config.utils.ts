export const parseNumber = (
  value: string | number | undefined,
  fallback: number,
): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const parseBoolean = (
  value: string | boolean | undefined,
  fallback: boolean,
): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }
  return fallback;
};

export const parseCsv = (value: string | string[] | undefined): string[] => {
  if (Array.isArray(value)) {
    return value.map((entry) => entry.trim()).filter(Boolean);
  }
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
};
