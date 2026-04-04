import { Controller, Get, Logger } from '@nestjs/common';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { UserService } from '../services/user.service';

@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @Get('profile')
  async getProfile(@RequestUserId() requestUserId: string) {
    this.logger.log(`Getting profile for user`);

    const response = await this.userService.getProfile(requestUserId);

    return { data: response };
  }

  /** Alias: GET /users/me → same as GET /users/profile */
  @Get('me')
  async getMe(@RequestUserId() requestUserId: string) {
    const response = await this.userService.getProfile(requestUserId);
    return { data: response };
  }
}
