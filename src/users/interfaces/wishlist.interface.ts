export interface IWishlistItem {
  id: string;
  userId: string;
  propertyId: string;
  createdAt: Date;
}

export interface IWishlistItemEnriched extends IWishlistItem {
  property: {
    title: string;
    coverImage: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    basePrice: number | null;
    currency: string | null;
  } | null;
}

export interface IWishlistRepository {
  findByUser(userId: string, page: number, limit: number): Promise<{ items: IWishlistItem[]; total: number }>;
  add(userId: string, propertyId: string): Promise<IWishlistItem>;
  remove(userId: string, propertyId: string): Promise<void>;
  exists(userId: string, propertyId: string): Promise<boolean>;
  findWishlistedIds(userId: string, propertyIds: string[]): Promise<Set<string>>;
}
