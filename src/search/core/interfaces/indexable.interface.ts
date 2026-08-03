/**
 * Write-side contract. Kept separate from ISearchable (interface
 * segregation) — a consumer that only needs to search a domain's
 * documents shouldn't be forced to depend on indexing methods, and
 * vice versa.
 */
export interface IIndexable<TEntity> {
  indexOne(entity: TEntity): Promise<void>;
  indexMany(entities: TEntity[]): Promise<void>;
  remove(id: string): Promise<void>;
}
