import { Injectable } from '@nestjs/common';
import { IUserRepository } from '../repositories';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: IUserRepository) {}
}
