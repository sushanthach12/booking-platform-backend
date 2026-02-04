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
  IGetPropertyRequestParams,
  IGetPropertyResponse,
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
  async getProperty(
    params: IGetPropertyRequestParams,
  ): Promise<IGetPropertyResponse> {
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

    const response: IGetPropertyResponse = {
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
      // TODO: Add related data fetching
      // response.location = await this.getPropertyLocation(propertyId);
      // response.pricing = await this.getPropertyPricing(propertyId);
      // etc.
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
