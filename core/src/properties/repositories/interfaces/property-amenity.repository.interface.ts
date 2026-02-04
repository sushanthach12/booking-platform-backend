import { Amenity } from '../../entities/amenity.entity';
import { PropertyAmenityEntity } from '../../entities/property-amenity.entity';

// Property Amenity Repository Interface
export interface IPropertyAmenityRepository {
  // Property Amenity CRUD
  createPropertyAmenity(params: ICreatePropertyAmenityImplParams): Promise<PropertyAmenityEntity>;
  findPropertyAmenityById(params: IFindPropertyAmenityByIdImplParams): Promise<PropertyAmenityEntity | null>;
  findPropertyAmenities(params?: IFindPropertyAmenitiesImplParams): Promise<PropertyAmenityEntity[]>;
  updatePropertyAmenity(params: IUpdatePropertyAmenityImplParams): Promise<PropertyAmenityEntity>;
  deletePropertyAmenity(params: IFindPropertyAmenityByIdImplParams): Promise<boolean>;

  // Amenity CRUD (for standalone amenities)
  createAmenity(params: ICreateAmenityImplParams): Promise<Amenity>;
  findAmenityById(params: IFindAmenityByIdImplParams): Promise<Amenity | null>;
  findAmenities(params?: IFindAmenitiesImplParams): Promise<Amenity[]>;
  updateAmenity(params: IUpdateAmenityImplParams): Promise<Amenity>;
  deleteAmenity(params: IFindAmenityByIdImplParams): Promise<boolean>;
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

export interface ICreateAmenityImplParams {
  name: string;
  category: string;
  icon?: string | null;
  description?: string | null;
}

export interface IUpdateAmenityImplParams {
  id: string;
  name?: string;
  category?: string;
  icon?: string | null;
  description?: string | null;
}

export interface IFindAmenityByIdImplParams {
  id: string;
}

export interface IFindAmenitiesImplParams {
  category?: string;
  limit?: number;
  offset?: number;
}
