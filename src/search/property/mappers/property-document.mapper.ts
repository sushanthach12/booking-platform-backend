import { Injectable } from '@nestjs/common';
import {
  IProperyEntity,
  PropertyDocument,
} from '../interfaces/property-document.interface';

/**
 * Single responsibility: translate a Property (DB entity, with whatever
 * relations are loaded) into the flattened document shape OpenSearch
 * expects. Nothing else in the app should know how this transformation
 * happens — if the document shape changes, this is the only file to touch.
 */
@Injectable()
export class PropertyDocumentMapper {
  toDocument(property: IProperyEntity): PropertyDocument {
    return {
      id: property.id,
      title: property.title,
      description: property.description ?? '',
      city: property.city,
      location: { lat: property.location.lat, lon: property.location.lon },
      pricePerNight: property.pricePerNight,
      amenities: property.amenities ?? [],
      propertyType: property.propertyType,
      rating: property.rating ?? 0,
      isAvailable: property.isAvailable,
      createdAt: property.createdAt.toISOString(),
    };
  }
}
