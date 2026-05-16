import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { USER_REPOSITORY, WISHLIST_REPOSITORY } from '../database';
import { PropertyEntity } from '../properties/entities/property.entity';
import { PropertyImageEntity } from '../properties/entities/property-image.entity';
import { PropertyLocationEntity } from '../properties/entities/property-location.entity';
import { PropertyPricingEntity } from '../properties/entities/property-pricing.entity';
import { UserController } from './controllers/user.controller';
import { UsersMeController } from './controllers/users-me.controller';
import { UserEntity } from './entities/user.entity';
import { WishlistEntity } from './entities/wishlist.entity';
import { UserRepositoryImpl } from './repositories';
import { WishlistRepository } from './repositories/implementations/wishlist.repository';
import { UserService } from './services/user.service';
import { WishlistService } from './services/wishlist.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      WishlistEntity,
      PropertyEntity,
      PropertyImageEntity,
      PropertyLocationEntity,
      PropertyPricingEntity,
    ]),
  ],
  controllers: [UserController, UsersMeController],
  providers: [
    UserService,
    WishlistService,
    {
      provide: USER_REPOSITORY,
      useClass: UserRepositoryImpl,
    },
    {
      provide: WISHLIST_REPOSITORY,
      useClass: WishlistRepository,
    },
  ],
  exports: [UserService, WishlistService, USER_REPOSITORY],
})
export class UserModule {}
