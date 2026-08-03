export interface PropertyDocument {
  id: string;
  title: string;
  description: string;
  city: string;
  location: { lat: number; lon: number };
  pricePerNight: number;
  amenities: string[];
  propertyType: string;
  rating: number;
  isAvailable: boolean;
  createdAt: string;
}

// Just a reference, update once working
export interface IProperyEntity {
  id: string;
  title: string;
  description: string | null;
  city: string;
  location: { lat: number; lon: number };
  pricePerNight: number;
  amenities: string[];
  propertyType: string;
  rating: number;
  isAvailable: boolean;
  createdAt: Date;
}
