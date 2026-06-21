import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { USER_REPOSITORY } from '../../database/di/symbols';
import { UpdateProfileDto } from '../dto/update-profile.dto';
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

  async findById(userId: string): Promise<IUser | null> {
    return this.userRepository.findById(userId);
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    await this.userRepository.update({ ...user, password: hashedPassword });
  }

  async create(params: ICreateUserParams): Promise<IUser> {
    return this.userRepository.create({
      email: params.email,
      password: params.password,
      name: params.name,
      role: params.role,
      auth_provider: params.auth_provider,
      google_id: params.google_id,
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
      phone: user.phone,
    };
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<IGetProfileResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.userRepository.update({
      ...user,
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
    } as IUser);

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role as EUserRole,
      phone: updated.phone,
    };
  }

  async becomeHost(userId: string): Promise<IGetProfileResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (user.role === EUserRole.HOST) {
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: EUserRole.HOST,
        phone: user.phone,
      };
    }

    const updated = await this.userRepository.update({
      ...user,
      role: EUserRole.HOST,
    } as IUser);

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: EUserRole.HOST,
      phone: updated.phone,
    };
  }
}
