export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);

  if (
    Number.isNaN(h) ||
    Number.isNaN(m) ||
    h < 0 ||
    h > 23 ||
    m < 0 ||
    m > 59
  ) {
    throw new Error('Invalid time format, expected HH:mm');
  }

  return h * 60 + m;
}
