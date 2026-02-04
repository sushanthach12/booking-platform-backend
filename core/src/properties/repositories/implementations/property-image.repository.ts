import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { PropertyImageEntity } from '../../entities/property-image.entity';
import {
  ICreatePropertyImageImplParams,
  IFindPropertyImageByIdImplParams,
  IFindPropertyImagesImplParams,
  IUpdatePropertyImageImplParams,
  IPropertyImageRepository,
} from '../interfaces/property-image.repository.interface';

@Injectable()
export class PropertyImageRepository implements IPropertyImageRepository {
  private readonly logger = new Logger(PropertyImageRepository.name);

  constructor(
    @InjectRepository(PropertyImageEntity)
    private readonly propertyImageRepository: Repository<PropertyImageEntity>,
  ) {}

  async createPropertyImage(
    params: ICreatePropertyImageImplParams,
  ): Promise<PropertyImageEntity> {
    try {
      const image = this.propertyImageRepository.create({
        propertyId: params.propertyId,
        roomId: params.roomId,
        url: params.url,
        thumbnailUrl: params.thumbnailUrl,
        caption: params.caption,
        altText: params.altText,
        displayOrder: params.displayOrder ?? 0,
        isPrimary: params.isPrimary ?? false,
        width: params.width,
        height: params.height,
        fileSize: params.fileSize,
        mimeType: params.mimeType,
      });

      return await this.propertyImageRepository.save(image);
    } catch (error) {
      this.handleDbError(error, 'createPropertyImage', 'PropertyImage');
    }
  }

  async findPropertyImageById(
    params: IFindPropertyImageByIdImplParams,
  ): Promise<PropertyImageEntity | null> {
    try {
      return await this.propertyImageRepository.findOne({
        where: { id: params.id },
      });
    } catch (error) {
      this.handleDbError(error, 'findPropertyImageById', 'PropertyImage');
    }
  }

  async findPropertyImages(
    params?: IFindPropertyImagesImplParams,
  ): Promise<PropertyImageEntity[]> {
    try {
      const whereConditions: any = {};

      if (params?.propertyId) {
        whereConditions.propertyId = params.propertyId;
      }

      if (params?.roomId !== undefined) {
        whereConditions.roomId = params.roomId;
      }

      if (params?.isPrimary !== undefined) {
        whereConditions.isPrimary = params.isPrimary;
      }

      const queryBuilder = this.propertyImageRepository
        .createQueryBuilder('image')
        .where(whereConditions)
        .orderBy('image.displayOrder', 'ASC')
        .addOrderBy('image.createdAt', 'ASC');

      if (params?.limit) {
        queryBuilder.limit(params.limit);
      }

      if (params?.offset) {
        queryBuilder.offset(params.offset);
      }

      return await queryBuilder.getMany();
    } catch (error) {
      this.handleDbError(error, 'findPropertyImages', 'PropertyImage');
    }
  }

  async updatePropertyImage(
    params: IUpdatePropertyImageImplParams,
  ): Promise<PropertyImageEntity> {
    try {
      const image = await this.findPropertyImageById({ id: params.id });
      if (!image) {
        throw new Error('Property image not found');
      }

      Object.assign(image, {
        ...(params.url !== undefined && { url: params.url }),
        ...(params.thumbnailUrl !== undefined && { thumbnailUrl: params.thumbnailUrl }),
        ...(params.caption !== undefined && { caption: params.caption }),
        ...(params.altText !== undefined && { altText: params.altText }),
        ...(params.displayOrder !== undefined && { displayOrder: params.displayOrder }),
        ...(params.isPrimary !== undefined && { isPrimary: params.isPrimary }),
        ...(params.width !== undefined && { width: params.width }),
        ...(params.height !== undefined && { height: params.height }),
        ...(params.fileSize !== undefined && { fileSize: params.fileSize }),
        ...(params.mimeType !== undefined && { mimeType: params.mimeType }),
      });

      return await this.propertyImageRepository.save(image);
    } catch (error) {
      this.handleDbError(error, 'updatePropertyImage', 'PropertyImage');
    }
  }

  async deletePropertyImage(
    params: IFindPropertyImageByIdImplParams,
  ): Promise<boolean> {
    try {
      const result = await this.propertyImageRepository.delete(params.id);
      return (result.affected ?? 0) > 0;
    } catch (error) {
      this.handleDbError(error, 'deletePropertyImage', 'PropertyImage');
    }
  }

  async findPrimaryImage(propertyId: string): Promise<PropertyImageEntity | null> {
    try {
      return await this.propertyImageRepository.findOne({
        where: { propertyId, isPrimary: true },
      });
    } catch (error) {
      this.handleDbError(error, 'findPrimaryImage', 'PropertyImage');
    }
  }

  async unsetPrimaryImages(propertyId: string): Promise<void> {
    try {
      await this.propertyImageRepository.update(
        { propertyId, isPrimary: true },
        { isPrimary: false }
      );
    } catch (error) {
      this.handleDbError(error, 'unsetPrimaryImages', 'PropertyImage');
    }
  }

  async getMaxDisplayOrder(propertyId: string): Promise<number> {
    try {
      const result = await this.propertyImageRepository
        .createQueryBuilder('image')
        .select('MAX(image.displayOrder)', 'maxOrder')
        .where('image.propertyId = :propertyId', { propertyId })
        .getRawOne();

      return result?.maxOrder ?? -1;
    } catch (error) {
      this.handleDbError(error, 'getMaxDisplayOrder', 'PropertyImage');
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
