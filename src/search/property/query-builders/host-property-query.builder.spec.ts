import { HostPropertySearchParams } from '../interfaces/host-property-search.params';
import { HostPropertyQueryBuilder } from './host-property-query.builder';
import { HostScopeFilter } from './host-filters/host-scope.filter';
import { HostStatusFilter } from './host-filters/host-status.filter';

describe('HostPropertyQueryBuilder', () => {
  const buildParams = (
    overrides: Partial<HostPropertySearchParams> = {},
  ): HostPropertySearchParams =>
    ({
      hostId: 'host-1',
      page: 1,
      limit: 20,
      ...overrides,
    }) as HostPropertySearchParams;

  it('always scopes results to hostId, regardless of other params', () => {
    const builder = new HostPropertyQueryBuilder([new HostScopeFilter()], []);

    const body: any = builder.build(buildParams());

    expect(body.query.bool.filter).toContainEqual({
      term: { hostId: 'host-1' },
    });
  });

  it('does not filter by status when the host omits it — drafts stay reachable', () => {
    const builder = new HostPropertyQueryBuilder(
      [new HostScopeFilter(), new HostStatusFilter()],
      [],
    );

    const body: any = builder.build(buildParams());

    expect(body.query.bool.filter).toEqual([{ term: { hostId: 'host-1' } }]);
  });

  it('filters by status only when explicitly requested', () => {
    const builder = new HostPropertyQueryBuilder(
      [new HostScopeFilter(), new HostStatusFilter()],
      [],
    );

    const body: any = builder.build(
      buildParams({ status: 'draft' as HostPropertySearchParams['status'] }),
    );

    expect(body.query.bool.filter).toContainEqual({
      term: { status: 'draft' },
    });
  });

  it('has no aggregations (host dashboard has no facets)', () => {
    const builder = new HostPropertyQueryBuilder([], []);
    const body: any = builder.build(buildParams());
    expect(body.aggs).toBeUndefined();
  });
});
