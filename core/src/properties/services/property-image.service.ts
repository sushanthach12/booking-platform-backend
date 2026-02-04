import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RequestUser } from '../../common/types/users.types';
import { EUserRole } from '../../users/enums/user.enum';
import {
  ICreatePropertyImageRequestParams,
  IDeletePropertyImageRequestParams,
  IReorderPropertyImagesRequestParams,
  IUpdatePropertyImageRequestParams,
  PropertyImageResponse,
} from '../interfaces/property.interface';
import { IPropertyImageRepository } from '../repositories/interfaces/property-image.repository.interface';
import { IPropertyRepository } from '../repositories';

@Injectable()
export class PropertyImageService {
  constructor(
    @Inject('PROPERTY_REPOSITORY')
    private readonly propertyRepository: IPropertyRepository,
    @Inject('PROPERTY_IMAGE_REPOSITORY')
    private readonly propertyImageRepository: IPropertyImageRepository,
  ) {}

  async createPropertyImage(
    params: ICreatePropertyImageRequestParams,
  ): Promise<PropertyImageResponse> {
    const { user, params: { propertyId }, payload } = params;

    // Check if user owns the property
    const property = await this.propertyRepository.findPropertyById({ id: propertyId });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.hostId !== user.id) {
      throw new ForbiddenException('Only property owner can add images');
    }

    // If this is marked as primary, unset other primary images
    if (payload.isPrimary) {
      const existingImages = await this.propertyImageRepository.findPropertyImages({ propertyId });
      const primaryImages = existingImages.filter(img => img.isPrimary);
      
      for (const primaryImage of primaryImages) {
        await this.propertyImageRepository.updatePropertyImage({
          id: primaryImage.id,
          isPrimary: false,
        });
      }
    }

    // Set display order if not provided
    if (payload.displayOrder === undefined) {
      const maxOrder = await this.propertyImageRepository.getMaxDisplayOrder(propertyId);
      payload.displayOrder = maxOrder + 1;
    }

    const image = await this.propertyImageRepository.createPropertyImage({
      propertyId,
      url: payload.url,
      thumbnailUrl: payload.thumbnailUrl,
      caption: payload.caption,
      altText: payload.altText,
      displayOrder: payload.displayOrder,
      isPrimary: payload.isPrimary,
      width: payload.width,
      height: payload.height,
      fileSize: payload.fileSize,
      mimeType: payload.mimeType,
    });

    return this.mapImageToResponse(image);
  }

  async getPropertyImages(
    params: { user: RequestUser; params: { propertyId: string } },
  ): Promise<PropertyImageResponse[]> {
    const { user, params: { propertyId } } = params;

    // Check if property exists and user has access
    const property = await this.propertyRepository.findPropertyById({ id: propertyId });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    // For now, allow all authenticated users to view property images
    // In production, you might want to add visibility restrictions

    const images = await this.propertyImageRepository.findPropertyImages({ propertyId });
    
    return images.map(image => this.mapImageToResponse(image));
  }

  async updatePropertyImage(
    params: IUpdatePropertyImageRequestParams,
  ): Promise<PropertyImageResponse> {
    const { user, params: { propertyId, imageId }, payload } = params;

    // Check if user owns the property
    const property = await this.propertyRepository.findPropertyById({ id: propertyId });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.hostId !== user.id) {
      throw new ForbiddenException('Only property owner can update images');
    }

    // Check if image exists
    const existingImage = await this.propertyImageRepository.findPropertyImageById({ id: imageId });
    if (!existingImage || existingImage.propertyId !== propertyId) {
      throw new NotFoundException('Image not found');
    }
    if (payload.isPrimary) {
      const existingImages = await this.propertyImageRepository.findPropertyImages({ propertyId });
      const primaryImages = existingImages.filter(img => img.isPrimary && img.id !== imageId);
      
      for (const primaryImage of primaryImages) {
        await this.propertyImageRepository.updatePropertyImage({
          id: primaryImage.id,
          isPrimary: false,
        });
      }
    }

    const updatedImage = await this.propertyImageRepository.updatePropertyImage({
      id: imageId,
      ...payload,
    });

    return this.mapImageToResponse(updatedImage);
  }

  async deletePropertyImage(
    params: IDeletePropertyImageRequestParams,
  ): Promise<void> {
    const { user, params: { propertyId, imageId } } = params;

    // Check if user owns the property
    const property = await this.propertyRepository.findPropertyById({ id: propertyId });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.hostId !== user.id) {
      throw new ForbiddenException('Only property owner can delete images');
    }

    // Check if image exists
    const existingImage = await this.propertyImageRepository.findPropertyImageById({ id: imageId });
    if (!existingImage || existingImage.propertyId !== propertyId) {
      throw new NotFoundException('Image not found');
    }

    // If this is marked as primary, unset other primary images

    // Don't allow deleting the only primary image if there are other images
    if (existingImage.isPrimary) {
      const imageCount = (await this.propertyImageRepository.findPropertyImages({ propertyId })).length;
      if (imageCount > 1) {
        throw new BadRequestException('Cannot delete primary image. Set another image as primary first.');
      }
    }

    await this.propertyImageRepository.deletePropertyImage({ id: imageId });
  }

  async reorderPropertyImages(
    params: IReorderPropertyImagesRequestParams,
  ): Promise<void> {
    const { user, params: { propertyId }, payload } = params;

    // Check if user owns the property
    const property = await this.propertyRepository.findPropertyById({ id: propertyId });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.hostId !== user.id) {
      throw new ForbiddenException('Only property owner can reorder images');
    }

    // Validate all image IDs belong to this property
    const imageIds = payload.imageOrders.map(order => order.imageId);
    const images = await Promise.all(
      imageIds.map(id => this.propertyImageRepository.findPropertyImageById({ id }))
    );
    
    const invalidImages = images.filter(img => !img || img.propertyId !== propertyId);
    if (invalidImages.length > 0) {
      throw new BadRequestException('Some images do not belong to this property');
    }

    // Update display orders
    await Promise.all(
      payload.imageOrders.map(order =>
        this.propertyImageRepository.updatePropertyImage({
          id: order.imageId,
          displayOrder: order.displayOrder,
        })
      )
    );
  }

  private mapImageToResponse(image: any): PropertyImageResponse {
    return {
      id: image.id,
      url: image.url,
      thumbnailUrl: image.thumbnailUrl,
      caption: image.caption,
      altText: image.altText,
      displayOrder: image.displayOrder,
      isPrimary: image.isPrimary,
      width: image.width,
      height: image.height,
      fileSize: image.fileSize,
      mimeType: image.mimeType,
      createdAt: image.createdAt,
    };
  }
}
