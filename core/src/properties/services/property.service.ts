import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { timeToMinutes } from '../../common/helpers/time.helper';
import { parseWithZod } from '../../common/zod';
import { PROPERTY_REPOSITORY } from '../../database';
import { EUserRole } from '../../users/enums/user.enum';
import { EPropertyStatus, EPropertyType } from '../enums/property.enum';
import {
  ICreatePropertyAvailabilityRequestParams,
  ICreatePropertyAvailabilityResponse,
  ICreatePropertyRequestParams,
  ICreatePropertyResponse,
  IDeletePropertyRequestParams,
  IGetHostPropertiesRequestParams,
  IGetPropertiesRequestParams,
  IGetPropertiesResponse,
  IGetPropertyAnalyticsRequestParams,
  IGetPropertyAnalyticsResponse,
  IGetPropertyDetailsRequestParams,
  IGetPropertyDetailsResponse,
  INearbyPropertiesRequestParams,
  ISearchPropertiesRequestParams,
  IUpdatePropertyRequestParams,
  IUpdatePropertyResponse,
  IUpdatePropertyStatusRequestParams,
  IUpdatePropertyStatusResponse,
} from '../interfaces/property.interface';
import { IPropertyRepository } from '../repositories/interfaces/property-repository.interfaces';
import { CreatePropertyRequestSchema } from '../validations/schema/create.property.schema';

@Injectable()
export class PropertyService {
  constructor(
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepository: IPropertyRepository,
  ) {}

