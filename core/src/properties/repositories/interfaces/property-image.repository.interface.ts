import { PropertyImageEntity } from '../../entities/property-image.entity';

// Property Image Repository Interface
export interface IPropertyImageRepository {
  // CRUD Operations
  createPropertyImage(
    params: ICreatePropertyImageImplParams,
  ): Promise<PropertyImageEntity>;
  findPropertyImageById(
    params: IFindPropertyImageByIdImplParams,
  ): Promise<PropertyImageEntity | null>;
  findPropertyImages(
    params?: IFindPropertyImagesImplParams,
  ): Promise<PropertyImageEntity[]>;
  updatePropertyImage(
    params: IUpdatePropertyImageImplParams,
  ): Promise<PropertyImageEntity>;
  deletePropertyImage(
    params: IFindPropertyImageByIdImplParams,
  ): Promise<boolean>;

  // Custom Operations
  findPrimaryImage(propertyId: string): Promise<PropertyImageEntity | null>;
  unsetPrimaryImages(propertyId: string): Promise<void>;
  getMaxDisplayOrder(propertyId: string): Promise<number>;
}

// Interface Definitions
export interface ICreatePropertyImageImplParams {
  propertyId: string;
  roomId?: string | null;
  url: string;
  thumbnailUrl?: string | null;
  caption?: string | null;
  altText?: string | null;
  displayOrder?: number;
  isPrimary?: boolean;
  width?: number | null;
  height?: number | null;
  fileSize?: number | null;
  mimeType?: string | null;
}

export interface IUpdatePropertyImageImplParams {
  id: string;
  url?: string;
  thumbnailUrl?: string | null;
  caption?: string | null;
  altText?: string | null;
  displayOrder?: number;
  isPrimary?: boolean;
  width?: number | null;
  height?: number | null;
  fileSize?: number | null;
  mimeType?: string | null;
}

export interface IFindPropertyImageByIdImplParams {
  id: string;
}

export interface IFindPropertyImagesImplParams {
  propertyId?: string;
  roomId?: string | null;
  isPrimary?: boolean;
  limit?: number;
  offset?: number;
}
