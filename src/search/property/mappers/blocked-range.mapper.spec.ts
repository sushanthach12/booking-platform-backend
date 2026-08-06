import { collapseBlockedDates } from './blocked-range.mapper';

describe('collapseBlockedDates', () => {
  it('returns an empty array for no dates', () => {
    expect(collapseBlockedDates([])).toEqual([]);
  });

  it('collapses consecutive days into a single exclusive range', () => {
    const dates = [
      new Date('2025-06-01T00:00:00Z'),
      new Date('2025-06-02T00:00:00Z'),
      new Date('2025-06-03T00:00:00Z'),
    ];

    expect(collapseBlockedDates(dates)).toEqual([
      { from: '2025-06-01', to: '2025-06-04' },
    ]);
  });

  it('splits into separate ranges across a gap', () => {
    const dates = [
      new Date('2025-06-01T00:00:00Z'),
      new Date('2025-06-02T00:00:00Z'),
      new Date('2025-06-10T00:00:00Z'),
    ];

    expect(collapseBlockedDates(dates)).toEqual([
      { from: '2025-06-01', to: '2025-06-03' },
      { from: '2025-06-10', to: '2025-06-11' },
    ]);
  });

  it('handles a single blocked date', () => {
    const dates = [new Date('2025-06-01T00:00:00Z')];
    expect(collapseBlockedDates(dates)).toEqual([
      { from: '2025-06-01', to: '2025-06-02' },
    ]);
  });

  it('sorts out-of-order input before collapsing', () => {
    const dates = [
      new Date('2025-06-03T00:00:00Z'),
      new Date('2025-06-01T00:00:00Z'),
      new Date('2025-06-02T00:00:00Z'),
    ];

    expect(collapseBlockedDates(dates)).toEqual([
      { from: '2025-06-01', to: '2025-06-04' },
    ]);
  });
});
