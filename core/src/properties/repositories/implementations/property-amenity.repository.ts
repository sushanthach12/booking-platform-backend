import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { Amenity, AmenityCategory } from '../../entities/amenity.entity';
import { PropertyAmenityEntity } from '../../entities/property-amenity.entity';
import {
  ICreatePropertyAmenityImplParams,
  IUpdatePropertyAmenityImplParams,
  IFindPropertyAmenityByIdImplParams,
  IFindPropertyAmenitiesImplParams,
  ICreateAmenityImplParams,
  IUpdateAmenityImplParams,
  IFindAmenityByIdImplParams,
  IFindAmenitiesImplParams,
  IPropertyAmenityRepository,
} from '../interfaces/property-amenity.repository.interface';

@Injectable()
export class PropertyAmenityRepository implements IPropertyAmenityRepository {
  private readonly logger = new Logger(PropertyAmenityRepository.name);

  constructor(
    @InjectRepository(PropertyAmenityEntity)
    private readonly propertyAmenityRepository: Repository<PropertyAmenityEntity>,
    @InjectRepository(Amenity)
    private readonly amenityRepository: Repository<Amenity>,
  ) {}

  // Property Amenity CRUD
  async createPropertyAmenity(
    params: ICreatePropertyAmenityImplParams,
  ): Promise<PropertyAmenityEntity> {
    try {
      const propertyAmenity = this.propertyAmenityRepository.create({
        propertyId: params.propertyId,
        amenityId: params.amenityId,
        notes: params.notes,
      });

      return await this.propertyAmenityRepository.save(propertyAmenity);
    } catch (error) {
      this.handleDbError(error, 'createPropertyAmenity', 'PropertyAmenity');
    }
  }

  async findPropertyAmenityById(
    params: IFindPropertyAmenityByIdImplParams,
  ): Promise<PropertyAmenityEntity | null> {
    try {
      return await this.propertyAmenityRepository.findOne({
        where: { id: params.id },
      });
    } catch (error) {
      this.handleDbError(error, 'findPropertyAmenityById', 'PropertyAmenity');
    }
  }

  async findPropertyAmenities(
    params?: IFindPropertyAmenitiesImplParams,
  ): Promise<PropertyAmenityEntity[]> {
    try {
      const whereConditions: any = {};

      if (params?.propertyId) {
        whereConditions.propertyId = params.propertyId;
      }

      if (params?.amenityId) {
        whereConditions.amenityId = params.amenityId;
      }

      const queryBuilder = this.propertyAmenityRepository
        .createQueryBuilder('propertyAmenity')
        .where(whereConditions)
        .leftJoinAndSelect('propertyAmenity.amenity', 'amenity')
        .orderBy('propertyAmenity.createdAt', 'ASC');

      if (params?.limit) {
        queryBuilder.limit(params.limit);
      }

      if (params?.offset) {
        queryBuilder.offset(params.offset);
      }

      return await queryBuilder.getMany();
    } catch (error) {
      this.handleDbError(error, 'findPropertyAmenities', 'PropertyAmenity');
    }
  }

  async updatePropertyAmenity(
    params: IUpdatePropertyAmenityImplParams,
  ): Promise<PropertyAmenityEntity> {
    try {
      const propertyAmenity = await this.findPropertyAmenityById({ id: params.id });
      if (!propertyAmenity) {
        throw new Error('Property amenity not found');
      }

      if (params.notes !== undefined) {
        propertyAmenity.notes = params.notes;
      }

      return await this.propertyAmenityRepository.save(propertyAmenity);
    } catch (error) {
      this.handleDbError(error, 'updatePropertyAmenity', 'PropertyAmenity');
    }
  }

  async deletePropertyAmenity(
    params: IFindPropertyAmenityByIdImplParams,
  ): Promise<boolean> {
    try {
      const result = await this.propertyAmenityRepository.delete(params.id);
      return (result.affected ?? 0) > 0;
    } catch (error) {
      this.handleDbError(error, 'deletePropertyAmenity', 'PropertyAmenity');
    }
  }

  // Amenity CRUD
  async createAmenity(params: ICreateAmenityImplParams): Promise<Amenity> {
    try {
      const amenity = this.amenityRepository.create({
        name: params.name,
        category: params.category as AmenityCategory,
        icon: params.icon,
        description: params.description,
      });

      return await this.amenityRepository.save(amenity);
    } catch (error) {
      this.handleDbError(error, 'createAmenity', 'Amenity');
    }
  }

  async findAmenityById(params: IFindAmenityByIdImplParams): Promise<Amenity | null> {
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
      const whereConditions: any = {};

      if (params?.category) {
        whereConditions.category = params.category as AmenityCategory;
      }

      return await this.amenityRepository.find({
        where: whereConditions,
        order: {
          category: 'ASC',
          name: 'ASC',
        },
        take: params?.limit,
        skip: params?.offset,
      });
    } catch (error) {
      this.handleDbError(error, 'findAmenities', 'Amenity');
    }
  }

  async updateAmenity(params: IUpdateAmenityImplParams): Promise<Amenity> {
    try {
      const amenity = await this.findAmenityById({ id: params.id });
      if (!amenity) {
        throw new Error('Amenity not found');
      }

      Object.assign(amenity, {
        ...(params.name !== undefined && { name: params.name }),
        ...(params.category !== undefined && { category: params.category as AmenityCategory }),
        ...(params.icon !== undefined && { icon: params.icon }),
        ...(params.description !== undefined && { description: params.description }),
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

  private handleDbError(error: any, method: string, entity: string): never {
    this.logger.error(`Error in ${method}: ${error.message}`, error.stack);

    if (error instanceof QueryFailedError) {
      throw new Error(`Database error in ${method}: ${error.message}`);
    }

    throw new Error(`Failed to ${method} ${entity}: ${error.message}`);
  }
}
