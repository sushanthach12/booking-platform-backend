import { Amenity, AmenityCategory } from '../../entities/amenity.entity';
import { HouseRuleEntity, RuleType } from '../../entities/house-rules.entity';
import { PropertyAmenityEntity } from '../../entities/property-amenity.entity';
import { PropertyDetailsEntity } from '../../entities/property-details.entity';
import { PropertyImageEntity } from '../../entities/property-image.entity';
import { PropertyLocationEntity } from '../../entities/property-location.entity';
import { PropertyPolicyEntity } from '../../entities/property-policy.entity';
import { PropertyPricingEntity } from '../../entities/property-pricing.entity';
import { PropertyRatingEntity } from '../../entities/property-rating.entity';
import { PropertyEntity } from '../../entities/property.entity';
import { RoomEntity } from '../../entities/rooms.entity';
import {
  EPropertyAmenityCategory,
  EPropertyCancellationPolicy,
  EPropertyRuleType,
  EPropertyStatus,
  EPropertyType,
} from '../../enums/property.enum';
import { EBedType, ERoomStatus, ERoomType } from '../../enums/rooms.enum';
import { ICreatePropertyRequestParams } from '../../interfaces/property.interface';

// Property Entity Interfaces
export interface ICheckPropertyExistsImplParams {
  hostId: string;
  title: string;
}

export interface ICreatePropertyImplParams {
  hostId: string;
  payload: ICreatePropertyRequestParams['payload'];
  slug: string;
}

