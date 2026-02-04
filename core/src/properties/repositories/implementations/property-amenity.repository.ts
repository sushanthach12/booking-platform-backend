import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { PropertyAmenityEntity } from '../../entities/property-amenity.entity';
import {
  ICreatePropertyAmenityImplParams,
  IUpdatePropertyAmenityImplParams,
  IFindPropertyAmenityByIdImplParams,
  IFindPropertyAmenitiesImplParams,
  IPropertyAmenityRepository,
} from '../interfaces/property-amenity.repository.interface';

@Injectable()
export class PropertyAmenityRepository implements IPropertyAmenityRepository {
  private readonly logger = new Logger(PropertyAmenityRepository.name);

  constructor(
    @InjectRepository(PropertyAmenityEntity)
    private readonly propertyAmenityRepository: Repository<PropertyAmenityEntity>,
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

  private handleDbError(error: any, method: string, entity: string): never {
    this.logger.error(`Error in ${method}: ${error.message}`, error.stack);

    if (error instanceof QueryFailedError) {
      throw new Error(`Database error in ${method}: ${error.message}`);
    }

    throw new Error(`Failed to ${method} ${entity}: ${error.message}`);
  }
}
