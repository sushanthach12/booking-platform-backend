import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import moment from 'moment';
import { SlugHelper } from '../../common/helpers/slug.helper';
import { timeToMinutes } from '../../common/helpers/time.helper';
import { RequestUser } from '../../common/types/users.types';
import { parseWithZod } from '../../common/zod';
import {
  AVAILABILITY_CALENDAR_REPOSITORY,
  PROPERTY_REPOSITORY,
} from '../../database';
import { EUserRole } from '../../users/enums/user.enum';
import {
  OnboardingStep2Dto,
  OnboardingStep3Dto,
  OnboardingStep4Dto,
  OnboardingStep5Dto,
} from '../dto/host-onboarding-steps.dto';
import {
  EPropertyCancellationPolicy,
  EPropertyStatus,
  EPropertyType,
} from '../enums/property.enum';
import {
  IBulkUpdateAvailabilityRequestParams,
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
  IGetPropertyAvailabilityRequestParams,
  IGetPropertyAvailabilityResponse,
  IGetPropertyDetailsRequestParams,
  IGetPropertyDetailsResponse,
  INearbyPropertiesRequestParams,
  ISearchPropertiesRequestParams,
  IUpdatePropertyAvailabilityRequestParams,
  IUpdatePropertyRequestParams,
  IUpdatePropertyResponse,
  IUpdatePropertyStatusRequestParams,
  IUpdatePropertyStatusResponse,
} from '../interfaces/property.interface';
import {
  IAvailabilityCalendarRepository,
  IUpsertAvailabilityParams,
} from '../repositories/interfaces/availability-calendar.repository.interface';
import { IPropertyRepository } from '../repositories/interfaces/property-repository.interfaces';
import { CreatePropertyRequestSchema } from '../validations/schema';

@Injectable()
export class PropertyService {
  constructor(
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepository: IPropertyRepository,
    @Inject(AVAILABILITY_CALENDAR_REPOSITORY)
    private readonly availabilityCalendarRepository: IAvailabilityCalendarRepository,
  ) {}

  async getHostIdByPropertyId(propertyId: string): Promise<string | null> {
    const property = await this.propertyRepository.findPropertyById({
      id: propertyId,
    });
    return property?.hostId ?? null;
  }

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
        slug: property.slug,
        propertyType: property.propertyType as EPropertyType,
        status: property.status as EPropertyStatus,
        coverImage: property.images?.[0]?.url ?? null,
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
    this.validateCreatePropertyPayload(validatedParams.payload);

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

    // Generate unique slug based on title and location
    const baseSlug = SlugHelper.generatePropertySlug(
      payload.details.title,
      payload.address,
    );

    // Generate unique slug with random ID
    const uniqueSlug = SlugHelper.ensureUniqueSlug(baseSlug);

    // create property using db transactions
    const propertyMeta = await this.propertyRepository.createProperty({
      hostId: host.id,
      payload: payload as ICreatePropertyRequestParams['payload'],
      slug: uniqueSlug,
    });

