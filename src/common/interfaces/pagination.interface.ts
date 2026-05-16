export interface IPaginationMeta {
  page: number;
  limit: number;
  total: number;
  /** @deprecated use total */
  totalItems?: number;
  totalPages: number;
  length: number;
}

/** @deprecated Use IPaginationMeta */
export type IPaginationResponse = IPaginationMeta;

export interface IPaginatedResponse<T> {
  data: T[];
  pagination: IPaginationMeta;
}
