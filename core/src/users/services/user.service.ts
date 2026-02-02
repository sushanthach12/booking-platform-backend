import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { USER_REPOSITORY } from '../../database/di/symbols';
import { EUserRole } from '../enums/user.enum';
import {
  ICreateUserParams,
  IGetProfileResponse,
  IUser,
} from '../interfaces/user.interface';
import { IUserRepository } from '../repositories';

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
  ) {}

  async findByEmail(email: string): Promise<IUser | null> {
    return this.userRepository.findByEmail(email);
  }

  async create(params: ICreateUserParams): Promise<IUser> {
    return this.userRepository.create({
      email: params.email,
      password: params.password,
      name: params.name,
      role: params.role,
    });
  }

  async getProfile(userId: string): Promise<IGetProfileResponse> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as EUserRole,
    };
  }
}
