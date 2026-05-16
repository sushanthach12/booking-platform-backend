import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  DeepPartial,
  EntityNotFoundError,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { ECurrency } from '../../../common/enums/currency.enum';
import { Amenity, AmenityCategory } from '../../entities/amenity.entity';
import { AvailabilityCalenderEntity } from '../../entities/availability-calendar.entity';
import { HouseRuleEntity, RuleType } from '../../entities/house-rules.entity';
import { PropertyAmenityEntity } from '../../entities/property-amenity.entity';
import { PropertyDetailsEntity } from '../../entities/property-details.entity';
import { PropertyImageEntity } from '../../entities/property-image.entity';
import { PropertyLocationEntity } from '../../entities/property-location.entity';
import { PropertyPolicyEntity } from '../../entities/property-policy.entity';
import { PropertyPricingEntity } from '../../entities/property-pricing.entity';
import { PropertyRatingEntity } from '../../entities/property-rating.entity';
import { PropertyEntity } from '../../entities/property.entity';
import { RoomEntity } from '../../entities/rooms.entity';
import {
  EPropertyAmenityCategory,
  EPropertyCancellationPolicy,
  EPropertyRuleType,
  EPropertyStatus,
  EPropertyType,
} from '../../enums/property.enum';
import { ERoomStatus } from '../../enums/rooms.enum';
import {
  ICheckPropertyExistsImplParams,
  ICountPropertiesImplParams,
  ICreateAmenityImplParams,
  ICreateDraftPropertyImplParams,
  ICreateHouseRuleImplParams,
  // ICreatePropertyAmenityImplParams,
  ICreatePropertyDetailsImplParams,
  // ICreatePropertyImageImplParams,
  ICreatePropertyImplParams,
  ICreatePropertyImplResponse,
  ICreatePropertyLocationImplParams,
  ICreatePropertyPolicyImplParams,
  ICreatePropertyPricingImplParams,
  ICreatePropertyRatingImplParams,
  ICreateRoomImplParams,
  IFindAmenitiesImplParams,
  IFindAmenityByIdImplParams,
  IFindDraftPropertyByHostIdImplParams,
  IFindHouseRuleByIdImplParams,
  IFindHouseRulesImplParams,
  IFindHouseRulesByPropertyIdImplParams,
  IFindPropertiesImplParams,
  // IFindPropertyAmenitiesImplParams,
  // IFindPropertyAmenityByIdImplParams,
  IFindPropertyAmenitiesByPropertyIdImplParams,
  IFindPropertyByIdImplParams,
  IFindPropertyDetailsByIdImplParams,
  IFindPropertyDetailsByPropertyIdImplParams,
  // IFindPropertyImageByIdImplParams,
  // IFindPropertyImagesImplParams,
  IFindPropertyImagesByPropertyIdImplParams,
  IFindPropertyLocationByIdImplParams,
  IFindPropertyLocationByPropertyIdImplParams,
  IFindPropertyPolicyByIdImplParams,
  IFindPropertyPolicyByPropertyIdImplParams,
  IFindPropertyPricingByIdImplParams,
  IFindPropertyPricingByPropertyIdImplParams,
  IFindPropertyRatingByIdImplParams,
  IFindPropertyRatingByPropertyIdImplParams,
  IFindPropertyWithStepRelationsImplParams,
  IFindRoomByIdImplParams,
  IFindRoomsImplParams,
  IPropertyRepository,
  IPropertyStepRelations,
  IReplacePropertyAmenitiesImplParams,
  IReplacePropertyImagesImplParams,
  ISearchPropertiesImplParams,
  ISearchPropertiesImplResult,
  IUpdateAmenityImplParams,
  IUpdateHouseRuleImplParams,
  // IUpdatePropertyAmenityImplParams,
  IUpdatePropertyDetailsImplParams,
  // IUpdatePropertyImageImplParams,
  IUpdatePropertyImplParams,
  IUpdatePropertyLocationImplParams,
  IUpdatePropertyPolicyImplParams,
  IUpdatePropertyPricingImplParams,
  IUpdatePropertyRatingImplParams,
  IUpdateRoomImplParams,
  IUpsertPropertyDetailsImplParams,
  IUpsertPropertyLocationImplParams,
  IUpsertPropertyPolicyImplParams,
  IUpsertPropertyPricingImplParams,
} from '../interfaces/property-repository.interfaces';

@Injectable()
export class PropertyRepository implements IPropertyRepository {
  private readonly logger = new Logger(PropertyRepository.name);

  constructor(
    @InjectRepository(PropertyEntity)
    private readonly propertyRepository: Repository<PropertyEntity>,
    @InjectRepository(Amenity)
    private readonly amenityRepository: Repository<Amenity>,
    @InjectRepository(PropertyLocationEntity)
    private readonly propertyLocationRepository: Repository<PropertyLocationEntity>,
    @InjectRepository(PropertyAmenityEntity)
    private readonly propertyAmenityRepository: Repository<PropertyAmenityEntity>,
    @InjectRepository(PropertyRatingEntity)
    private readonly propertyRatingRepository: Repository<PropertyRatingEntity>,
    @InjectRepository(PropertyImageEntity)
    private readonly propertyImageRepository: Repository<PropertyImageEntity>,
    @InjectRepository(RoomEntity)
    private readonly roomRepository: Repository<RoomEntity>,
    @InjectRepository(HouseRuleEntity)
    private readonly houseRuleRepository: Repository<HouseRuleEntity>,
    @InjectRepository(PropertyDetailsEntity)
    private readonly propertyDetailsRepository: Repository<PropertyDetailsEntity>,
    @InjectRepository(PropertyPolicyEntity)
    private readonly propertyPolicyRepository: Repository<PropertyPolicyEntity>,
    @InjectRepository(PropertyPricingEntity)
    private readonly propertyPricingRepository: Repository<PropertyPricingEntity>,
    @InjectRepository(AvailabilityCalenderEntity)
    private readonly availabilityCalendarRepository: Repository<AvailabilityCalenderEntity>,
    private readonly dataSource: DataSource,
  ) {}
  getAllPropertySlugs(): Promise<string[]> {
    throw new InternalServerErrorException('Method not implemented.');
  }

  /**
   * Common error handler for database-level errors
   * Transforms DB errors into application-friendly errors
   */
  private handleDbError(
    error: unknown,
    operation: string,
    entity: string,
  ): never {
    this.logger.error(`Database error in ${operation} for ${entity}:`, error);

    if (error instanceof QueryFailedError) {
      const pgError = error as { code?: string; constraint?: string };

      if (pgError.code === '23505') {
        const constraint = pgError.constraint || 'unknown';
        throw new ConflictException(
          `Duplicate entry: ${constraint} already exists`,
        );
      }

      if (pgError.code === '23503') {
        throw new BadRequestException(`Referenced record does not exist`);
      }

      if (pgError.code === '23502') {
        throw new BadRequestException(`Required field is missing`);
      }

      if (pgError.code === '23514') {
        throw new BadRequestException(`Invalid data: constraint violation`);
      }

      throw new InternalServerErrorException(
        'Database operation failed. Please try again.',
      );
    }

    if (error instanceof EntityNotFoundError) {
      throw new NotFoundException('Record not found');
    }

    if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException ||
      error instanceof ConflictException
    ) {
      throw error;
    }

