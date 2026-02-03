import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
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
  IGetPropertiesRequestParams,
  IGetPropertiesResponse,
} from '../interfaces/property.interface';
import { IPropertyRepository } from '../repositories';
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
}