  async getProperties(
    data: IGetPropertiesRequestParams,
  ): Promise<IGetPropertiesResponse> {
    const { payload } = data;

    const page = payload.page ?? 1;
    const limit = Math.min(100, payload.limit ?? 10);
    const offset = (page - 1) * limit;

    const [properties, totalItems] = await Promise.all([
      this.propertyRepository.findProperties({
        page,
        limit,
        offset,
      }),
      this.propertyRepository.countProperties({
        propertyType: EPropertyType.APARTMENT,
      }),
    ]);

    return {
      results: properties.map((property) => ({
        id: property.id,
        title: property.title,
        description: property.description,
        propertyType: property.propertyType as EPropertyType,
        status: property.status as EPropertyStatus,
        createdAt: property.createdAt,
        updatedAt: property.updatedAt,
      })),
      pagination: {
        page,
        limit,
        totalItems,
        length: properties.length,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  private validateCreatePropertyPayload(
    payload: ICreatePropertyRequestParams['payload'],
  ): void {
    // if (hostPropertyCount >= MAX_PROPERTIES_PER_HOST) {
    //   throw new ForbiddenException("Property limit reached");
    // }

    // TODO: Validate the address
    /*
    Same address already used by this host?
    Postal code matches city/state?
    Country supported?
    */
    // await this.addressService.validate(payload.address);

    // TODO: Validate the pricing
    // if (payload.pricing.basePrice < MIN_BASE_PRICE) {
    //   throw new BadRequestException("Base price too low");
    // }

    if (payload.policies.minNights > payload.policies.maxNights) {
      throw new BadRequestException('minNights cannot exceed maxNights');
    }

    if (payload.policies.maxGuests <= 0) {
      throw new BadRequestException('Invalid maxGuests');
    }

    // Validation the description for the rules
    payload.rules.forEach((rule) => {
      if (!rule.allowed && !rule.description) {
        throw new BadRequestException(
          'Description is required for restricted rules',
        );
      }
    });

    // TODO: refine this validation
    if (payload.policies.checkInTime && payload.policies.checkOutTime) {
      const checkInMin = timeToMinutes(payload.policies.checkInTime);
      let checkOutMin = timeToMinutes(payload.policies.checkOutTime);

      // checkout is next day if <= check-in
      if (checkOutMin <= checkInMin) {
        checkOutMin += 24 * 60;
      }

      // Optional: minimum stay window (recommended)
      const MIN_STAY_MINUTES = 60; // 1 hour

      if (checkOutMin - checkInMin < MIN_STAY_MINUTES) {
        throw new BadRequestException('Stay duration is too short');
      }
    }
  }

  // list properties
  async createProperty(
    params: ICreatePropertyRequestParams,
  ): Promise<ICreatePropertyResponse> {
    // if zod schema validations are needed, use parseWithZod
    const validatedParams = parseWithZod(CreatePropertyRequestSchema, params);
    this.validateCreatePropertyPayload(params.payload);

    // check if the user is a host
    if (validatedParams.user.role !== EUserRole.HOST) {
      throw new ForbiddenException('Only hosts can create properties');
    }

    const { user: host, payload } = validatedParams;

    // Check if property exists with same title
    const exists = await this.propertyRepository.checkPropertyExists({
      hostId: host.id,
      title: payload.details.title,
    });

    if (exists) {
      throw new ConflictException('Property with this name already exists');
    }

    // create property using db transactions
    const propertyMeta = await this.propertyRepository.createProperty({
      hostId: host.id,
      payload: payload as ICreatePropertyRequestParams['payload'],
    });

    return {
      id: propertyMeta.id,
      title: propertyMeta.title,
      description: propertyMeta.description,
      propertyType: propertyMeta.propertyType,
      status: propertyMeta.status,
      createdAt: propertyMeta.createdAt,
      updatedAt: propertyMeta.updatedAt,
    };
  }

  async createPropertyAvailability(
    params: ICreatePropertyAvailabilityRequestParams,
  ): Promise<ICreatePropertyAvailabilityResponse> {
    const { payload } = params;

    // get the property if exists or not

    // if there is roomId then check if exists

    // check if the property belongs to the user

    // check if the room belongs to the property

    // check if the startDate and endDate are valid

    return Promise.resolve({
      id: '1',
      propertyId: '',
      roomId: payload.roomId,
    });
  }

  // New CRUD Methods
  async getPropertyDetails(
    params: IGetPropertyDetailsRequestParams,
  ): Promise<IGetPropertyDetailsResponse> {
    const {
      // user,
      params: { propertyId, includeRelations },
    } = params;

    const property = await this.propertyRepository.findPropertyById({
      id: propertyId,
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    // For now, allow all authenticated users to view properties
    // In production, you might want to add visibility restrictions based on status

    const response: IGetPropertyDetailsResponse = {
      id: property.id,
      hostId: property.hostId,
      title: property.title,
      description: property.description,
      propertyType: property.propertyType as EPropertyType,
      status: property.status as EPropertyStatus,
      createdAt: property.createdAt,
      updatedAt: property.updatedAt,
    };

    // Include relations if requested
    if (includeRelations) {
      // Fetch all related data for property details page
      const [location, pricing, details, policy, ratings] = await Promise.all([
        this.propertyRepository.findPropertyLocationByPropertyId({
          propertyId,
        }),
        this.propertyRepository.findPropertyPricingByPropertyId({ propertyId }),
        this.propertyRepository.findPropertyDetailsByPropertyId({ propertyId }),
        this.propertyRepository.findPropertyPolicyByPropertyId({ propertyId }),
        this.propertyRepository.findPropertyRatingByPropertyId({ propertyId }),
      ]);

      // Map location data
      if (location) {
        response.location = {
          id: location.id,
          addressLine1: location.addressLine1,
          addressLine2: location.addressLine2 || undefined,
          city: location.city,
          state: location.state || undefined,
          country: location.country,
          postalCode: location.postalCode || undefined,
          latitude: location.latitude || undefined,
          longitude: location.longitude || undefined,
        };
      }

      // Map pricing data
      if (pricing) {
        response.pricing = {
          id: pricing.id,
          basePrice: pricing.basePrice,
          currency: pricing.currency,
          cleaningFee: pricing.cleaningFee,
          serviceFeePercentage: pricing.serviceFeePercentage,
        };
      }

      // Map property details (bedrooms, beds, etc.)
      if (details) {
        response.details = {
          id: details.id,
          maxGuests: details.maxGuests,
          bedrooms: details.bedrooms,
          beds: details.beds,
          bathrooms: details.bathrooms,
        };
      }

      // Map policy data
      if (policy) {
        response.policies = {
          id: policy.id,
          minNights: policy.minNights,
          maxNights: policy.maxNights,
          maxGuests: details?.maxGuests || 0, // Get from details since policy doesn't have maxGuests
          checkInTime: policy.checkInTime,
          checkOutTime: policy.checkOutTime,
          enableWaitlist: policy.instantBook, // Use instantBook as enableWaitlist for now
          cancellationPolicy: policy.cancellationPolicy,
        };
      }

      // Map ratings
      if (ratings) {
        response.ratings = {
          id: ratings.id,
          averageRating: ratings.averageRating || 0,
          totalReviews: ratings.totalReviews || 0,
          // Detailed rating fields not available in entity yet, commenting out for now
          // cleanlinessRating: ratings.cleanlinessRating || undefined,
          // communicationRating: ratings.communicationRating || undefined,
          // checkInRating: ratings.checkInRating || undefined,
          // accuracyRating: ratings.accuracyRating || undefined,
          // locationRating: ratings.locationRating || undefined,
          // valueRating: ratings.valueRating || undefined,
        };
      }

      // TODO: Implement these methods in repository when ready
      // Images, amenities, and rooms methods are commented out in the repository
      /*
      const [
        images,
        amenities,
        rooms,
      ] = await Promise.all([
        this.propertyRepository.findPropertyImagesByPropertyId({ propertyId }),
        this.propertyRepository.findPropertyAmenitiesByPropertyId({ propertyId }),
        this.propertyRepository.findRoomsByPropertyId({ propertyId }),
      ]);

      // Map images
      if (images && images.length > 0) {
        response.images = images.map(image => ({
          id: image.id,
          url: image.url,
          thumbnailUrl: image.thumbnailUrl || undefined,
          caption: image.caption || undefined,
          altText: image.altText || undefined,
          displayOrder: image.displayOrder,
          isPrimary: image.isPrimary,
          width: image.width || undefined,
          height: image.height || undefined,
          fileSize: image.fileSize || undefined,
          mimeType: image.mimeType || undefined,
          createdAt: image.createdAt,
        }));
      }

      // Map amenities
      if (amenities && amenities.length > 0) {
        response.amenities = amenities.map(amenity => ({
          id: amenity.amenity.id,
          name: amenity.amenity.name,
          description: amenity.amenity.description || undefined,
          icon: amenity.amenity.icon || undefined,
          category: amenity.amenity.category,
        }));
      }

      // Map rooms
      if (rooms && rooms.length > 0) {
        response.rooms = rooms.map(room => ({
          id: room.id,
          name: room.name,
          description: room.description || undefined,
          roomType: room.roomType,
          beds: room.beds,
          bedType: room.bedType || undefined,
          maxGuests: room.maxGuests,
          basePrice: room.basePrice || undefined,
          isPrivate: room.isPrivate,
          hasBathroom: room.hasBathroom,
          hasBalcony: room.hasBalcony,
          floorNumber: room.floorNumber || undefined,
          squareMeters: room.squareMeters || undefined,
          status: room.status,
          createdAt: room.createdAt,
          updatedAt: room.updatedAt,
        }));
      }
      */
    }

    return response;
  }

  async updateProperty(
    params: IUpdatePropertyRequestParams,
  ): Promise<IUpdatePropertyResponse> {
    const {
      user,
      params: { propertyId },
      payload,
    } = params;

    // Check if property exists and user owns it
    const existingProperty = await this.propertyRepository.findPropertyById({
      id: propertyId,
    });
    if (!existingProperty) {
      throw new NotFoundException('Property not found');
    }

    if (existingProperty.hostId !== user.id) {
      throw new ForbiddenException('Only property owner can update property');
    }

    const updatedProperty = await this.propertyRepository.updateProperty({
      id: propertyId,
      ...payload,
    });

    return {
      id: updatedProperty.id,
      title: updatedProperty.title,
      description: updatedProperty.description,
      propertyType: updatedProperty.propertyType as EPropertyType,
      status: updatedProperty.status as EPropertyStatus,
      updatedAt: updatedProperty.updatedAt,
    };
  }

  async deleteProperty(params: IDeletePropertyRequestParams): Promise<void> {
    const {
      user,
      params: { propertyId },
    } = params;

    // Check if property exists and user owns it
    const existingProperty = await this.propertyRepository.findPropertyById({
      id: propertyId,
    });
    if (!existingProperty) {
      throw new NotFoundException('Property not found');
    }

    if (existingProperty.hostId !== user.id) {
      throw new ForbiddenException('Only property owner can delete property');
    }

    // Soft delete by updating status
    await this.propertyRepository.updateProperty({
      id: propertyId,
      status: EPropertyStatus.DELETED,
    });
  }

  async updatePropertyStatus(
    params: IUpdatePropertyStatusRequestParams,
  ): Promise<IUpdatePropertyStatusResponse> {
    const {
      user,
      params: { propertyId },
      payload,
    } = params;

    // Check if property exists and user owns it
    const existingProperty = await this.propertyRepository.findPropertyById({
      id: propertyId,
    });
    if (!existingProperty) {
      throw new NotFoundException('Property not found');
    }

    if (existingProperty.hostId !== user.id) {
      throw new ForbiddenException(
        'Only property owner can update property status',
      );
    }

    const updatedProperty = await this.propertyRepository.updateProperty({
      id: propertyId,
      status: payload.status,
    });

    return {
      id: updatedProperty.id,
      status: updatedProperty.status as EPropertyStatus,
      updatedAt: updatedProperty.updatedAt,
    };
  }

  async searchProperties(
    params: ISearchPropertiesRequestParams,
  ): Promise<IGetPropertiesResponse> {
    const { payload } = params;

    const page = payload.page ?? 1;
    const limit = Math.min(100, payload.limit ?? 10);
    const offset = (page - 1) * limit;

    // TODO: Implement advanced search with filters
    const [properties, totalItems] = await Promise.all([
      this.propertyRepository.findProperties({
        page,
        limit,
        offset,
        propertyType: payload.propertyType?.[0] as EPropertyType, // Simplified for now
        status: EPropertyStatus.ACTIVE,
      }),
      this.propertyRepository.countProperties({
        propertyType: payload.propertyType?.[0] as EPropertyType,
        status: EPropertyStatus.ACTIVE,
      }),
    ]);

    return {
      results: properties.map((property) => ({
        id: property.id,
        title: property.title,
        description: property.description,
        propertyType: property.propertyType as EPropertyType,
        status: property.status as EPropertyStatus,
        createdAt: property.createdAt,
        updatedAt: property.updatedAt,
      })),
      pagination: {
        page,
        limit,
        totalItems,
        length: properties.length,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  getNearbyProperties(
    params: INearbyPropertiesRequestParams,
  ): Promise<IGetPropertiesResponse> {
    const {
      params: { limit = 10 },
    } = params;

    // TODO: Implement geospatial search using PostGIS
    // For now, return empty results
    return Promise.resolve({
      results: [],
      pagination: {
        page: 1,
        limit,
        totalItems: 0,
        length: 0,
        totalPages: 0,
      },
    });
  }

  async getHostProperties(
    params: IGetHostPropertiesRequestParams,
  ): Promise<IGetPropertiesResponse> {
    const { user, payload } = params;

    if (user.role !== EUserRole.HOST) {
      throw new ForbiddenException('Only hosts can view their properties');
    }

    const page = payload.page ?? 1;
    const limit = Math.min(100, payload.limit ?? 10);
    const offset = (page - 1) * limit;

    const [properties, totalItems] = await Promise.all([
      this.propertyRepository.findProperties({
        page,
        limit,
        offset,
        hostId: user.id,
        propertyType: payload.propertyType,
        status: payload.status,
      }),
      this.propertyRepository.countProperties({
        hostId: user.id,
        propertyType: payload.propertyType,
        status: payload.status,
      }),
    ]);

    return {
      results: properties.map((property) => ({
        id: property.id,
        title: property.title,
        description: property.description,
        propertyType: property.propertyType as EPropertyType,
        status: property.status as EPropertyStatus,
        createdAt: property.createdAt,
        updatedAt: property.updatedAt,
      })),
      pagination: {
        page,
        limit,
        totalItems,
        length: properties.length,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  async getPropertyAnalytics(
    params: IGetPropertyAnalyticsRequestParams,
  ): Promise<IGetPropertyAnalyticsResponse> {
    const {
      user,
      params: { propertyId },
    } = params;

    // Check if property exists and user owns it
    const existingProperty = await this.propertyRepository.findPropertyById({
      id: propertyId,
    });
    if (!existingProperty) {
      throw new NotFoundException('Property not found');
    }

    if (existingProperty.hostId !== user.id) {
      throw new ForbiddenException('Only property owner can view analytics');
    }

    // TODO: Implement analytics logic
    // For now, return mock data
    return {
      totalViews: 0,
      totalBookings: 0,
      totalRevenue: 0,
      averageRating: 0,
      occupancyRate: 0,
      bookingTrends: [],
    };
  }
}
