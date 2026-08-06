export const PROPERTY_CREATED = 'property.created';
export const PROPERTY_UPDATED = 'property.updated';
export const PROPERTY_DELETED = 'property.deleted';
export const PROPERTY_AVAILABILITY_CHANGED = 'property.availability.changed';

export interface PropertyChangedPayload {
  propertyId: string;
}
