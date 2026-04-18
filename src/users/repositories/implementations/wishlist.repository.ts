import { ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WishlistEntity } from '../../entities/wishlist.entity';
import type { IWishlistItem, IWishlistRepository } from '../../interfaces/wishlist.interface';

export class WishlistRepository implements IWishlistRepository {
  constructor(
    @InjectRepository(WishlistEntity)
    private readonly repo: Repository<WishlistEntity>,
  ) {}

  async findByUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ items: IWishlistItem[]; total: number }> {
    const [items, total] = await this.repo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }

  async add(userId: string, propertyId: string): Promise<IWishlistItem> {
    const existing = await this.repo.findOne({ where: { userId, propertyId } });
    if (existing) throw new ConflictException('Property already in wishlist');
    const item = this.repo.create({ userId, propertyId });
    return this.repo.save(item);
  }

  async remove(userId: string, propertyId: string): Promise<void> {
    await this.repo.delete({ userId, propertyId });
  }

  async exists(userId: string, propertyId: string): Promise<boolean> {
    return this.repo.existsBy({ userId, propertyId });
  }
}
