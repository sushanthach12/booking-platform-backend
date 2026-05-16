import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PropertyEntity } from '../../properties/entities/property.entity';
import { PropertyImageEntity } from '../../properties/entities/property-image.entity';
import { PropertyLocationEntity } from '../../properties/entities/property-location.entity';
import { PropertyPricingEntity } from '../../properties/entities/property-pricing.entity';
import { WISHLIST_REPOSITORY } from '../../database/di/symbols';
import type { IWishlistItem, IWishlistItemEnriched, IWishlistRepository } from '../interfaces/wishlist.interface';

@Injectable()
export class WishlistService {
  constructor(
    @Inject(WISHLIST_REPOSITORY)
    private readonly wishlistRepository: IWishlistRepository,
    @InjectRepository(PropertyEntity)
    private readonly propertyRepo: Repository<PropertyEntity>,
    @InjectRepository(PropertyImageEntity)
    private readonly imageRepo: Repository<PropertyImageEntity>,
    @InjectRepository(PropertyLocationEntity)
    private readonly locationRepo: Repository<PropertyLocationEntity>,
    @InjectRepository(PropertyPricingEntity)
    private readonly pricingRepo: Repository<PropertyPricingEntity>,
  ) {}

  async getWishlist(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ items: IWishlistItemEnriched[]; total: number; page: number; limit: number }> {
    const { items, total } = await this.wishlistRepository.findByUser(userId, page, limit);

    if (items.length === 0) {
      return { items: [], total, page, limit };
    }

    const propertyIds = items.map((i) => i.propertyId);

    const [properties, images, locations, pricings] = await Promise.all([
      this.propertyRepo.find({ where: { id: In(propertyIds) }, select: ['id', 'title'] }),
      this.imageRepo.find({
        where: { propertyId: In(propertyIds), isPrimary: true },
        select: ['propertyId', 'url'],
      }),
      this.locationRepo.find({
        where: { propertyId: In(propertyIds) },
        select: ['propertyId', 'city', 'state', 'country'],
      }),
      this.pricingRepo.find({
        where: { propertyId: In(propertyIds) },
        select: ['propertyId', 'basePrice', 'currency'],
      }),
    ]);

    const propertyMap = new Map(properties.map((p) => [p.id, p]));
    // Fallback: if no primary image, grab any first image per property
    const primaryImageMap = new Map(images.map((i) => [i.propertyId, i.url]));
    if (primaryImageMap.size < propertyIds.length) {
      const fallbackImages = await this.imageRepo.find({
        where: { propertyId: In(propertyIds) },
        order: { displayOrder: 'ASC' },
        select: ['propertyId', 'url'],
      });
      for (const img of fallbackImages) {
        if (!primaryImageMap.has(img.propertyId)) {
          primaryImageMap.set(img.propertyId, img.url);
        }
      }
    }
    const locationMap = new Map(locations.map((l) => [l.propertyId, l]));
    const pricingMap = new Map(pricings.map((p) => [p.propertyId, p]));

    const enriched: IWishlistItemEnriched[] = items.map((item) => {
      const prop = propertyMap.get(item.propertyId);
      const loc = locationMap.get(item.propertyId);
      const pricing = pricingMap.get(item.propertyId);
      return {
        ...item,
        property: prop
          ? {
              title: prop.title,
              coverImage: primaryImageMap.get(item.propertyId) ?? null,
              city: loc?.city ?? null,
              state: loc?.state ?? null,
              country: loc?.country ?? null,
              basePrice: pricing?.basePrice ?? null,
              currency: pricing?.currency ?? null,
            }
          : null,
      };
    });

    return { items: enriched, total, page, limit };
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

  async getWishlistedIds(userId: string, propertyIds: string[]): Promise<Set<string>> {
    return this.wishlistRepository.findWishlistedIds(userId, propertyIds);
  }
}
