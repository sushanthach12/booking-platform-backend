/** A city/destination aggregate derived from active listings in the search index. */
export interface PropertyDestination {
  city: string;
  state?: string;
  country?: string;
  /** Number of active listings in this city. */
  propertyCount: number;
  /** Cheapest base price across the city's listings (null if none priced). */
  fromPrice: number | null;
  currency: string | null;
  coverImage: string | null;
}
