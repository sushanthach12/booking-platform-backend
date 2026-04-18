import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RequestUser } from '../../common/types/users.types';
import {
  PROPERTY_AMENITY_REPOSITORY,
  PROPERTY_REPOSITORY,
} from '../../database';
import {
  IAddPropertyAmenitiesRequestParams,
  IGetAmenitiesResponse,
  IRemovePropertyAmenityRequestParams,
  PropertyAmenityResponse,
} from '../interfaces/property.interface';
import { IPropertyAmenityRepository } from '../repositories/interfaces/property-amenity.repository.interface';
import { IPropertyRepository } from '../repositories/interfaces/property-repository.interfaces';

@Injectable()
export class PropertyAmenityService {
  constructor(
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepository: IPropertyRepository,
    @Inject(PROPERTY_AMENITY_REPOSITORY)
    private readonly propertyAmenityRepository: IPropertyAmenityRepository,
  ) {}

  async getPropertyAmenities(params: {
    user: RequestUser;
    params: { propertyId: string };
  }): Promise<PropertyAmenityResponse[]> {
    const {
      // user,
      params: { propertyId },
    } = params;

    // Check if property exists
    const property = await this.propertyRepository.findPropertyById({
      id: propertyId,
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    // For now, allow all authenticated users to view property amenities
    const propertyAmenities =
      await this.propertyAmenityRepository.findPropertyAmenities({
        propertyId,
      });

    // Get amenity details for each property amenity
    const amenities = await Promise.all(
      propertyAmenities.map(async (propertyAmenity) => {
        const amenity = await this.propertyRepository.findAmenityById({
          id: propertyAmenity.amenityId,
        });
        return amenity;
      }),
    );

    return amenities
      .filter((amenity) => amenity !== null)
      .map((amenity) => this.mapAmenityToResponse(amenity));
  }

  async getAllAmenities(): Promise<IGetAmenitiesResponse> {
    const amenities = await this.propertyRepository.findAmenities();

    return amenities.map((amenity) => ({
      id: amenity.id,
      name: amenity.name,
      category: amenity.category as string,
      icon: amenity.icon,
      description: amenity.description,
    })) as unknown as IGetAmenitiesResponse;
  }

  async addPropertyAmenities(
    params: IAddPropertyAmenitiesRequestParams,
  ): Promise<PropertyAmenityResponse[]> {
    const {
      user,
      params: { propertyId },
      payload,
    } = params;

    // Check if user owns the property
    const property = await this.propertyRepository.findPropertyById({
      id: propertyId,
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.hostId !== user.id) {
      throw new ForbiddenException('Only property owner can add amenities');
    }

    // Validate that all amenity IDs exist
    const amenities = await Promise.all(
      payload.amenityIds.map((id) =>
        this.propertyRepository.findAmenityById({ id }),
      ),
    );

    const invalidAmenities = amenities.filter((amenity) => amenity === null);
    if (invalidAmenities.length > 0) {
      throw new BadRequestException('Some amenities do not exist');
    }

    // Check for existing amenities to avoid duplicates
    const existingPropertyAmenities =
      await this.propertyAmenityRepository.findPropertyAmenities({
        propertyId,
      });
    const existingAmenityIds = existingPropertyAmenities.map(
      (pa) => pa.amenityId,
    );

    const newAmenityIds = payload.amenityIds.filter(
      (id) => !existingAmenityIds.includes(id),
    );

    if (newAmenityIds.length === 0) {
      throw new BadRequestException(
        'All selected amenities are already added to this property',
      );
    }

    // Add new amenities to property
    await Promise.all(
      newAmenityIds.map((amenityId) =>
        this.propertyAmenityRepository.createPropertyAmenity({
          propertyId,
          amenityId,
        }),
      ),
    );

    // Return all amenities for the property
    return this.getPropertyAmenities({ user, params: { propertyId } });
  }

  async removePropertyAmenity(
    params: IRemovePropertyAmenityRequestParams,
  ): Promise<void> {
    const {
      user,
      params: { propertyId, amenityId },
    } = params;

    // Check if user owns the property
    const property = await this.propertyRepository.findPropertyById({
      id: propertyId,
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.hostId !== user.id) {
      throw new ForbiddenException('Only property owner can remove amenities');
    }

    // Check if the property amenity exists
    const propertyAmenities =
      await this.propertyAmenityRepository.findPropertyAmenities({
        propertyId,
        amenityId,
      });

    if (propertyAmenities.length === 0) {
      throw new NotFoundException('Amenity not found on this property');
    }

    // Delete the property amenity
    await this.propertyAmenityRepository.deletePropertyAmenity({
      id: propertyAmenities[0].id,
    });
  }

  private mapAmenityToResponse(amenity: any): PropertyAmenityResponse {
    return {
      id: amenity.id,
      name: amenity.name,
      description: amenity.description,
      icon: amenity.icon,
      category: amenity.category,
    };
  }
}
