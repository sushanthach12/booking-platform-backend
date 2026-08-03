import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { PROPERTY_REPOSITORY } from '../../../database';
import { EPropertyStatus } from '../../../properties/enums/property.enum';
import { IPropertyRepository } from '../../../properties/repositories';
import { PROPERTY_SEARCH_QUEUE } from '../../core/search.tokens';
import { PropertySearchFacade } from '../property-search.facade';

@Processor(PROPERTY_SEARCH_QUEUE)
export class PropertySearchProcessor extends WorkerHost {
  constructor(
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepo: IPropertyRepository,
    private readonly searchFacade: PropertySearchFacade,
  ) {
    super();
  }

  async process(job: Job<{ propertyId: string }>): Promise<void> {
    try {
      if (job.name === 'index-property') {
        // Fetch fresh from Postgres rather than trusting the job payload —
        // the property may have been updated again since the job was enqueued.
        const property = await this.propertyRepo.findPropertyById({
          id: job.data.propertyId,
        });

        if (!property) {
          await this.searchFacade.remove(job.data.propertyId);
          return;
        }

        const [propertyLocation, propertyPricing, propertyRatings] =
          await Promise.all([
            this.propertyRepo.findPropertyLocationByPropertyId({
              propertyId: job.data.propertyId,
            }),
            this.propertyRepo.findPropertyPricingByPropertyId({
              propertyId: job.data.propertyId,
            }),
            this.propertyRepo.findPropertyRatingByPropertyId({
              propertyId: job.data.propertyId,
            }),
          ]);

        console.log('propertyLocation', propertyLocation);
        console.log('propertyPricing', propertyPricing);
        console.log('propertyRatings', propertyRatings);

        await this.searchFacade.indexOne({
          id: property.id,
          title: property.title,
          description: property.description ?? '',
          city: propertyLocation?.city ?? '',
          location: {
            lat: propertyLocation?.latitude ?? 0,
            lon: propertyLocation?.longitude ?? 0,
          },
          pricePerNight: propertyPricing?.basePrice ?? 0,
          amenities: property.amenities?.map((a) => a.amenity?.name) ?? [],
          propertyType: property.propertyType,
          rating: property.ratings?.averageRating ?? 0,
          isAvailable: property.status === EPropertyStatus.ACTIVE,
          createdAt: property.createdAt,
        });
        console.log(`Indexed property ${property.id} in search backend`);
        return;
      }

      if (job.name === 'delete-property') {
        await this.searchFacade.remove(job.data.propertyId);
      }
    } catch (error) {
      console.error(
        `Error processing job ${job.name} for property ${job.data.propertyId}:`,
        error,
      );
    }
  }
}
