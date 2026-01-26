import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY } from '../../database/di/symbols';
import { ICreateUserParams, IUser } from '../interfaces/user.interface';
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
}
