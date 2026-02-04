import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { PropertyEntity } from '../../entities/property.entity';
import { EPropertyStatus, EPropertyType } from '../../enums/property.enum';
import {
  ICreatePropertyImplParams,
  IUpdatePropertyImplParams,
  IFindPropertyByIdImplParams,
  IFindPropertiesImplParams,
  ICountPropertiesImplParams,
  ICheckPropertyExistsImplParams,
  IPropertyRepository2,
} from '../interfaces/property.repository.interface';

@Injectable()
export class PropertyRepository2 implements IPropertyRepository2 {
  private readonly logger = new Logger(PropertyRepository2.name);

  constructor(
    @InjectRepository(PropertyEntity)
    private readonly propertyRepository: Repository<PropertyEntity>,
  ) {}

  async createProperty(params: ICreatePropertyImplParams): Promise<PropertyEntity> {
    try {
      const property = this.propertyRepository.create({
        hostId: params.hostId,
        title: params.title,
        description: params.description,
        propertyType: params.propertyType,
        status: params.status ?? EPropertyStatus.ACTIVE,
      });

      return await this.propertyRepository.save(property);
    } catch (error) {
      this.handleDbError(error, 'createProperty', 'Property');
    }
  }

  async findPropertyById(params: IFindPropertyByIdImplParams): Promise<PropertyEntity | null> {
    try {
      return await this.propertyRepository.findOne({
        where: { id: params.id },
      });
    } catch (error) {
      this.handleDbError(error, 'findPropertyById', 'Property');
    }
  }

  async findProperties(params?: IFindPropertiesImplParams): Promise<PropertyEntity[]> {
    try {
      const whereConditions: any = {};

      if (params?.propertyType) {
        whereConditions.propertyType = params.propertyType;
      }

      if (params?.status) {
        whereConditions.status = params.status;
      }

      if (params?.hostId) {
        whereConditions.hostId = params.hostId;
      }

      if (params?.title) {
        whereConditions.title = params.title;
      }

      return await this.propertyRepository.find({
        where: whereConditions,
        order: {
          createdAt: 'DESC',
        },
        take: params?.limit,
        skip: params?.offset,
      });
    } catch (error) {
      this.handleDbError(error, 'findProperties', 'Property');
    }
  }

  async updateProperty(params: IUpdatePropertyImplParams): Promise<PropertyEntity> {
    try {
      const property = await this.findPropertyById({ id: params.id });
      if (!property) {
        throw new Error('Property not found');
      }

      Object.assign(property, {
        ...(params.title !== undefined && { title: params.title }),
        ...(params.description !== undefined && { description: params.description }),
        ...(params.propertyType !== undefined && { propertyType: params.propertyType }),
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

  async countProperties(params?: ICountPropertiesImplParams): Promise<number> {
    try {
      const whereConditions: any = {};

      if (params?.propertyType) {
        whereConditions.propertyType = params.propertyType;
      }

      if (params?.status) {
        whereConditions.status = params.status;
      }

      if (params?.hostId) {
        whereConditions.hostId = params.hostId;
      }

      if (params?.title) {
        whereConditions.title = params.title;
      }

      return await this.propertyRepository.count({
        where: whereConditions,
      });
    } catch (error) {
      this.handleDbError(error, 'countProperties', 'Property');
    }
  }

  async checkPropertyExists(params: ICheckPropertyExistsImplParams): Promise<boolean> {
    try {
      const count = await this.propertyRepository.count({
        where: {
          hostId: params.hostId,
          title: params.title,
        },
      });

      return count > 0;
    } catch (error) {
      this.handleDbError(error, 'checkPropertyExists', 'Property');
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