    return {
      id: propertyMeta.id,
      title: propertyMeta.title,
      slug: propertyMeta.slug,
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

  async getPropertyAvailability(
    params: IGetPropertyAvailabilityRequestParams,
  ): Promise<IGetPropertyAvailabilityResponse> {
    const { user, params: p } = params;

    const property = await this.propertyRepository.findPropertyById({
      id: p.propertyId,
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.hostId !== user.id) {
      throw new ForbiddenException('You do not have access to this property');
    }

    const startDate = moment
      .utc(p.startDate, 'YYYY-MM-DD')
      .startOf('day')
      .toDate();
    const endDate = moment.utc(p.endDate, 'YYYY-MM-DD').startOf('day').toDate();

    if (startDate > endDate) {
      throw new BadRequestException(
        'startDate must be before or equal to endDate',
      );
    }

    const roomId = p.roomId ?? null;
    const rows = await this.availabilityCalendarRepository.findByRange({
      propertyId: p.propertyId,
      roomId,
      startDate,
      endDate,
    });

    const toDateKey = (d: Date | string): string =>
      d instanceof Date
        ? moment.utc(d).format('YYYY-MM-DD')
        : moment.utc(d).format('YYYY-MM-DD');

    const byDate = new Map(
      rows.map((r) => [
        toDateKey(r.date),
        {
          date: toDateKey(r.date),
          available: r.available,
          price: r.price != null ? Number(r.price) : null,
          minNights: r.minNights ?? null,
          maxNights: r.maxNights ?? null,
          note: r.note ?? null,
          blockReason: r.blockReason ?? null,
        },
      ]),
    );

    const items = this.getDatesInRangeInclusive(startDate, endDate).map((d) => {
      const key = moment.utc(d).format('YYYY-MM-DD');

      // default to true if not found
      return byDate.get(key) ?? { date: key, available: true };
    });

    return {
      propertyId: p.propertyId,
      roomId: p.roomId ?? undefined,
      startDate: p.startDate,
      endDate: p.endDate,
      items,
    };
  }

  async bulkUpdateAvailability(
    params: IBulkUpdateAvailabilityRequestParams,
  ): Promise<{ updated: number }> {
    const { user, params: p, payload } = params;

    const property = await this.propertyRepository.findPropertyById({
      id: p.propertyId,
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.hostId !== user.id) {
      throw new ForbiddenException('You do not have access to this property');
    }

    if (!payload.updates?.length) {
      throw new BadRequestException('updates array must not be empty');
    }

    const rows: IUpsertAvailabilityParams[] = payload.updates.map((u) => ({
      propertyId: p.propertyId,
      roomId: u.roomId ?? null,
      date: moment.utc(u.date, 'YYYY-MM-DD').startOf('day').toDate(),
      available: u.available,
      price: u.price ?? null,
      minNights: u.minNights ?? null,
      maxNights: u.maxNights ?? null,
      note: u.note ?? null,
      blockReason: u.blockReason ?? null,
    }));

    const saved = await this.availabilityCalendarRepository.upsertMany(rows);

    return { updated: saved.length };
  }

  async updateAvailabilityRange(
    params: IUpdatePropertyAvailabilityRequestParams,
  ): Promise<{ updated: number }> {
    const { user, params: p, payload } = params;

    const property = await this.propertyRepository.findPropertyById({
      id: p.propertyId,
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }
    if (property.hostId !== user.id) {
      throw new ForbiddenException('You do not have access to this property');
    }

    const startDate = moment
      .utc(payload.startDate, 'YYYY-MM-DD')
      .startOf('day')
      .toDate();
    const endDate = moment
      .utc(payload.endDate, 'YYYY-MM-DD')
      .endOf('day')
      .toDate();

    if (startDate > endDate) {
      throw new BadRequestException(
        'startDate must be before or equal to endDate',
      );
    }

    const roomId = payload.roomId ?? null;
    const dates = this.getDatesInRangeInclusive(startDate, endDate);

    const rows: IUpsertAvailabilityParams[] = dates.map((date) => ({
      propertyId: p.propertyId,
      roomId,
      date,
      available: payload.available,
      price: payload.price ?? null,
      minNights: payload.minNights ?? null,
      maxNights: payload.maxNights ?? null,
      note: payload.note ?? null,
      blockReason: payload.blockReason ?? null,
    }));

    const saved = await this.availabilityCalendarRepository.upsertMany(rows);

    return { updated: saved.length };
  }

  private getDatesInRangeInclusive(start: Date, end: Date): Date[] {
    const out: Date[] = [];
    let cur = moment.utc(start).startOf('day').toDate();
    const endNorm = moment.utc(end).startOf('day').toDate();

    while (cur <= endNorm) {
      out.push(moment.utc(cur).toDate());
      cur = moment.utc(cur).add(1, 'day').toDate();
    }

    return out;
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
      slug: property.slug,
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
      slug: updatedProperty.slug,
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
        slug: property.slug,
        propertyType: property.propertyType as EPropertyType,
        status: property.status as EPropertyStatus,
        coverImage: property.images?.[0]?.url ?? null,
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
        slug: property.slug,
        propertyType: property.propertyType as EPropertyType,
        status: property.status as EPropertyStatus,
        coverImage: property.images?.[0]?.url ?? null,
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

  // ─── Draft Onboarding Service Methods ────────────────────────────────────────

  async createDraftProperty(params: {
    user: RequestUser;
    payload: {
      title: string;
      description: string;
      propertyType: EPropertyType;
      /** When provided, update the existing draft instead of creating a new one. */
      propertyId?: string;
    };
  }): Promise<{ id: string; slug: string; status: EPropertyStatus }> {
    if (params.user.role !== EUserRole.HOST) {
      throw new ForbiddenException('Only hosts can create properties');
    }

    // ── UPDATE existing draft ─────────────────────────────────────────────────
    if (params.payload.propertyId) {
      const existing = await this.propertyRepository.findPropertyById({
        id: params.payload.propertyId,
      });
      if (!existing) throw new NotFoundException('Draft property not found');
      if (existing.hostId !== params.user.id) {
        throw new ForbiddenException(
          'Only the property owner can update this draft',
        );
      }
      if (existing.status !== EPropertyStatus.DRAFT) {
        throw new ConflictException('PROPERTY_NOT_IN_DRAFT_STATUS');
      }

      const newBaseSlug = SlugHelper.generatePropertySlug(
        params.payload.title,
        {
          city: '',
          country: '',
          state: '',
        },
      );
      const newSlug = SlugHelper.ensureUniqueSlug(newBaseSlug);

      const updated = await this.propertyRepository.updateProperty({
        id: params.payload.propertyId,
        title: params.payload.title,
        description: params.payload.description,
        propertyType: params.payload.propertyType,
        slug: newSlug,
      });

      return {
        id: updated.id,
        slug: updated.slug,
        status: updated.status as EPropertyStatus,
      };
    }

    // ── CREATE new draft ──────────────────────────────────────────────────────
    const exists = await this.propertyRepository.checkPropertyExists({
      hostId: params.user.id,
      title: params.payload.title,
    });
    if (exists) {
      throw new ConflictException('Property with this name already exists');
    }

    const baseSlug = SlugHelper.generatePropertySlug(params.payload.title, {
      city: '',
      country: '',
      state: '',
    });
    const slug = SlugHelper.ensureUniqueSlug(baseSlug);

    const property = await this.propertyRepository.createDraftProperty({
      hostId: params.user.id,
      title: params.payload.title,
      description: params.payload.description,
      propertyType: params.payload.propertyType,
      slug,
    });

    return {
      id: property.id,
      slug: property.slug,
      status: property.status as EPropertyStatus,
    };
  }

  async saveDraftLocation(params: {
    user: RequestUser;
    payload: OnboardingStep2Dto;
  }): Promise<void> {
    const property = await this.propertyRepository.findPropertyById({
      id: params.payload.propertyId,
    });
    if (!property) throw new NotFoundException('Property not found');
    if (property.hostId !== params.user.id) {
      throw new ForbiddenException('Only property owner can update this draft');
    }
    if (property.status !== EPropertyStatus.DRAFT) {
      throw new BadRequestException(
        'Only DRAFT properties can be updated via onboarding steps',
      );
    }

    await this.propertyRepository.upsertPropertyLocation({
      propertyId: params.payload.propertyId,
      addressLine1: params.payload.addressLine1,
      addressLine2: params.payload.addressLine2 ?? null,
      city: params.payload.city,
      state: params.payload.state ?? null,
      country: params.payload.country,
      postalCode: params.payload.postalCode ?? null,
      latitude: params.payload.latitude ?? null,
      longitude: params.payload.longitude ?? null,
    });
  }

  async saveDraftPricing(params: {
    user: RequestUser;
    payload: OnboardingStep3Dto;
  }): Promise<void> {
    const property = await this.propertyRepository.findPropertyById({
      id: params.payload.propertyId,
    });
    if (!property) throw new NotFoundException('Property not found');
    if (property.hostId !== params.user.id) {
      throw new ForbiddenException('Only property owner can update this draft');
    }
    if (property.status !== EPropertyStatus.DRAFT) {
      throw new BadRequestException(
        'Only DRAFT properties can be updated via onboarding steps',
      );
    }

    if (params.payload.minNights > params.payload.maxNights) {
      throw new BadRequestException('minNights cannot exceed maxNights');
    }
    if (params.payload.maxGuests <= 0) {
      throw new BadRequestException('Invalid maxGuests');
    }
    if (params.payload.checkInTime && params.payload.checkOutTime) {
      const checkInMin = timeToMinutes(params.payload.checkInTime);
      let checkOutMin = timeToMinutes(params.payload.checkOutTime);
      if (checkOutMin <= checkInMin) checkOutMin += 24 * 60;
      if (checkOutMin - checkInMin < 60) {
        throw new BadRequestException('Stay duration is too short');
      }
    }

    await Promise.all([
      this.propertyRepository.upsertPropertyPricing({
        propertyId: params.payload.propertyId,
        basePrice: params.payload.basePrice,
        currency: params.payload.currency,
      }),
      this.propertyRepository.upsertPropertyPolicy({
        propertyId: params.payload.propertyId,
        minNights: params.payload.minNights,
        maxNights: params.payload.maxNights,
        checkInTime: params.payload.checkInTime,
        checkOutTime: params.payload.checkOutTime,
        cancellationPolicy:
          params.payload.cancellationPolicy ??
          EPropertyCancellationPolicy.FLEXIBLE,
        instantBook: params.payload.enableWaitlist ?? false,
      }),
      this.propertyRepository.upsertPropertyDetails({
        propertyId: params.payload.propertyId,
        maxGuests: params.payload.maxGuests,
      }),
    ]);
  }

  async saveDraftAmenities(params: {
    user: RequestUser;
    payload: OnboardingStep4Dto;
  }): Promise<void> {
    const property = await this.propertyRepository.findPropertyById({
      id: params.payload.propertyId,
    });
    if (!property) throw new NotFoundException('Property not found');
    if (property.hostId !== params.user.id) {
      throw new ForbiddenException('Only property owner can update this draft');
    }
    if (property.status !== EPropertyStatus.DRAFT) {
      throw new BadRequestException(
        'Only DRAFT properties can be updated via onboarding steps',
      );
    }

    await this.propertyRepository.replacePropertyAmenities({
      propertyId: params.payload.propertyId,
      amenities: params.payload.amenities,
      rules: params.payload.rules ?? [],
    });
  }

  async saveDraftPhotos(params: {
    user: RequestUser;
    payload: OnboardingStep5Dto;
  }): Promise<void> {
    const property = await this.propertyRepository.findPropertyById({
      id: params.payload.propertyId,
    });
    if (!property) throw new NotFoundException('Property not found');
    if (property.hostId !== params.user.id) {
      throw new ForbiddenException('Only property owner can update this draft');
    }
    if (property.status !== EPropertyStatus.DRAFT) {
      throw new BadRequestException(
        'Only DRAFT properties can be updated via onboarding steps',
      );
    }

    await this.propertyRepository.replacePropertyImages({
      propertyId: params.payload.propertyId,
      images: params.payload.images.map((img, i) => ({
        url: img.url,
        thumbnailUrl: img.thumbnailUrl ?? null,
        caption: img.caption ?? null,
        altText: img.altText ?? null,
        displayOrder: img.displayOrder ?? i,
        isPrimary: img.isPrimary ?? i === 0,
        width: img.width ?? null,
        height: img.height ?? null,
        fileSize: img.fileSize ?? null,
        mimeType: img.mimeType ?? null,
      })),
    });
  }

  async publishDraftProperty(params: {
    user: RequestUser;
    payload: { propertyId: string };
  }): Promise<{ id: string; slug: string; status: EPropertyStatus }> {
    const property = await this.propertyRepository.findPropertyById({
      id: params.payload.propertyId,
    });
    if (!property) throw new NotFoundException('Property not found');
    if (property.hostId !== params.user.id) {
      throw new ForbiddenException(
        'Only property owner can publish this listing',
      );
    }
    if (property.status !== EPropertyStatus.DRAFT) {
      throw new BadRequestException('Property is not in DRAFT status');
    }

    // Completeness gate
    const stepRelations =
      await this.propertyRepository.findPropertyWithStepRelations({
        propertyId: params.payload.propertyId,
      });
    const missing: string[] = [];
    if (!stepRelations.hasLocation) missing.push('location (step 2)');
    if (!stepRelations.hasPricing) missing.push('pricing (step 3)');
    if (!stepRelations.hasPolicy) missing.push('policies (step 3)');
    if (!stepRelations.hasDetails) missing.push('details (step 3)');
    if (!stepRelations.hasImages) missing.push('photos (step 5)');
    if (missing.length > 0) {
      throw new BadRequestException(
        `Cannot publish: missing ${missing.join(', ')}`,
      );
    }

    const published = await this.propertyRepository.publishDraftProperty({
      propertyId: params.payload.propertyId,
    });

    return {
      id: published.id,
      slug: published.slug,
      status: published.status as EPropertyStatus,
    };
  }

  async getDraftForResume(params: { user: RequestUser }): Promise<{
    propertyId: string;
    completedSteps: number[];
    currentStep: number;
  } | null> {
    if (params.user.role !== EUserRole.HOST) {
      return null;
    }

    const draft = await this.propertyRepository.findDraftPropertyByHostId({
      hostId: params.user.id,
    });
    if (!draft) return null;

    const stepRelations =
      await this.propertyRepository.findPropertyWithStepRelations({
        propertyId: draft.id,
      });

    const completedSteps: number[] = [1]; // Step 1 is done (property exists)
    if (stepRelations.hasLocation) completedSteps.push(2);
    if (
      stepRelations.hasPricing &&
      stepRelations.hasPolicy &&
      stepRelations.hasDetails
    ) {
      completedSteps.push(3);
    }
    if (stepRelations.hasLocation && completedSteps.includes(3)) {
      // Amenities step — we can't easily check without querying PropertyAmenityEntity
      // so we optimistically skip; the wizard will show step 4 if step 3 is done
    }
    if (stepRelations.hasImages) completedSteps.push(5);

    const currentStep = Math.min(Math.max(...completedSteps) + 1, 5);

    return {
      propertyId: draft.id,
      completedSteps,
      currentStep,
    };
  }

  async getDraftDetails(params: {
    user: RequestUser;
    propertyId: string;
  }): Promise<IGetPropertyDetailsResponse> {
    const property = await this.propertyRepository.findPropertyById({
      id: params.propertyId,
    });
    if (!property) throw new NotFoundException('Property not found');
    if (property.hostId !== params.user.id) {
      throw new ForbiddenException('Access denied');
    }
    if (property.status !== EPropertyStatus.DRAFT) {
      throw new BadRequestException('Property is not a draft');
    }

    return this.getPropertyDetails({
      params: { propertyId: params.propertyId, includeRelations: true },
    });
  }
}
