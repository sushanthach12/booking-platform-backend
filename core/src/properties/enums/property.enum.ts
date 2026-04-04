export enum EPropertyType {
  APARTMENT = 'apartment',
  HOUSE = 'house',
  VILLA = 'villa',
  CABIN = 'cabin',
  CONDO = 'condo',
  TOWNHOUSE = 'townhouse',
  STUDIO = 'studio',
  LOFT = 'loft',
  OTHER = 'other',
}

export enum EPropertyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DELETED = 'deleted',
}

export enum EPropertyChargeTypes {
  CLEANING_FEE = 'cleaning_fee',
  SERVICE_FEE = 'service_fee',
}

export enum EPropertyChargeFeeTypes {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export enum EPropertyCancellationPolicy {
  FLEXIBLE = 'flexible',
  MODERATE = 'moderate',
  STRICT = 'strict',
}

export enum EPropertyRuleType {
  PETS = 'pets',
  SMOKING = 'smoking',
  PARTIES = 'parties',
  QUIET_HOURS = 'quiet_hours',
  CHECK_IN_TIME = 'check_in_time',
  CHECK_OUT_TIME = 'check_out_time',
  MAX_GUESTS = 'max_guests',
  NO_SHOES = 'no_shoes',
  NO_ALCOHOL = 'no_alcohol',
  NO_SMOKING = 'no_smoking',
  OTHER = 'other',
}

export enum EPropertyAmenityCategory {
  GENERAL = 'general',
  ESSENTIALS = 'essentials',
  FEATURES = 'features',
  LOCATION = 'location',
  SAFETY = 'safety',
}