export interface ICreatePropertyImplResponse {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  propertyType: EPropertyType;
  status: EPropertyStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUpdatePropertyImplParams {
  id: string;
  title?: string;
  slug?: string;
  description?: string | null;
  propertyType?: EPropertyType;
  status?: EPropertyStatus;
}

export interface IFindPropertyByIdImplParams {
  id: string;
}

export interface IFindPropertyForIndexingImplParams {
  id: string;
}

export interface IFindPropertyIdsForIndexingImplParams {
  /** Keyset cursor — return ids after this one, ordered by id. */
  afterId?: string;
  limit: number;
}

export interface IFindPropertiesImplParams {
  page: number;
  limit: number;
  offset: number;
  propertyType?: EPropertyType;
  status?: EPropertyStatus;
  hostId?: string;
  title?: string;
}

export interface ISearchPropertiesImplParams {
  page: number;
  limit: number;
  offset: number;
  location?: string;
  /** Latitude of the searched place (from frontend geocoding). */
  latitude?: number;
  /** Longitude of the searched place (from frontend geocoding). */
  longitude?: number;
  /** Search radius in kilometers around (latitude, longitude). Defaults applied in the repository. */
  radius?: number;
  propertyType?: EPropertyType[];
  minPrice?: number;
  maxPrice?: number;
  amenities?: string[];
  minBeds?: number;
  minBathrooms?: number;
  guests?: number;
  checkIn?: Date;
  checkOut?: Date;
  sortBy?: 'price' | 'rating' | 'distance' | 'created_at';
  sortOrder?: 'ASC' | 'DESC';
}

export interface ISearchPropertiesImplResult {
  properties: PropertyEntity[];
  total: number;
}

export interface ICountPropertiesImplParams {
  propertyType?: EPropertyType;
  status?: EPropertyStatus;
  hostId?: string;
  title?: string;
}

// Amenity Entity Interfaces
export interface ICreateAmenityImplParams {
  name: string;
  category: AmenityCategory;
  icon?: string | null;
  description?: string | null;
}

export interface IUpdateAmenityImplParams {
  id: string;
  name?: string;
  category?: AmenityCategory;
  icon?: string | null;
  description?: string | null;
}

export interface IFindAmenityByIdImplParams {
  id: string;
}

export interface IFindAmenitiesImplParams {
  category?: AmenityCategory;
  limit?: number;
  offset?: number;
}

// Property Location Entity Interfaces
export interface ICreatePropertyLocationImplParams {
  propertyId: string;
  location?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state?: string | null;
  country: string;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface IUpdatePropertyLocationImplParams {
  id: string;
  location?: string | null;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  state?: string | null;
  country?: string;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface IFindPropertyLocationByIdImplParams {
  id: string;
}

export interface IFindPropertyLocationByPropertyIdImplParams {
  propertyId: string;
}

// Property Amenity Entity Interfaces
// export interface ICreatePropertyAmenityImplParams {
//   propertyId: string;
//   amenityId: string;
//   notes?: string | null;
// }

// export interface IUpdatePropertyAmenityImplParams {
//   id: string;
//   notes?: string | null;
// }

// export interface IFindPropertyAmenityByIdImplParams {
//   id: string;
// }

// export interface IFindPropertyAmenitiesImplParams {
//   propertyId?: string;
//   amenityId?: string;
//   limit?: number;
//   offset?: number;
// }

// Property Rating Entity Interfaces
export interface ICreatePropertyRatingImplParams {
  propertyId: string;
  averageRating?: number;
  totalReviews?: number;
}

export interface IUpdatePropertyRatingImplParams {
  id: string;
  averageRating?: number;
  totalReviews?: number;
}

export interface IFindPropertyRatingByIdImplParams {
  id: string;
}

export interface IFindPropertyRatingByPropertyIdImplParams {
  propertyId: string;
}

// Property Image Entity Interfaces
// export interface ICreatePropertyImageImplParams {
//   propertyId: string;
//   roomId?: string | null;
//   url: string;
//   thumbnailUrl?: string | null;
//   caption?: string | null;
//   altText?: string | null;
//   displayOrder?: number;
//   isPrimary?: boolean;
//   width?: number | null;
//   height?: number | null;
//   fileSize?: number | null;
//   mimeType?: string | null;
// }

// export interface IUpdatePropertyImageImplParams {
//   id: string;
//   url?: string;
//   thumbnailUrl?: string | null;
//   caption?: string | null;
//   altText?: string | null;
//   displayOrder?: number;
//   isPrimary?: boolean;
//   width?: number | null;
//   height?: number | null;
//   fileSize?: number | null;
//   mimeType?: string | null;
// }

// export interface IFindPropertyImageByIdImplParams {
//   id: string;
// }

// export interface IFindPropertyImagesImplParams {
//   propertyId?: string;
//   roomId?: string | null;
//   isPrimary?: boolean;
//   limit?: number;
//   offset?: number;
// }

// Room Entity Interfaces
export interface ICreateRoomImplParams {
  propertyId: string;
  name: string;
  description?: string | null;
  roomType: ERoomType;
  beds?: number;
  bedType?: EBedType | null;
  maxGuests?: number;
  basePrice?: number | null;
  isPrivate?: boolean;
  hasBathroom?: boolean;
  hasBalcony?: boolean;
  floorNumber?: number | null;
  squareMeters?: number | null;
  status?: ERoomStatus;
}

export interface IUpdateRoomImplParams {
  id: string;
  name?: string;
  description?: string | null;
  roomType?: ERoomType;
  beds?: number;
  bedType?: EBedType | null;
  maxGuests?: number;
  basePrice?: number | null;
  isPrivate?: boolean;
  hasBathroom?: boolean;
  hasBalcony?: boolean;
  floorNumber?: number | null;
  squareMeters?: number | null;
  status?: ERoomStatus;
}

export interface IFindRoomByIdImplParams {
  id: string;
}

export interface IFindRoomsImplParams {
  propertyId?: string;
  roomType?: ERoomType;
  status?: ERoomStatus;
  limit?: number;
  offset?: number;
}

// House Rule Entity Interfaces
export interface ICreateHouseRuleImplParams {
  propertyId: string;
  ruleType: RuleType;
  allowed?: boolean;
  description?: string | null;
}

export interface IUpdateHouseRuleImplParams {
  id: string;
  allowed?: boolean;
  description?: string | null;
}

export interface IFindHouseRuleByIdImplParams {
  id: string;
}

export interface IFindHouseRulesImplParams {
  propertyId?: string;
  ruleType?: RuleType;
  allowed?: boolean;
  limit?: number;
  offset?: number;
}

// Property Image / Amenity / HouseRule by-property-id lookups
export interface IFindPropertyImagesByPropertyIdImplParams {
  propertyId: string;
}

export interface IFindPropertyAmenitiesByPropertyIdImplParams {
  propertyId: string;
}

export interface IFindHouseRulesByPropertyIdImplParams {
  propertyId: string;
}

// Property Details Entity Interfaces
export interface ICreatePropertyDetailsImplParams {
  propertyId: string;
  maxGuests: number;
  bedrooms?: number;
  beds?: number;
  bathrooms?: number;
}

export interface IUpdatePropertyDetailsImplParams {
  id: string;
  maxGuests?: number;
  bedrooms?: number;
  beds?: number;
  bathrooms?: number;
}

export interface IFindPropertyDetailsByIdImplParams {
  id: string;
}

export interface IFindPropertyDetailsByPropertyIdImplParams {
  propertyId: string;
}

// Property Policy Entity Interfaces
export interface ICreatePropertyPolicyImplParams {
  propertyId: string;
  minNights?: number;
  maxNights?: number;
  checkInTime?: string;
  checkOutTime?: string;
  cancellationPolicy?: EPropertyCancellationPolicy;
  instantBook?: boolean;
}

export interface IUpdatePropertyPolicyImplParams {
  id: string;
  minNights?: number;
  maxNights?: number;
  checkInTime?: string;
  checkOutTime?: string;
  cancellationPolicy?: EPropertyCancellationPolicy;
  instantBook?: boolean;
}

export interface IFindPropertyPolicyByIdImplParams {
  id: string;
}

export interface IFindPropertyPolicyByPropertyIdImplParams {
  propertyId: string;
}

// Property Pricing Entity Interfaces
export interface ICreatePropertyPricingImplParams {
  propertyId: string;
  basePrice: number;
  currency?: string;
  cleaningFee?: number;
  serviceFeePercentage?: number;
}

export interface IUpdatePropertyPricingImplParams {
  id: string;
  basePrice?: number;
  currency?: string;
  cleaningFee?: number;
  serviceFeePercentage?: number;
}

export interface IFindPropertyPricingByIdImplParams {
  id: string;
}

export interface IFindPropertyPricingByPropertyIdImplParams {
  propertyId: string;
}

// ─── Draft Onboarding Interfaces ─────────────────────────────────────────────

export interface ICreateDraftPropertyImplParams {
  hostId: string;
  title: string;
  description: string;
  propertyType: EPropertyType;
  slug: string;
}

export interface IUpsertPropertyLocationImplParams {
  propertyId: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state?: string | null;
  country: string;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface IUpsertPropertyPricingImplParams {
  propertyId: string;
  basePrice: number;
  currency: string;
  cleaningFee?: number;
  serviceFeePercentage?: number;
}

export interface IUpsertPropertyPolicyImplParams {
  propertyId: string;
  minNights: number;
  maxNights: number;
  checkInTime: string;
  checkOutTime: string;
  cancellationPolicy: EPropertyCancellationPolicy;
  instantBook?: boolean;
}

export interface IUpsertPropertyDetailsImplParams {
  propertyId: string;
  maxGuests: number;
  bedrooms?: number;
  beds?: number;
  bathrooms?: number;
}

export interface IReplaceAmenityItem {
  name: string;
  description?: string | null;
  icon?: string | null;
  category: EPropertyAmenityCategory;
}

export interface IReplaceRuleItem {
  ruleType: EPropertyRuleType;
  allowed: boolean;
  description?: string | null;
}

export interface IReplacePropertyAmenitiesImplParams {
  propertyId: string;
  amenities: IReplaceAmenityItem[];
  rules?: IReplaceRuleItem[];
}

export interface IReplaceImageItem {
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

export interface IReplacePropertyImagesImplParams {
  propertyId: string;
  images: IReplaceImageItem[];
}

export interface IFindDraftPropertyByHostIdImplParams {
  hostId: string;
}

export interface IPropertyStepRelations {
  hasLocation: boolean;
  hasPricing: boolean;
  hasPolicy: boolean;
  hasDetails: boolean;
  hasImages: boolean;
}

export interface IFindPropertyWithStepRelationsImplParams {
  propertyId: string;
}

// Repository Interface Definitions
export interface IPropertyRepository {
  checkPropertyExists(params: ICheckPropertyExistsImplParams): Promise<boolean>;
  getAllPropertySlugs(): Promise<string[]>;
  // Property CRUD
  createProperty(
    params: ICreatePropertyImplParams,
  ): Promise<ICreatePropertyImplResponse>;
  findPropertyById(
    params: IFindPropertyByIdImplParams,
  ): Promise<PropertyEntity | null>;
  /** Loads a property with every relation the search document mapper needs. */
  findPropertyForIndexing(
    params: IFindPropertyForIndexingImplParams,
  ): Promise<PropertyEntity | null>;
  /** Keyset-paginated id list for the reindex-all backfill job. */
  findPropertyIdsForIndexing(
    params: IFindPropertyIdsForIndexingImplParams,
  ): Promise<string[]>;
  findProperties(params: IFindPropertiesImplParams): Promise<PropertyEntity[]>;
  countProperties(params: ICountPropertiesImplParams): Promise<number>;
  updateProperty(params: IUpdatePropertyImplParams): Promise<PropertyEntity>;
  deleteProperty(params: IFindPropertyByIdImplParams): Promise<boolean>;
  searchProperties(
    params: ISearchPropertiesImplParams,
  ): Promise<ISearchPropertiesImplResult>;

  // Amenity CRUD
  createAmenity(params: ICreateAmenityImplParams): Promise<Amenity>;
  findAmenityById(params: IFindAmenityByIdImplParams): Promise<Amenity | null>;
  findAmenities(params?: IFindAmenitiesImplParams): Promise<Amenity[]>;
  updateAmenity(params: IUpdateAmenityImplParams): Promise<Amenity>;
  deleteAmenity(params: IFindAmenityByIdImplParams): Promise<boolean>;

  // Property Location CRUD
  createPropertyLocation(
    params: ICreatePropertyLocationImplParams,
  ): Promise<PropertyLocationEntity>;
  findPropertyLocationById(
    params: IFindPropertyLocationByIdImplParams,
  ): Promise<PropertyLocationEntity | null>;
  findPropertyLocationByPropertyId(
    params: IFindPropertyLocationByPropertyIdImplParams,
  ): Promise<PropertyLocationEntity | null>;
  updatePropertyLocation(
    params: IUpdatePropertyLocationImplParams,
  ): Promise<PropertyLocationEntity>;
  deletePropertyLocation(
    params: IFindPropertyLocationByIdImplParams,
  ): Promise<boolean>;

  // Property Amenity CRUD
  // createPropertyAmenity(
  //   params: ICreatePropertyAmenityImplParams,
  // ): Promise<PropertyAmenityEntity>;
  // findPropertyAmenityById(
  //   params: IFindPropertyAmenityByIdImplParams,
  // ): Promise<PropertyAmenityEntity | null>;
  // findPropertyAmenities(
  //   params?: IFindPropertyAmenitiesImplParams,
  // ): Promise<PropertyAmenityEntity[]>;
  // updatePropertyAmenity(
  //   params: IUpdatePropertyAmenityImplParams,
  // ): Promise<PropertyAmenityEntity>;
  // deletePropertyAmenity(
  //   params: IFindPropertyAmenityByIdImplParams,
  // ): Promise<boolean>;

  // Property Rating CRUD
  createPropertyRating(
    params: ICreatePropertyRatingImplParams,
  ): Promise<PropertyRatingEntity>;
  findPropertyRatingById(
    params: IFindPropertyRatingByIdImplParams,
  ): Promise<PropertyRatingEntity | null>;
  findPropertyRatingByPropertyId(
    params: IFindPropertyRatingByPropertyIdImplParams,
  ): Promise<PropertyRatingEntity | null>;
  updatePropertyRating(
    params: IUpdatePropertyRatingImplParams,
  ): Promise<PropertyRatingEntity>;
  deletePropertyRating(
    params: IFindPropertyRatingByIdImplParams,
  ): Promise<boolean>;

  // Property Image CRUD
  // createPropertyImage(
  //   params: ICreatePropertyImageImplParams,
  // ): Promise<PropertyImageEntity>;
  // findPropertyImageById(
  //   params: IFindPropertyImageByIdImplParams,
  // ): Promise<PropertyImageEntity | null>;
  // findPropertyImages(
  //   params?: IFindPropertyImagesImplParams,
  // ): Promise<PropertyImageEntity[]>;
  // updatePropertyImage(
  //   params: IUpdatePropertyImageImplParams,
  // ): Promise<PropertyImageEntity>;
  // deletePropertyImage(
  //   params: IFindPropertyImageByIdImplParams,
  // ): Promise<boolean>;

  // Room CRUD
  createRoom(params: ICreateRoomImplParams): Promise<RoomEntity>;
  findRoomById(params: IFindRoomByIdImplParams): Promise<RoomEntity | null>;
  findRooms(params?: IFindRoomsImplParams): Promise<RoomEntity[]>;
  updateRoom(params: IUpdateRoomImplParams): Promise<RoomEntity>;
  deleteRoom(params: IFindRoomByIdImplParams): Promise<boolean>;

  // Property images / amenities / house rules by propertyId
  findPropertyImagesByPropertyId(
    params: IFindPropertyImagesByPropertyIdImplParams,
  ): Promise<PropertyImageEntity[]>;
  findPropertyAmenitiesByPropertyId(
    params: IFindPropertyAmenitiesByPropertyIdImplParams,
  ): Promise<PropertyAmenityEntity[]>;
  findHouseRulesByPropertyId(
    params: IFindHouseRulesByPropertyIdImplParams,
  ): Promise<HouseRuleEntity[]>;

  // House Rule CRUD
  createHouseRule(params: ICreateHouseRuleImplParams): Promise<HouseRuleEntity>;
  findHouseRuleById(
    params: IFindHouseRuleByIdImplParams,
  ): Promise<HouseRuleEntity | null>;
  findHouseRules(
    params?: IFindHouseRulesImplParams,
  ): Promise<HouseRuleEntity[]>;
  updateHouseRule(params: IUpdateHouseRuleImplParams): Promise<HouseRuleEntity>;
  deleteHouseRule(params: IFindHouseRuleByIdImplParams): Promise<boolean>;

  // Property Details CRUD
  createPropertyDetails(
    params: ICreatePropertyDetailsImplParams,
  ): Promise<PropertyDetailsEntity>;
  findPropertyDetailsById(
    params: IFindPropertyDetailsByIdImplParams,
  ): Promise<PropertyDetailsEntity | null>;
  findPropertyDetailsByPropertyId(
    params: IFindPropertyDetailsByPropertyIdImplParams,
  ): Promise<PropertyDetailsEntity | null>;
  updatePropertyDetails(
    params: IUpdatePropertyDetailsImplParams,
  ): Promise<PropertyDetailsEntity>;
  deletePropertyDetails(
    params: IFindPropertyDetailsByIdImplParams,
  ): Promise<boolean>;

  // Property Policy CRUD
  createPropertyPolicy(
    params: ICreatePropertyPolicyImplParams,
  ): Promise<PropertyPolicyEntity>;
  findPropertyPolicyById(
    params: IFindPropertyPolicyByIdImplParams,
  ): Promise<PropertyPolicyEntity | null>;
  findPropertyPolicyByPropertyId(
    params: IFindPropertyPolicyByPropertyIdImplParams,
  ): Promise<PropertyPolicyEntity | null>;
  updatePropertyPolicy(
    params: IUpdatePropertyPolicyImplParams,
  ): Promise<PropertyPolicyEntity>;
  deletePropertyPolicy(
    params: IFindPropertyPolicyByIdImplParams,
  ): Promise<boolean>;

  // Property Pricing CRUD
  createPropertyPricing(
    params: ICreatePropertyPricingImplParams,
  ): Promise<PropertyPricingEntity>;
  findPropertyPricingById(
    params: IFindPropertyPricingByIdImplParams,
  ): Promise<PropertyPricingEntity | null>;
  findPropertyPricingByPropertyId(
    params: IFindPropertyPricingByPropertyIdImplParams,
  ): Promise<PropertyPricingEntity | null>;
  updatePropertyPricing(
    params: IUpdatePropertyPricingImplParams,
  ): Promise<PropertyPricingEntity>;
  deletePropertyPricing(
    params: IFindPropertyPricingByIdImplParams,
  ): Promise<boolean>;

  // ─── Draft Onboarding Methods ───────────────────────────────────────────────

  /** Creates only the root PropertyEntity with DRAFT status (no child relations). */
  createDraftProperty(
    params: ICreateDraftPropertyImplParams,
  ): Promise<PropertyEntity>;

  /** Upserts PropertyLocationEntity — inserts if absent, updates if present. */
  upsertPropertyLocation(
    params: IUpsertPropertyLocationImplParams,
  ): Promise<PropertyLocationEntity>;

  /** Upserts PropertyPricingEntity. */
  upsertPropertyPricing(
    params: IUpsertPropertyPricingImplParams,
  ): Promise<PropertyPricingEntity>;

  /** Upserts PropertyPolicyEntity. */
  upsertPropertyPolicy(
    params: IUpsertPropertyPolicyImplParams,
  ): Promise<PropertyPolicyEntity>;

  /** Upserts PropertyDetailsEntity. */
  upsertPropertyDetails(
    params: IUpsertPropertyDetailsImplParams,
  ): Promise<PropertyDetailsEntity>;

  /**
   * Replaces all PropertyAmenityEntity and HouseRuleEntity rows for the property.
   * Runs inside a transaction: deletes existing, then bulk-inserts new ones.
   */
  replacePropertyAmenities(
    params: IReplacePropertyAmenitiesImplParams,
  ): Promise<void>;

  /**
   * Replaces all PropertyImageEntity rows for the property.
   * Runs inside a transaction: deletes existing, then bulk-inserts new ones.
   */
  replacePropertyImages(
    params: IReplacePropertyImagesImplParams,
  ): Promise<void>;

  /** Returns the most recently created DRAFT property for a given host. */
  findDraftPropertyByHostId(
    params: IFindDraftPropertyByHostIdImplParams,
  ): Promise<PropertyEntity | null>;

  /** Checks which step-related child entities exist for a draft property. */
  findPropertyWithStepRelations(
    params: IFindPropertyWithStepRelationsImplParams,
  ): Promise<IPropertyStepRelations>;

  /** Seeds AvailabilityCalendar for the next N days and transitions status to ACTIVE. */
  publishDraftProperty(params: {
    propertyId: string;
    daysAhead?: number;
  }): Promise<PropertyEntity>;
}
