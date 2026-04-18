import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UserService } from '../services/user.service';
import { WishlistService } from '../services/wishlist.service';

@ApiTags('users')
@Controller({ path: 'users/me', version: '1' })
export class UsersMeController {
  private readonly logger = new Logger(UsersMeController.name);

  constructor(
    private readonly userService: UserService,
    private readonly wishlistService: WishlistService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user full profile' })
  async getMe(@RequestUserId() userId: string) {
    this.logger.log(`Get full profile for user ${userId}`);
    const profile = await this.userService.getProfile(userId);
    return { data: profile };
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current user profile' })
  async updateMe(
    @RequestUserId() userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    this.logger.log(`Update profile for user ${userId}`);
    const updated = await this.userService.updateProfile(userId, dto);
    return { data: updated };
  }

  @Get('wishlist')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user wishlist' })
  async getWishlist(
    @RequestUserId() userId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    this.logger.log(`Get wishlist for user ${userId}`);
    const result = await this.wishlistService.getWishlist(
      userId,
      Number(page),
      Number(limit),
    );
    return {
      data: result.items,
      meta: { total: result.total, page: result.page, limit: result.limit },
    };
  }

  @Post('wishlist/:propertyId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add property to wishlist' })
  async addToWishlist(
    @RequestUserId() userId: string,
    @Param('propertyId') propertyId: string,
  ) {
    this.logger.log(`Add property ${propertyId} to wishlist for user ${userId}`);
    const item = await this.wishlistService.addToWishlist(userId, propertyId);
    return { data: item };
  }

  @Delete('wishlist/:propertyId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove property from wishlist' })
  async removeFromWishlist(
    @RequestUserId() userId: string,
    @Param('propertyId') propertyId: string,
  ) {
    this.logger.log(`Remove property ${propertyId} from wishlist for user ${userId}`);
    await this.wishlistService.removeFromWishlist(userId, propertyId);
    return { data: { success: true } };
  }
}
