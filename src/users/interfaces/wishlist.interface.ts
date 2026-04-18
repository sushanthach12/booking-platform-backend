export interface IWishlistItem {
  id: string;
  userId: string;
  propertyId: string;
  createdAt: Date;
}

export interface IWishlistRepository {
  findByUser(userId: string, page: number, limit: number): Promise<{ items: IWishlistItem[]; total: number }>;
  add(userId: string, propertyId: string): Promise<IWishlistItem>;
  remove(userId: string, propertyId: string): Promise<void>;
  exists(userId: string, propertyId: string): Promise<boolean>;
}
