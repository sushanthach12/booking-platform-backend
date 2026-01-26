import { Controller, Get, HttpStatus, Logger, Res } from '@nestjs/common';
import { Response } from 'express';
import { RequestUserId } from '../../common/decorators/request-user.decorator';
import { UserService } from '../services/user.service';

@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @Get('profile')
  async getProfile(
    @Res() res: Response,
    @RequestUserId() requestUserId: string,
  ) {
    this.logger.log(`Getting profile for user`);

    const response = await this.userService.getProfile(requestUserId);

    return res.status(HttpStatus.OK).json({ data: response });
  }
}
