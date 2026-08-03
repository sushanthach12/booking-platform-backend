export type FilterClauseTarget = 'must' | 'filter';

/**
 * Strategy pattern: each filter (text match, price range, geo, etc.) is
 * its own class implementing this interface. The query builder just
 * iterates over an injected array of these — adding a new filter means
 * adding a new class and registering it in the module, with zero changes
 * to the builder itself. This is the Open/Closed principle in practice.
 */
export interface QueryFilterStrategy<TParams> {
  readonly target: FilterClauseTarget;
  supports(params: TParams): boolean;
  toClause(params: TParams): Record<string, any>;
}
