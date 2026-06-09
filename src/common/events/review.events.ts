/**
 * Review domain events. Emitted by ReviewModule on review create/update so
 * the property rating aggregate can be recomputed without coupling the write
 * path to PropertyModule internals.
 */
export const REVIEW_UPSERTED = 'review.upserted';

export interface ReviewUpsertedPayload {
  propertyId: string;
}
