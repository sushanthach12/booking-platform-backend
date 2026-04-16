import { Inject, Injectable } from '@nestjs/common';
import { WISHLIST_REPOSITORY } from '../../database/di/symbols';
import type { IWishlistItem, IWishlistRepository } from '../interfaces/wishlist.interface';

@Injectable()
export class WishlistService {
  constructor(
    @Inject(WISHLIST_REPOSITORY)
    private readonly wishlistRepository: IWishlistRepository,
  ) {}

  async getWishlist(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ items: IWishlistItem[]; total: number; page: number; limit: number }> {
    const { items, total } = await this.wishlistRepository.findByUser(userId, page, limit);
    return { items, total, page, limit };
  }

  async addToWishlist(userId: string, propertyId: string): Promise<IWishlistItem> {
    return this.wishlistRepository.add(userId, propertyId);
  }

  async removeFromWishlist(userId: string, propertyId: string): Promise<void> {
    return this.wishlistRepository.remove(userId, propertyId);
  }

  async isWishlisted(userId: string, propertyId: string): Promise<boolean> {
    return this.wishlistRepository.exists(userId, propertyId);
  }
}
