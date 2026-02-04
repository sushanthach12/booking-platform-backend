import { PropertyEntity } from '../../entities/property.entity';
import { EPropertyStatus, EPropertyType } from '../../enums/property.enum';

// Core Property Repository Interface
export interface IPropertyRepository2 {
  // Property CRUD
  createProperty(params: ICreatePropertyImplParams): Promise<PropertyEntity>;
  findPropertyById(params: IFindPropertyByIdImplParams): Promise<PropertyEntity | null>;
  findProperties(params?: IFindPropertiesImplParams): Promise<PropertyEntity[]>;
  updateProperty(params: IUpdatePropertyImplParams): Promise<PropertyEntity>;
  deleteProperty(params: IFindPropertyByIdImplParams): Promise<boolean>;
  countProperties(params?: ICountPropertiesImplParams): Promise<number>;
  checkPropertyExists(params: ICheckPropertyExistsImplParams): Promise<boolean>;
}

// Interface Definitions
export interface ICreatePropertyImplParams {
  hostId: string;
  title: string;
  description?: string | null;
  propertyType: EPropertyType;
  status?: EPropertyStatus;
}

export interface IUpdatePropertyImplParams {
  id: string;
  title?: string;
  description?: string | null;
  propertyType?: EPropertyType;
  status?: EPropertyStatus;
}

export interface IFindPropertyByIdImplParams {
  id: string;
}

export interface IFindPropertiesImplParams {
  page?: number;
  limit?: number;
  offset?: number;
  propertyType?: EPropertyType;
  status?: EPropertyStatus;
  hostId?: string;
  title?: string;
}

export interface ICountPropertiesImplParams {
  propertyType?: EPropertyType;
  status?: EPropertyStatus;
  hostId?: string;
  title?: string;
}

export interface ICheckPropertyExistsImplParams {
  hostId: string;
  title: string;
}
