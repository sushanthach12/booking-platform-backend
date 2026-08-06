import { Injectable } from '@nestjs/common';
import { IGetPropertiesResult } from '../../../properties/interfaces/property.interface';
import { PropertyDocument } from '../interfaces/property-document.interface';

/**
 * Translates an OpenSearch PropertyDocument into the exact response shape
 * `web/` already consumes from the Postgres path (IGetPropertiesResult), so
 * swapping the search backend is invisible to the frontend. Includes
 * `ratings` in both places — the pre-swap `searchProperties` omitted it
 * while `getProperties` included it; this is a strict addition, not a
 * behaviour change guests would notice as a regression.
 */
@Injectable()
export class PropertySearchResultMapper {
  toResult(doc: PropertyDocument): IGetPropertiesResult {
    return {
      id: doc.id,
      title: doc.title,
      slug: doc.slug,
      description: doc.description,
      propertyType: doc.propertyType,
      status: doc.status,
      coverImage: doc.coverImage,
      location: {
        city: doc.city,
        state: doc.state ?? undefined,
        country: doc.country,
      },
      pricing: {
        basePrice: doc.basePrice,
        currency: doc.currency,
      },
      ratings: {
        averageRating: doc.rating,
        totalReviews: doc.totalReviews,
      },
      createdAt: new Date(doc.createdAt),
      updatedAt: new Date(doc.updatedAt),
    };
  }
}