    throw new InternalServerErrorException(
      'An unexpected database error occurred. Please try again.',
    );
  }

  // ==================== Property CRUD ====================

  async checkPropertyExists(
    params: ICheckPropertyExistsImplParams,
  ): Promise<boolean> {
    try {
      const property = await this.propertyRepository.findOne({
        where: { hostId: params.hostId, title: params.title },
        select: { id: true },
      });
      return property !== null;
    } catch (error) {
      this.handleDbError(error, 'checkPropertyExists', 'Property');
    }
  }

  private mapHostRuleTypeToEntity(ruleType: EPropertyRuleType): RuleType {
    if (ruleType === EPropertyRuleType.NO_SMOKING) {
      return RuleType.SMOKING;
    }
    const value = ruleType as string;
    const values = Object.values(RuleType) as string[];
    if (values.includes(value)) {
      return value as RuleType;
    }
    return RuleType.OTHER;
  }

  private mapHostAmenityCategory(
    category: EPropertyAmenityCategory,
  ): AmenityCategory {
    switch (category) {
      case EPropertyAmenityCategory.GENERAL:
        return AmenityCategory.ESSENTIALS;
      case EPropertyAmenityCategory.ESSENTIALS:
        return AmenityCategory.ESSENTIALS;
      case EPropertyAmenityCategory.FEATURES:
        return AmenityCategory.FEATURES;
      case EPropertyAmenityCategory.LOCATION:
        return AmenityCategory.LOCATION;
      case EPropertyAmenityCategory.SAFETY:
        return AmenityCategory.SAFETY;
      default:
        return AmenityCategory.ESSENTIALS;
    }
  }

  async createProperty(
    params: ICreatePropertyImplParams,
  ): Promise<ICreatePropertyImplResponse> {
    try {
      const { hostId, payload, slug } = params;
      const imageUrls = payload.imageUrls ?? [];

      const result = await this.dataSource.transaction(async (manager) => {
        const images = imageUrls.map((url, index) =>
          manager.create(PropertyImageEntity, {
            url,
            displayOrder: index,
            isPrimary: index === 0,
            thumbnailUrl: null,
            caption: null,
            altText: null,
            roomId: null,
            width: null,
            height: null,
            fileSize: null,
            mimeType: null,
          }),
        );

        /* ----------------------------------
         * 1. Create Property (root entity)
         * ---------------------------------- */
        const property: PropertyEntity = manager.create(PropertyEntity, {
          hostId: hostId,
          slug,
          title: payload.details.title,
          description: payload.details.description ?? null,
          propertyType: payload.details.propertyType,
          status: EPropertyStatus.ACTIVE,
          details: {
            maxGuests: payload.policies.maxGuests,
            bedrooms: 1,
            beds: 1,
            bathrooms: 1.0,
          },
          pricing: {
            basePrice: payload.pricing.basePrice,
            cleaningFee: 0,
          },
          ratings: {
            rating: 0,
            reviewCount: 0,
          },
          policies: {
            minNights: payload.policies.minNights,
            maxNights: payload.policies.maxNights,
            maxGuests: payload.policies.maxGuests,
            checkInTime: payload.policies.checkInTime,
            checkOutTime: payload.policies.checkOutTime,
            cancellationPolicy: payload.policies.cancellationPolicy,
            instantBook: payload.policies.enableWaitlist,
          },
          rooms: [],
          amenities: [],
          images,
          houseRules: [],
          location: {
            addressLine1: payload.address.addressLine1,
            addressLine2: payload.address.addressLine2 ?? null,
            city: payload.address.city,
            state: payload.address.state ?? null,
            country: payload.address.country,
            postalCode: payload.address.postalCode ?? null,
            latitude: payload.address.latitude ?? null,
            longitude: payload.address.longitude ?? null,
          },
        } as DeepPartial<PropertyEntity>);

        const savedProperty = await manager.save(property);

        const rules = payload.rules ?? [];
        const seenHouseRuleTypes = new Set<RuleType>();
        for (const r of rules) {
          const entityRuleType = this.mapHostRuleTypeToEntity(r.ruleType);
          if (seenHouseRuleTypes.has(entityRuleType)) {
            continue;
          }
          seenHouseRuleTypes.add(entityRuleType);
          const allowed =
            r.ruleType === EPropertyRuleType.NO_SMOKING ? false : r.allowed;
          await manager.save(
            manager.create(HouseRuleEntity, {
              propertyId: savedProperty.id,
              ruleType: entityRuleType,
              allowed,
              description: r.description ?? null,
            }),
          );
        }

        const amenityRepo = manager.getRepository(Amenity);
        const linkedAmenityIds = new Set<string>();
        for (const a of payload.amenities ?? []) {
          let amenity = await amenityRepo.findOne({
            where: { name: a.name },
          });
          if (!amenity) {
            amenity = await amenityRepo.save(
              amenityRepo.create({
                name: a.name,
                category: this.mapHostAmenityCategory(a.category),
                icon: a.icon ?? null,
                description: a.description ?? null,
              }),
            );
          }
          if (linkedAmenityIds.has(amenity.id)) {
            continue;
          }
          linkedAmenityIds.add(amenity.id);
          await manager.save(
            manager.create(PropertyAmenityEntity, {
              propertyId: savedProperty.id,
              amenityId: amenity.id,
              notes: null,
            }),
          );
        }

        return {
          id: savedProperty.id,
          title: savedProperty.title,
          description: savedProperty.description,
          slug: savedProperty.slug,
          propertyType: savedProperty.propertyType,
          status: savedProperty.status,
          createdAt: savedProperty.createdAt,
          updatedAt: savedProperty.updatedAt,
        };
      });

      return {
        id: result.id,
        title: result.title,
        description: result.description,
        slug: result.slug,
        propertyType: result.propertyType as EPropertyType,
        status: result.status as EPropertyStatus,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      };
    } catch (error) {
      this.handleDbError(error, 'createProperty', 'Property');
    }
  }

  async findPropertyById(
    params: IFindPropertyByIdImplParams,
  ): Promise<PropertyEntity | null> {
    try {
      return await this.propertyRepository.findOne({
        where: { id: params.id },
      });
    } catch (error) {
      this.handleDbError(error, 'findPropertyById', 'Property');
    }
  }

  async findProperties(
    params?: IFindPropertiesImplParams,
  ): Promise<PropertyEntity[]> {
    try {
      const queryBuilder =
        this.propertyRepository.createQueryBuilder('property');

      queryBuilder.leftJoinAndSelect(
        'property.images',
        'image',
        'image.isPrimary = true',
      );
      queryBuilder.leftJoinAndSelect('property.location', 'location');
      queryBuilder.leftJoinAndSelect('property.pricing', 'pricing');
      queryBuilder.leftJoinAndSelect('property.ratings', 'ratings');

      if (params?.hostId) {
        queryBuilder.where('property.hostId = :hostId', {
          hostId: params.hostId,
        });
      }

      if (params?.status) {
        queryBuilder.andWhere('property.status = :status', {
          status: params.status,
        });
      }

      if (params?.propertyType) {
        queryBuilder.andWhere('property.propertyType = :propertyType', {
          propertyType: params.propertyType,
        });
      }

      if (params?.limit) {
        queryBuilder.limit(params.limit);
      }

      if (params?.offset) {
        queryBuilder.offset(params.offset);
      }

      return await queryBuilder.getMany();
    } catch (error) {
      this.handleDbError(error, 'findProperties', 'Property');
    }
  }

  async countProperties(params: ICountPropertiesImplParams): Promise<number> {
    try {
      const queryBuilder =
        this.propertyRepository.createQueryBuilder('property');

      if (params?.propertyType) {
        queryBuilder.andWhere('property.propertyType = :propertyType', {
          propertyType: params.propertyType,
        });
      }

      if (params?.status) {
        queryBuilder.andWhere('property.status = :status', {
          status: params.status,
        });
      }

      if (params?.hostId) {
        queryBuilder.andWhere('property.hostId = :hostId', {
          hostId: params.hostId,
        });
      }

      if (params?.title) {
        queryBuilder.andWhere('property.title = :title', {
          title: params.title,
        });
      }

      return await queryBuilder.getCount();
    } catch (error) {
      this.handleDbError(error, 'countProperties', 'Property');
    }
  }

  async searchProperties(
    params: ISearchPropertiesImplParams,
  ): Promise<ISearchPropertiesImplResult> {
    try {
      const qb = this.propertyRepository
        .createQueryBuilder('property')
        .leftJoinAndSelect('property.images', 'image', 'image.isPrimary = true')
        .leftJoinAndSelect('property.location', 'location')
        .leftJoinAndSelect('property.pricing', 'pricing')
        .leftJoinAndSelect('property.details', 'details')
        .leftJoinAndSelect('property.ratings', 'ratings')
        .where('property.status = :status', { status: EPropertyStatus.ACTIVE });

      if (params.location) {
        qb.andWhere(
          '(LOWER(location.city) ILIKE :loc OR LOWER(location.country) ILIKE :loc OR LOWER(location.state) ILIKE :loc OR LOWER(location.addressLine1) ILIKE :loc)',
          { loc: `%${params.location.toLowerCase()}%` },
        );
      }

      if (params.propertyType?.length) {
        qb.andWhere('property.propertyType IN (:...types)', {
          types: params.propertyType,
        });
      }

      if (params.minPrice != null) {
        qb.andWhere('pricing.basePrice >= :minPrice', {
          minPrice: params.minPrice,
        });
      }

      if (params.maxPrice != null) {
        qb.andWhere('pricing.basePrice <= :maxPrice', {
          maxPrice: params.maxPrice,
        });
      }

      if (params.guests != null) {
        qb.andWhere('details.maxGuests >= :guests', { guests: params.guests });
      }

      if (params.minBeds != null) {
        qb.andWhere('details.beds >= :minBeds', { minBeds: params.minBeds });
      }

      if (params.minBathrooms != null) {
        qb.andWhere('details.bathrooms >= :minBathrooms', {
          minBathrooms: params.minBathrooms,
        });
      }

      if (params.amenities?.length) {
        qb.innerJoin('property.amenities', 'pa')
          .innerJoin('pa.amenity', 'amenity')
          .andWhere('LOWER(amenity.name) IN (:...amenities)', {
            amenities: params.amenities.map((a) => a.toLowerCase()),
          });
      }

      if (params.checkIn && params.checkOut) {
        // Exclude properties that have any unavailable date in the requested range
        qb.andWhere(
          `NOT EXISTS (
            SELECT 1 FROM availability_calendar ac
            WHERE ac.property_id = property.id
              AND ac.date >= :checkIn
              AND ac.date < :checkOut
              AND ac.available = false
          )`,
          { checkIn: params.checkIn, checkOut: params.checkOut },
        );
      }

      const sortColumn =
        params.sortBy === 'price'
          ? 'pricing.basePrice'
          : params.sortBy === 'rating'
            ? 'ratings.averageRating'
            : 'property.createdAt';

      qb.orderBy(sortColumn, params.sortOrder ?? 'DESC')
        .limit(params.limit)
        .offset(params.offset);

      const [properties, total] = await qb.getManyAndCount();
      return { properties, total };
    } catch (error) {
      this.handleDbError(error, 'searchProperties', 'Property');
    }
  }

  async updateProperty(
    params: IUpdatePropertyImplParams,
  ): Promise<PropertyEntity> {
    try {
      const property = await this.findPropertyById({ id: params.id });
      if (!property) {
        throw new NotFoundException('Property not found');
      }

      Object.assign(property, {
        ...(params.title !== undefined && { title: params.title }),
        ...(params.description !== undefined && {
          description: params.description,
        }),
        ...(params.propertyType !== undefined && {
          propertyType: params.propertyType,
        }),
        ...(params.status !== undefined && { status: params.status }),
      });

      return await this.propertyRepository.save(property);
    } catch (error) {
      this.handleDbError(error, 'updateProperty', 'Property');
    }
  }

  async deleteProperty(params: IFindPropertyByIdImplParams): Promise<boolean> {
    try {
      const result = await this.propertyRepository.delete(params.id);
      return (result.affected ?? 0) > 0;
    } catch (error) {
      this.handleDbError(error, 'deleteProperty', 'Property');
    }
  }

  // ==================== Amenity CRUD ====================

  async createAmenity(params: ICreateAmenityImplParams): Promise<Amenity> {
    try {
      const amenity = this.amenityRepository.create({
        name: params.name,
        category: params.category,
        icon: params.icon ?? null,
        description: params.description ?? null,
      });

      return await this.amenityRepository.save(amenity);
    } catch (error) {
      this.handleDbError(error, 'createAmenity', 'Amenity');
    }
  }

  async findAmenityById(
    params: IFindAmenityByIdImplParams,
  ): Promise<Amenity | null> {
    try {
      return await this.amenityRepository.findOne({
        where: { id: params.id },
      });
    } catch (error) {
      this.handleDbError(error, 'findAmenityById', 'Amenity');
    }
  }

  async findAmenities(params?: IFindAmenitiesImplParams): Promise<Amenity[]> {
    try {
      const queryBuilder = this.amenityRepository.createQueryBuilder('amenity');

      if (params?.category) {
        queryBuilder.where('amenity.category = :category', {
          category: params.category,
        });
      }

      if (params?.limit) {
        queryBuilder.limit(params.limit);
      }

      if (params?.offset) {
        queryBuilder.offset(params.offset);
      }

      return await queryBuilder.getMany();
    } catch (error) {
      this.handleDbError(error, 'findAmenities', 'Amenity');
    }
  }

  async updateAmenity(params: IUpdateAmenityImplParams): Promise<Amenity> {
    try {
      const amenity = await this.findAmenityById({ id: params.id });
      if (!amenity) {
        throw new NotFoundException('Amenity not found');
      }

      Object.assign(amenity, {
        ...(params.name !== undefined && { name: params.name }),
        ...(params.category !== undefined && { category: params.category }),
        ...(params.icon !== undefined && { icon: params.icon }),
        ...(params.description !== undefined && {
          description: params.description,
        }),
      });

      return await this.amenityRepository.save(amenity);
    } catch (error) {
      this.handleDbError(error, 'updateAmenity', 'Amenity');
    }
  }

  async deleteAmenity(params: IFindAmenityByIdImplParams): Promise<boolean> {
    try {
      const result = await this.amenityRepository.delete(params.id);
      return (result.affected ?? 0) > 0;
    } catch (error) {
      this.handleDbError(error, 'deleteAmenity', 'Amenity');
    }
  }

  // ==================== Property Location CRUD ====================

  async createPropertyLocation(
    params: ICreatePropertyLocationImplParams,
  ): Promise<PropertyLocationEntity> {
    try {
      const location = this.propertyLocationRepository.create({
        propertyId: params.propertyId,
        location: params.location ?? null,
        addressLine1: params.addressLine1,
        addressLine2: params.addressLine2 ?? null,
        city: params.city,
        state: params.state ?? null,
        country: params.country,
        postalCode: params.postalCode ?? null,
        latitude: params.latitude ?? null,
        longitude: params.longitude ?? null,
      });

      return await this.propertyLocationRepository.save(location);
    } catch (error) {
      this.handleDbError(error, 'createPropertyLocation', 'PropertyLocation');
    }
  }

  async findPropertyLocationById(
    params: IFindPropertyLocationByIdImplParams,
  ): Promise<PropertyLocationEntity | null> {
    try {
      return await this.propertyLocationRepository.findOne({
        where: { id: params.id },
      });
    } catch (error) {
      this.handleDbError(error, 'findPropertyLocationById', 'PropertyLocation');
    }
  }

  async findPropertyLocationByPropertyId(
    params: IFindPropertyLocationByPropertyIdImplParams,
  ): Promise<PropertyLocationEntity | null> {
    try {
      return await this.propertyLocationRepository.findOne({
        where: { propertyId: params.propertyId },
      });
    } catch (error) {
      this.handleDbError(
        error,
        'findPropertyLocationByPropertyId',
        'PropertyLocation',
      );
    }
  }

  async updatePropertyLocation(
    params: IUpdatePropertyLocationImplParams,
  ): Promise<PropertyLocationEntity> {
    try {
      const location = await this.findPropertyLocationById({ id: params.id });
      if (!location) {
        throw new NotFoundException('Property location not found');
      }

      Object.assign(location, {
        ...(params.location !== undefined && { location: params.location }),
        ...(params.addressLine1 !== undefined && {
          addressLine1: params.addressLine1,
        }),
        ...(params.addressLine2 !== undefined && {
          addressLine2: params.addressLine2,
        }),
        ...(params.city !== undefined && { city: params.city }),
        ...(params.state !== undefined && { state: params.state }),
        ...(params.country !== undefined && { country: params.country }),
        ...(params.postalCode !== undefined && {
          postalCode: params.postalCode,
        }),
        ...(params.latitude !== undefined && { latitude: params.latitude }),
        ...(params.longitude !== undefined && { longitude: params.longitude }),
      });

      return await this.propertyLocationRepository.save(location);
    } catch (error) {
      this.handleDbError(error, 'updatePropertyLocation', 'PropertyLocation');
    }
  }

  async deletePropertyLocation(
    params: IFindPropertyLocationByIdImplParams,
  ): Promise<boolean> {
    try {
      const result = await this.propertyLocationRepository.delete(params.id);
      return (result.affected ?? 0) > 0;
    } catch (error) {
      this.handleDbError(error, 'deletePropertyLocation', 'PropertyLocation');
    }
  }

  // ==================== Property Amenity CRUD ====================

  // async createPropertyAmenity(
  //   params: ICreatePropertyAmenityImplParams,
  // ): Promise<PropertyAmenityEntity> {
  //   try {
  //     const propertyAmenity = this.propertyAmenityRepository.create({
  //       propertyId: params.propertyId,
  //       amenityId: params.amenityId,
  //       notes: params.notes ?? null,
  //     });

  //     return await this.propertyAmenityRepository.save(propertyAmenity);
  //   } catch (error) {
  //     this.handleDbError(error, 'createPropertyAmenity', 'PropertyAmenity');
  //   }
  // }

  // async findPropertyAmenityById(
  //   params: IFindPropertyAmenityByIdImplParams,
  // ): Promise<PropertyAmenityEntity | null> {
  //   try {
  //     return await this.propertyAmenityRepository.findOne({
  //       where: { id: params.id },
  //     });
  //   } catch (error) {
  //     this.handleDbError(error, 'findPropertyAmenityById', 'PropertyAmenity');
  //   }
  // }

  // async findPropertyAmenities(
  //   params?: IFindPropertyAmenitiesImplParams,
  // ): Promise<PropertyAmenityEntity[]> {
  //   try {
  //     const queryBuilder =
  //       this.propertyAmenityRepository.createQueryBuilder('propertyAmenity');

  //     if (params?.propertyId) {
  //       queryBuilder.where('propertyAmenity.propertyId = :propertyId', {
  //         propertyId: params.propertyId,
  //       });
  //     }

  //     if (params?.amenityId) {
  //       queryBuilder.andWhere('propertyAmenity.amenityId = :amenityId', {
  //         amenityId: params.amenityId,
  //       });
  //     }

  //     if (params?.limit) {
  //       queryBuilder.limit(params.limit);
  //     }

  //     if (params?.offset) {
  //       queryBuilder.offset(params.offset);
  //     }

  //     return await queryBuilder.getMany();
  //   } catch (error) {
  //     this.handleDbError(error, 'findPropertyAmenities', 'PropertyAmenity');
  //   }
  // }

  // async updatePropertyAmenity(
  //   params: IUpdatePropertyAmenityImplParams,
  // ): Promise<PropertyAmenityEntity> {
  //   try {
  //     const propertyAmenity = await this.findPropertyAmenityById({
  //       id: params.id,
  //     });
  //     if (!propertyAmenity) {
  //       throw new Error('Property amenity not found');
  //     }

  //     Object.assign(propertyAmenity, {
  //       ...(params.notes !== undefined && { notes: params.notes }),
  //     });

  //     return await this.propertyAmenityRepository.save(propertyAmenity);
  //   } catch (error) {
  //     this.handleDbError(error, 'updatePropertyAmenity', 'PropertyAmenity');
  //   }
  // }

  // async deletePropertyAmenity(
  //   params: IFindPropertyAmenityByIdImplParams,
  // ): Promise<boolean> {
  //   try {
  //     const result = await this.propertyAmenityRepository.delete(params.id);
  //     return (result.affected ?? 0) > 0;
  //   } catch (error) {
  //     this.handleDbError(error, 'deletePropertyAmenity', 'PropertyAmenity');
  //   }
  // }

  // ==================== Property Rating CRUD ====================

  async createPropertyRating(
    params: ICreatePropertyRatingImplParams,
  ): Promise<PropertyRatingEntity> {
    try {
      const rating = this.propertyRatingRepository.create({
        propertyId: params.propertyId,
        averageRating: params.averageRating ?? 0,
        totalReviews: params.totalReviews ?? 0,
      });

      return await this.propertyRatingRepository.save(rating);
    } catch (error) {
      this.handleDbError(error, 'createPropertyRating', 'PropertyRating');
    }
  }

  async findPropertyRatingById(
    params: IFindPropertyRatingByIdImplParams,
  ): Promise<PropertyRatingEntity | null> {
    try {
      return await this.propertyRatingRepository.findOne({
        where: { id: params.id },
      });
    } catch (error) {
      this.handleDbError(error, 'findPropertyRatingById', 'PropertyRating');
    }
  }

  async findPropertyRatingByPropertyId(
    params: IFindPropertyRatingByPropertyIdImplParams,
  ): Promise<PropertyRatingEntity | null> {
    try {
      return await this.propertyRatingRepository.findOne({
        where: { propertyId: params.propertyId },
      });
    } catch (error) {
      this.handleDbError(
        error,
        'findPropertyRatingByPropertyId',
        'PropertyRating',
      );
    }
  }

  async updatePropertyRating(
    params: IUpdatePropertyRatingImplParams,
  ): Promise<PropertyRatingEntity> {
    try {
      const rating = await this.findPropertyRatingById({ id: params.id });
      if (!rating) {
        throw new NotFoundException('Property rating not found');
      }

      Object.assign(rating, {
        ...(params.averageRating !== undefined && {
          averageRating: params.averageRating,
        }),
        ...(params.totalReviews !== undefined && {
          totalReviews: params.totalReviews,
        }),
      });

      return await this.propertyRatingRepository.save(rating);
    } catch (error) {
      this.handleDbError(error, 'updatePropertyRating', 'PropertyRating');
    }
  }

  async deletePropertyRating(
    params: IFindPropertyRatingByIdImplParams,
  ): Promise<boolean> {
    try {
      const result = await this.propertyRatingRepository.delete(params.id);
      return (result.affected ?? 0) > 0;
    } catch (error) {
      this.handleDbError(error, 'deletePropertyRating', 'PropertyRating');
    }
  }

  // ==================== Property Image CRUD ====================

  // async createPropertyImage(
  //   params: ICreatePropertyImageImplParams,
  // ): Promise<PropertyImageEntity> {
  //   try {
  //     const image = this.propertyImageRepository.create({
  //       propertyId: params.propertyId,
  //       roomId: params.roomId ?? null,
  //       url: params.url,
  //       thumbnailUrl: params.thumbnailUrl ?? null,
  //       caption: params.caption ?? null,
  //       altText: params.altText ?? null,
  //       displayOrder: params.displayOrder ?? 0,
  //       isPrimary: params.isPrimary ?? false,
  //       width: params.width ?? null,
  //       height: params.height ?? null,
  //       fileSize: params.fileSize ?? null,
  //       mimeType: params.mimeType ?? null,
  //     });

  //     return await this.propertyImageRepository.save(image);
  //   } catch (error) {
  //     this.handleDbError(error, 'createPropertyImage', 'PropertyImage');
  //   }
  // }

  // async findPropertyImageById(
  //   params: IFindPropertyImageByIdImplParams,
  // ): Promise<PropertyImageEntity | null> {
  //   try {
  //     return await this.propertyImageRepository.findOne({
  //       where: { id: params.id },
  //     });
  //   } catch (error) {
  //     this.handleDbError(error, 'findPropertyImageById', 'PropertyImage');
  //   }
  // }

  // async findPropertyImages(
  //   params?: IFindPropertyImagesImplParams,
  // ): Promise<PropertyImageEntity[]> {
  //   try {
  //     const queryBuilder =
  //       this.propertyImageRepository.createQueryBuilder('propertyImage');

  //     if (params?.propertyId) {
  //       queryBuilder.where('propertyImage.propertyId = :propertyId', {
  //         propertyId: params.propertyId,
  //       });
  //     }

  //     if (params?.roomId !== undefined) {
  //       if (params.roomId === null) {
  //         queryBuilder.andWhere('propertyImage.roomId IS NULL');
  //       } else {
  //         queryBuilder.andWhere('propertyImage.roomId = :roomId', {
  //           roomId: params.roomId,
  //         });
  //       }
  //     }

  //     if (params?.isPrimary !== undefined) {
  //       queryBuilder.andWhere('propertyImage.isPrimary = :isPrimary', {
  //         isPrimary: params.isPrimary,
  //       });
  //     }

  //     if (params?.limit) {
  //       queryBuilder.limit(params.limit);
  //     }

  //     if (params?.offset) {
  //       queryBuilder.offset(params.offset);
  //     }

  //     queryBuilder.orderBy('propertyImage.displayOrder', 'ASC');

  //     return await queryBuilder.getMany();
  //   } catch (error) {
  //     this.handleDbError(error, 'findPropertyImages', 'PropertyImage');
  //   }
  // }

  // async updatePropertyImage(
  //   params: IUpdatePropertyImageImplParams,
  // ): Promise<PropertyImageEntity> {
  //   try {
  //     const image = await this.findPropertyImageById({ id: params.id });
  //     if (!image) {
  //       throw new Error('Property image not found');
  //     }

  //     Object.assign(image, {
  //       ...(params.url !== undefined && { url: params.url }),
  //       ...(params.thumbnailUrl !== undefined && {
  //         thumbnailUrl: params.thumbnailUrl,
  //       }),
  //       ...(params.caption !== undefined && { caption: params.caption }),
  //       ...(params.altText !== undefined && { altText: params.altText }),
  //       ...(params.displayOrder !== undefined && {
  //         displayOrder: params.displayOrder,
  //       }),
  //       ...(params.isPrimary !== undefined && { isPrimary: params.isPrimary }),
  //       ...(params.width !== undefined && { width: params.width }),
  //       ...(params.height !== undefined && { height: params.height }),
  //       ...(params.fileSize !== undefined && { fileSize: params.fileSize }),
  //       ...(params.mimeType !== undefined && { mimeType: params.mimeType }),
  //     });

  //     return await this.propertyImageRepository.save(image);
  //   } catch (error) {
  //     this.handleDbError(error, 'updatePropertyImage', 'PropertyImage');
  //   }
  // }

  // async deletePropertyImage(
  //   params: IFindPropertyImageByIdImplParams,
  // ): Promise<boolean> {
  //   try {
  //     const result = await this.propertyImageRepository.delete(params.id);
  //     return (result.affected ?? 0) > 0;
  //   } catch (error) {
  //     this.handleDbError(error, 'deletePropertyImage', 'PropertyImage');
  //   }
  // }

  // ==================== Room CRUD ====================

  async createRoom(params: ICreateRoomImplParams): Promise<RoomEntity> {
    try {
      const room = this.roomRepository.create({
        propertyId: params.propertyId,
        name: params.name,
        description: params.description ?? null,
        roomType: params.roomType,
        beds: params.beds ?? 1,
        bedType: params.bedType ?? null,
        maxGuests: params.maxGuests ?? 2,
        basePrice: params.basePrice ?? null,
        isPrivate: params.isPrivate ?? true,
        hasBathroom: params.hasBathroom ?? false,
        hasBalcony: params.hasBalcony ?? false,
        floorNumber: params.floorNumber ?? null,
        squareMeters: params.squareMeters ?? null,
        status: params.status ?? ERoomStatus.ACTIVE,
      });

      return await this.roomRepository.save(room);
    } catch (error) {
      this.handleDbError(error, 'createRoom', 'Room');
    }
  }

  async findRoomById(
    params: IFindRoomByIdImplParams,
  ): Promise<RoomEntity | null> {
    try {
      return await this.roomRepository.findOne({
        where: { id: params.id },
      });
    } catch (error) {
      this.handleDbError(error, 'findRoomById', 'Room');
    }
  }

  async findRooms(params?: IFindRoomsImplParams): Promise<RoomEntity[]> {
    try {
      const queryBuilder = this.roomRepository.createQueryBuilder('room');

      if (params?.propertyId) {
        queryBuilder.where('room.propertyId = :propertyId', {
          propertyId: params.propertyId,
        });
      }

      if (params?.roomType) {
        queryBuilder.andWhere('room.roomType = :roomType', {
          roomType: params.roomType,
        });
      }

      if (params?.status) {
        queryBuilder.andWhere('room.status = :status', {
          status: params.status,
        });
      }

      if (params?.limit) {
        queryBuilder.limit(params.limit);
      }

      if (params?.offset) {
        queryBuilder.offset(params.offset);
      }

      return await queryBuilder.getMany();
    } catch (error) {
      this.handleDbError(error, 'findRooms', 'Room');
    }
  }

  async updateRoom(params: IUpdateRoomImplParams): Promise<RoomEntity> {
    try {
      const room = await this.findRoomById({ id: params.id });
      if (!room) {
        throw new NotFoundException('Room not found');
      }

      Object.assign(room, {
        ...(params.name !== undefined && { name: params.name }),
        ...(params.description !== undefined && {
          description: params.description,
        }),
        ...(params.roomType !== undefined && { roomType: params.roomType }),
        ...(params.beds !== undefined && { beds: params.beds }),
        ...(params.bedType !== undefined && { bedType: params.bedType }),
        ...(params.maxGuests !== undefined && { maxGuests: params.maxGuests }),
        ...(params.basePrice !== undefined && { basePrice: params.basePrice }),
        ...(params.isPrivate !== undefined && { isPrivate: params.isPrivate }),
        ...(params.hasBathroom !== undefined && {
          hasBathroom: params.hasBathroom,
        }),
        ...(params.hasBalcony !== undefined && {
          hasBalcony: params.hasBalcony,
        }),
        ...(params.floorNumber !== undefined && {
          floorNumber: params.floorNumber,
        }),
        ...(params.squareMeters !== undefined && {
          squareMeters: params.squareMeters,
        }),
        ...(params.status !== undefined && { status: params.status }),
      });

      return await this.roomRepository.save(room);
    } catch (error) {
      this.handleDbError(error, 'updateRoom', 'Room');
    }
  }

  async deleteRoom(params: IFindRoomByIdImplParams): Promise<boolean> {
    try {
      const result = await this.roomRepository.delete(params.id);
      return (result.affected ?? 0) > 0;
    } catch (error) {
      this.handleDbError(error, 'deleteRoom', 'Room');
    }
  }

  // ==================== House Rule CRUD ====================

  async createHouseRule(
    params: ICreateHouseRuleImplParams,
  ): Promise<HouseRuleEntity> {
    try {
      const houseRule = this.houseRuleRepository.create({
        propertyId: params.propertyId,
        ruleType: params.ruleType,
        allowed: params.allowed ?? false,
        description: params.description ?? null,
      });

      return await this.houseRuleRepository.save(houseRule);
    } catch (error) {
      this.handleDbError(error, 'createHouseRule', 'HouseRule');
    }
  }

  async findHouseRuleById(
    params: IFindHouseRuleByIdImplParams,
  ): Promise<HouseRuleEntity | null> {
    try {
      return await this.houseRuleRepository.findOne({
        where: { id: params.id },
      });
    } catch (error) {
      this.handleDbError(error, 'findHouseRuleById', 'HouseRule');
    }
  }

  async findHouseRules(
    params?: IFindHouseRulesImplParams,
  ): Promise<HouseRuleEntity[]> {
    try {
      const queryBuilder =
        this.houseRuleRepository.createQueryBuilder('houseRule');

      if (params?.propertyId) {
        queryBuilder.where('houseRule.propertyId = :propertyId', {
          propertyId: params.propertyId,
        });
      }

      if (params?.ruleType) {
        queryBuilder.andWhere('houseRule.ruleType = :ruleType', {
          ruleType: params.ruleType,
        });
      }

      if (params?.allowed !== undefined) {
        queryBuilder.andWhere('houseRule.allowed = :allowed', {
          allowed: params.allowed,
        });
      }

      if (params?.limit) {
        queryBuilder.limit(params.limit);
      }

      if (params?.offset) {
        queryBuilder.offset(params.offset);
      }

      return await queryBuilder.getMany();
    } catch (error) {
      this.handleDbError(error, 'findHouseRules', 'HouseRule');
    }
  }

  async updateHouseRule(
    params: IUpdateHouseRuleImplParams,
  ): Promise<HouseRuleEntity> {
    try {
      const houseRule = await this.findHouseRuleById({ id: params.id });
      if (!houseRule) {
        throw new NotFoundException('House rule not found');
      }

      Object.assign(houseRule, {
        ...(params.allowed !== undefined && { allowed: params.allowed }),
        ...(params.description !== undefined && {
          description: params.description,
        }),
      });

      return await this.houseRuleRepository.save(houseRule);
    } catch (error) {
      this.handleDbError(error, 'updateHouseRule', 'HouseRule');
    }
  }

  async deleteHouseRule(
    params: IFindHouseRuleByIdImplParams,
  ): Promise<boolean> {
    try {
      const result = await this.houseRuleRepository.delete(params.id);
      return (result.affected ?? 0) > 0;
    } catch (error) {
      this.handleDbError(error, 'deleteHouseRule', 'HouseRule');
    }
  }

  // ==================== By-PropertyId Lookups ====================

  async findPropertyImagesByPropertyId(
    params: IFindPropertyImagesByPropertyIdImplParams,
  ): Promise<PropertyImageEntity[]> {
    try {
      return await this.propertyImageRepository.find({
        where: { propertyId: params.propertyId },
        order: { displayOrder: 'ASC' },
      });
    } catch (error) {
      this.handleDbError(
        error,
        'findPropertyImagesByPropertyId',
        'PropertyImage',
      );
    }
  }

  async findPropertyAmenitiesByPropertyId(
    params: IFindPropertyAmenitiesByPropertyIdImplParams,
  ): Promise<PropertyAmenityEntity[]> {
    try {
      return await this.propertyAmenityRepository.find({
        where: { propertyId: params.propertyId },
        relations: ['amenity'],
      });
    } catch (error) {
      this.handleDbError(
        error,
        'findPropertyAmenitiesByPropertyId',
        'PropertyAmenity',
      );
    }
  }

  async findHouseRulesByPropertyId(
    params: IFindHouseRulesByPropertyIdImplParams,
  ): Promise<HouseRuleEntity[]> {
    try {
      return await this.houseRuleRepository.find({
        where: { propertyId: params.propertyId },
      });
    } catch (error) {
      this.handleDbError(error, 'findHouseRulesByPropertyId', 'HouseRule');
    }
  }

  // ==================== Property Details CRUD ====================

  async createPropertyDetails(
    params: ICreatePropertyDetailsImplParams,
  ): Promise<PropertyDetailsEntity> {
    try {
      const details = this.propertyDetailsRepository.create({
        propertyId: params.propertyId,
        maxGuests: params.maxGuests,
        bedrooms: params.bedrooms ?? 1,
        beds: params.beds ?? 1,
        bathrooms: params.bathrooms ?? 1.0,
      });

      return await this.propertyDetailsRepository.save(details);
    } catch (error) {
      this.handleDbError(error, 'createPropertyDetails', 'PropertyDetails');
    }
  }

  async findPropertyDetailsById(
    params: IFindPropertyDetailsByIdImplParams,
  ): Promise<PropertyDetailsEntity | null> {
    try {
      return await this.propertyDetailsRepository.findOne({
        where: { id: params.id },
      });
    } catch (error) {
      this.handleDbError(error, 'findPropertyDetailsById', 'PropertyDetails');
    }
  }

  async findPropertyDetailsByPropertyId(
    params: IFindPropertyDetailsByPropertyIdImplParams,
  ): Promise<PropertyDetailsEntity | null> {
    try {
      return await this.propertyDetailsRepository.findOne({
        where: { propertyId: params.propertyId },
      });
    } catch (error) {
      this.handleDbError(
        error,
        'findPropertyDetailsByPropertyId',
        'PropertyDetails',
      );
    }
  }

  async updatePropertyDetails(
    params: IUpdatePropertyDetailsImplParams,
  ): Promise<PropertyDetailsEntity> {
    try {
      const details = await this.findPropertyDetailsById({ id: params.id });
      if (!details) {
        throw new NotFoundException('Property details not found');
      }

      Object.assign(details, {
        ...(params.maxGuests !== undefined && { maxGuests: params.maxGuests }),
        ...(params.bedrooms !== undefined && { bedrooms: params.bedrooms }),
        ...(params.beds !== undefined && { beds: params.beds }),
        ...(params.bathrooms !== undefined && { bathrooms: params.bathrooms }),
      });

      return await this.propertyDetailsRepository.save(details);
    } catch (error) {
      this.handleDbError(error, 'updatePropertyDetails', 'PropertyDetails');
    }
  }

  async deletePropertyDetails(
    params: IFindPropertyDetailsByIdImplParams,
  ): Promise<boolean> {
    try {
      const result = await this.propertyDetailsRepository.delete(params.id);
      return (result.affected ?? 0) > 0;
    } catch (error) {
      this.handleDbError(error, 'deletePropertyDetails', 'PropertyDetails');
    }
  }

  // ==================== Property Policy CRUD ====================

  async createPropertyPolicy(
    params: ICreatePropertyPolicyImplParams,
  ): Promise<PropertyPolicyEntity> {
    try {
      const policy = this.propertyPolicyRepository.create({
        propertyId: params.propertyId,
        minNights: params.minNights ?? 1,
        maxNights: params.maxNights ?? 365,
        checkInTime: params.checkInTime ?? '15:00',
        checkOutTime: params.checkOutTime ?? '11:00',
        cancellationPolicy:
          params.cancellationPolicy ?? EPropertyCancellationPolicy.FLEXIBLE,
        instantBook: params.instantBook ?? false,
      });

      return await this.propertyPolicyRepository.save(policy);
    } catch (error) {
      this.handleDbError(error, 'createPropertyPolicy', 'PropertyPolicy');
    }
  }

  async findPropertyPolicyById(
    params: IFindPropertyPolicyByIdImplParams,
  ): Promise<PropertyPolicyEntity | null> {
    try {
      return await this.propertyPolicyRepository.findOne({
        where: { id: params.id },
      });
    } catch (error) {
      this.handleDbError(error, 'findPropertyPolicyById', 'PropertyPolicy');
    }
  }

  async findPropertyPolicyByPropertyId(
    params: IFindPropertyPolicyByPropertyIdImplParams,
  ): Promise<PropertyPolicyEntity | null> {
    try {
      return await this.propertyPolicyRepository.findOne({
        where: { propertyId: params.propertyId },
      });
    } catch (error) {
      this.handleDbError(
        error,
        'findPropertyPolicyByPropertyId',
        'PropertyPolicy',
      );
    }
  }

  async updatePropertyPolicy(
    params: IUpdatePropertyPolicyImplParams,
  ): Promise<PropertyPolicyEntity> {
    try {
      const policy = await this.findPropertyPolicyById({ id: params.id });
      if (!policy) {
        throw new NotFoundException('Property policy not found');
      }

      Object.assign(policy, {
        ...(params.minNights !== undefined && { minNights: params.minNights }),
        ...(params.maxNights !== undefined && { maxNights: params.maxNights }),
        ...(params.checkInTime !== undefined && {
          checkInTime: params.checkInTime,
        }),
        ...(params.checkOutTime !== undefined && {
          checkOutTime: params.checkOutTime,
        }),
        ...(params.cancellationPolicy !== undefined && {
          cancellationPolicy: params.cancellationPolicy,
        }),
        ...(params.instantBook !== undefined && {
          instantBook: params.instantBook,
        }),
      });

      return await this.propertyPolicyRepository.save(policy);
    } catch (error) {
      this.handleDbError(error, 'updatePropertyPolicy', 'PropertyPolicy');
    }
  }

  async deletePropertyPolicy(
    params: IFindPropertyPolicyByIdImplParams,
  ): Promise<boolean> {
    try {
      const result = await this.propertyPolicyRepository.delete(params.id);
      return (result.affected ?? 0) > 0;
    } catch (error) {
      this.handleDbError(error, 'deletePropertyPolicy', 'PropertyPolicy');
    }
  }

  // ==================== Property Pricing CRUD ====================

  async createPropertyPricing(
    params: ICreatePropertyPricingImplParams,
  ): Promise<PropertyPricingEntity> {
    try {
      const pricing = this.propertyPricingRepository.create({
        propertyId: params.propertyId,
        basePrice: params.basePrice,
        currency: params.currency ?? ECurrency.INR,
        cleaningFee: params.cleaningFee ?? 0,
        serviceFeePercentage: params.serviceFeePercentage ?? 10.0,
      });

      return await this.propertyPricingRepository.save(pricing);
    } catch (error) {
      this.handleDbError(error, 'createPropertyPricing', 'PropertyPricing');
    }
  }

  async findPropertyPricingById(
    params: IFindPropertyPricingByIdImplParams,
  ): Promise<PropertyPricingEntity | null> {
    try {
      return await this.propertyPricingRepository.findOne({
        where: { id: params.id },
      });
    } catch (error) {
      this.handleDbError(error, 'findPropertyPricingById', 'PropertyPricing');
    }
  }

  async findPropertyPricingByPropertyId(
    params: IFindPropertyPricingByPropertyIdImplParams,
  ): Promise<PropertyPricingEntity | null> {
    try {
      return await this.propertyPricingRepository.findOne({
        where: { propertyId: params.propertyId },
      });
    } catch (error) {
      this.handleDbError(
        error,
        'findPropertyPricingByPropertyId',
        'PropertyPricing',
      );
    }
  }

  async updatePropertyPricing(
    params: IUpdatePropertyPricingImplParams,
  ): Promise<PropertyPricingEntity> {
    try {
      const pricing = await this.findPropertyPricingById({ id: params.id });
      if (!pricing) {
        throw new NotFoundException('Property pricing not found');
      }

      Object.assign(pricing, {
        ...(params.basePrice !== undefined && { basePrice: params.basePrice }),
        ...(params.currency !== undefined && { currency: params.currency }),
        ...(params.cleaningFee !== undefined && {
          cleaningFee: params.cleaningFee,
        }),
        ...(params.serviceFeePercentage !== undefined && {
          serviceFeePercentage: params.serviceFeePercentage,
        }),
      });

      return await this.propertyPricingRepository.save(pricing);
    } catch (error) {
      this.handleDbError(error, 'updatePropertyPricing', 'PropertyPricing');
    }
  }

  async deletePropertyPricing(
    params: IFindPropertyPricingByIdImplParams,
  ): Promise<boolean> {
    try {
      const result = await this.propertyPricingRepository.delete(params.id);
      return (result.affected ?? 0) > 0;
    } catch (error) {
      this.handleDbError(error, 'deletePropertyPricing', 'PropertyPricing');
    }
  }

  // ==================== Draft Onboarding Methods ====================

  async createDraftProperty(
    params: ICreateDraftPropertyImplParams,
  ): Promise<PropertyEntity> {
    try {
      const property = this.propertyRepository.create({
        hostId: params.hostId,
        slug: params.slug,
        title: params.title,
        description: params.description ?? null,
        propertyType: params.propertyType,
        status: EPropertyStatus.DRAFT,
      });
      const savedProperty = await this.propertyRepository.save(property);

      // Create rating placeholder (same side-effect as createProperty)
      const rating = this.propertyRatingRepository.create({
        propertyId: savedProperty.id,
        averageRating: 0,
        totalReviews: 0,
      });
      await this.propertyRatingRepository.save(rating);

      return savedProperty;
    } catch (error) {
      this.handleDbError(error, 'createDraftProperty', 'Property');
    }
  }

  async upsertPropertyLocation(
    params: IUpsertPropertyLocationImplParams,
  ): Promise<PropertyLocationEntity> {
    try {
      const existing = await this.propertyLocationRepository.findOne({
        where: { propertyId: params.propertyId },
      });

      if (existing) {
        Object.assign(existing, {
          addressLine1: params.addressLine1,
          addressLine2: params.addressLine2 ?? null,
          city: params.city,
          state: params.state ?? null,
          country: params.country,
          postalCode: params.postalCode ?? null,
          latitude: params.latitude ?? null,
          longitude: params.longitude ?? null,
        });
        return await this.propertyLocationRepository.save(existing);
      }

      const location = this.propertyLocationRepository.create({
        propertyId: params.propertyId,
        addressLine1: params.addressLine1,
        addressLine2: params.addressLine2 ?? null,
        city: params.city,
        state: params.state ?? null,
        country: params.country,
        postalCode: params.postalCode ?? null,
        latitude: params.latitude ?? null,
        longitude: params.longitude ?? null,
      });
      return await this.propertyLocationRepository.save(location);
    } catch (error) {
      this.handleDbError(error, 'upsertPropertyLocation', 'PropertyLocation');
    }
  }

  async upsertPropertyPricing(
    params: IUpsertPropertyPricingImplParams,
  ): Promise<PropertyPricingEntity> {
    try {
      const existing = await this.propertyPricingRepository.findOne({
        where: { propertyId: params.propertyId },
      });

      if (existing) {
        Object.assign(existing, {
          basePrice: params.basePrice,
          currency: params.currency,
          ...(params.cleaningFee !== undefined && {
            cleaningFee: params.cleaningFee,
          }),
          ...(params.serviceFeePercentage !== undefined && {
            serviceFeePercentage: params.serviceFeePercentage,
          }),
        });
        return await this.propertyPricingRepository.save(existing);
      }

      const pricing = this.propertyPricingRepository.create({
        propertyId: params.propertyId,
        basePrice: params.basePrice,
        currency: params.currency,
        cleaningFee: params.cleaningFee ?? 0,
        serviceFeePercentage: params.serviceFeePercentage ?? 10.0,
      });
      return await this.propertyPricingRepository.save(pricing);
    } catch (error) {
      this.handleDbError(error, 'upsertPropertyPricing', 'PropertyPricing');
    }
  }

  async upsertPropertyPolicy(
    params: IUpsertPropertyPolicyImplParams,
  ): Promise<PropertyPolicyEntity> {
    try {
      const existing = await this.propertyPolicyRepository.findOne({
        where: { propertyId: params.propertyId },
      });

      if (existing) {
        Object.assign(existing, {
          minNights: params.minNights,
          maxNights: params.maxNights,
          checkInTime: params.checkInTime,
          checkOutTime: params.checkOutTime,
          cancellationPolicy: params.cancellationPolicy,
          ...(params.instantBook !== undefined && {
            instantBook: params.instantBook,
          }),
        });
        return await this.propertyPolicyRepository.save(existing);
      }

      const policy = this.propertyPolicyRepository.create({
        propertyId: params.propertyId,
        minNights: params.minNights,
        maxNights: params.maxNights,
        checkInTime: params.checkInTime,
        checkOutTime: params.checkOutTime,
        cancellationPolicy: params.cancellationPolicy,
        instantBook: params.instantBook ?? false,
      });
      return await this.propertyPolicyRepository.save(policy);
    } catch (error) {
      this.handleDbError(error, 'upsertPropertyPolicy', 'PropertyPolicy');
    }
  }

  async upsertPropertyDetails(
    params: IUpsertPropertyDetailsImplParams,
  ): Promise<PropertyDetailsEntity> {
    try {
      const existing = await this.propertyDetailsRepository.findOne({
        where: { propertyId: params.propertyId },
      });

      if (existing) {
        Object.assign(existing, {
          maxGuests: params.maxGuests,
          ...(params.bedrooms !== undefined && { bedrooms: params.bedrooms }),
          ...(params.beds !== undefined && { beds: params.beds }),
          ...(params.bathrooms !== undefined && {
            bathrooms: params.bathrooms,
          }),
        });
        return await this.propertyDetailsRepository.save(existing);
      }

      const details = this.propertyDetailsRepository.create({
        propertyId: params.propertyId,
        maxGuests: params.maxGuests,
        bedrooms: params.bedrooms ?? 1,
        beds: params.beds ?? 1,
        bathrooms: params.bathrooms ?? 1.0,
      });
      return await this.propertyDetailsRepository.save(details);
    } catch (error) {
      this.handleDbError(error, 'upsertPropertyDetails', 'PropertyDetails');
    }
  }

  async replacePropertyAmenities(
    params: IReplacePropertyAmenitiesImplParams,
  ): Promise<void> {
    try {
      await this.dataSource.transaction(async (manager) => {
        // Delete existing amenities and rules for this property
        await manager.delete(PropertyAmenityEntity, {
          propertyId: params.propertyId,
        });
        await manager.delete(HouseRuleEntity, {
          propertyId: params.propertyId,
        });

        // Insert new amenities (upsert the master Amenity record, then link)
        const amenityRepo = manager.getRepository(Amenity);
        const linkedAmenityIds = new Set<string>();

        for (const a of params.amenities ?? []) {
          let amenity = await amenityRepo.findOne({ where: { name: a.name } });
          if (!amenity) {
            amenity = await amenityRepo.save(
              amenityRepo.create({
                name: a.name,
                category: this.mapHostAmenityCategory(a.category),
                icon: a.icon ?? null,
                description: a.description ?? null,
              }),
            );
          }
          if (linkedAmenityIds.has(amenity.id)) continue;
          linkedAmenityIds.add(amenity.id);

          await manager.save(
            manager.create(PropertyAmenityEntity, {
              propertyId: params.propertyId,
              amenityId: amenity.id,
              notes: null,
            }),
          );
        }

        // Insert new rules
        const seenRuleTypes = new Set<RuleType>();
        for (const r of params.rules ?? []) {
          const entityRuleType = this.mapHostRuleTypeToEntity(r.ruleType);
          if (seenRuleTypes.has(entityRuleType)) continue;
          seenRuleTypes.add(entityRuleType);

          const allowed =
            r.ruleType === EPropertyRuleType.NO_SMOKING ? false : r.allowed;
          await manager.save(
            manager.create(HouseRuleEntity, {
              propertyId: params.propertyId,
              ruleType: entityRuleType,
              allowed,
              description: r.description ?? null,
            }),
          );
        }
      });
    } catch (error) {
      this.handleDbError(
        error,
        'replacePropertyAmenities',
        'PropertyAmenity/HouseRule',
      );
    }
  }

  async replacePropertyImages(
    params: IReplacePropertyImagesImplParams,
  ): Promise<void> {
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.delete(PropertyImageEntity, {
          propertyId: params.propertyId,
        });

        for (let i = 0; i < params.images.length; i++) {
          const img = params.images[i];
          await manager.save(
            manager.create(PropertyImageEntity, {
              propertyId: params.propertyId,
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
              roomId: null,
            }),
          );
        }
      });
    } catch (error) {
      this.handleDbError(error, 'replacePropertyImages', 'PropertyImage');
    }
  }

  async findDraftPropertyByHostId(
    params: IFindDraftPropertyByHostIdImplParams,
  ): Promise<PropertyEntity | null> {
    try {
      return await this.propertyRepository.findOne({
        where: { hostId: params.hostId, status: EPropertyStatus.DRAFT },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.handleDbError(error, 'findDraftPropertyByHostId', 'Property');
    }
  }

  async findPropertyWithStepRelations(
    params: IFindPropertyWithStepRelationsImplParams,
  ): Promise<IPropertyStepRelations> {
    try {
      const { propertyId } = params;

      const [location, pricing, policy, details, imageCount] =
        await Promise.all([
          this.propertyLocationRepository.findOne({
            where: { propertyId },
            select: { id: true },
          }),
          this.propertyPricingRepository.findOne({
            where: { propertyId },
            select: { id: true },
          }),
          this.propertyPolicyRepository.findOne({
            where: { propertyId },
            select: { id: true },
          }),
          this.propertyDetailsRepository.findOne({
            where: { propertyId },
            select: { id: true },
          }),
          this.propertyImageRepository.count({ where: { propertyId } }),
        ]);

      return {
        hasLocation: location !== null,
        hasPricing: pricing !== null,
        hasPolicy: policy !== null,
        hasDetails: details !== null,
        hasImages: imageCount > 0,
      };
    } catch (error) {
      this.handleDbError(error, 'findPropertyWithStepRelations', 'Property');
    }
  }

  async publishDraftProperty(params: {
    propertyId: string;
    daysAhead?: number;
  }): Promise<PropertyEntity> {
    try {
      const daysAhead = params.daysAhead ?? 365;

      const property = await this.dataSource.transaction(async (manager) => {
        // Transition status DRAFT → ACTIVE
        await manager.update(
          PropertyEntity,
          { id: params.propertyId },
          { status: EPropertyStatus.ACTIVE },
        );

        // Seed AvailabilityCalendar for the next N days
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const rows: Partial<AvailabilityCalenderEntity>[] = [];
        for (let i = 0; i < daysAhead; i++) {
          const date = new Date(today);
          date.setUTCDate(today.getUTCDate() + i);
          rows.push(
            manager.create(AvailabilityCalenderEntity, {
              propertyId: params.propertyId,
              roomId: null,
              date,
              available: true,
              price: null,
              minNights: null,
              maxNights: null,
              note: null,
              blockReason: null,
            }),
          );
        }

        // Use upsert to avoid conflicts on existing calendar rows
        if (rows.length > 0) {
          await manager
            .createQueryBuilder()
            .insert()
            .into(AvailabilityCalenderEntity)
            .values(rows)
            .orIgnore()
            .execute();
        }

        return await manager.findOne(PropertyEntity, {
          where: { id: params.propertyId },
        });
      });

      return property as PropertyEntity;
    } catch (error) {
      this.handleDbError(error, 'publishDraftProperty', 'Property');
    }
  }
}
