import { PropertyAmenityEntity } from '../../entities/property-amenity.entity';

// Property Amenity Repository Interface
export interface IPropertyAmenityRepository {
  // Property Amenity CRUD only (handles relationship between properties and amenities)
  createPropertyAmenity(
    params: ICreatePropertyAmenityImplParams,
  ): Promise<PropertyAmenityEntity>;
  findPropertyAmenityById(
    params: IFindPropertyAmenityByIdImplParams,
  ): Promise<PropertyAmenityEntity | null>;
  findPropertyAmenities(
    params?: IFindPropertyAmenitiesImplParams,
  ): Promise<PropertyAmenityEntity[]>;
  updatePropertyAmenity(
    params: IUpdatePropertyAmenityImplParams,
  ): Promise<PropertyAmenityEntity>;
  deletePropertyAmenity(
    params: IFindPropertyAmenityByIdImplParams,
  ): Promise<boolean>;
}

// Interface Definitions
export interface ICreatePropertyAmenityImplParams {
  propertyId: string;
  amenityId: string;
  notes?: string | null;
}

export interface IUpdatePropertyAmenityImplParams {
  id: string;
  notes?: string | null;
}

export interface IFindPropertyAmenityByIdImplParams {
  id: string;
}

export interface IFindPropertyAmenitiesImplParams {
  propertyId?: string;
  amenityId?: string;
  limit?: number;
  offset?: number;
}
