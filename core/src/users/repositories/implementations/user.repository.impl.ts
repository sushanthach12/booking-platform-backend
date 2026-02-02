import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserEntity } from '../../entities/user.entity';
import { IUser } from '../../interfaces/user.interface';
import {
  ICreateUserImplParams,
  IUserRepository,
} from '../interfaces/user.repository.interface';

export class UserRepositoryImpl implements IUserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  findAll(): Promise<IUser[]> {
    return this.dataSource.manager.transaction(
      async (transactionalEntityManager) => {
        const users = await transactionalEntityManager.find(UserEntity, {
          select: ['id', 'email', 'name', 'role'],
        });
        return users;
      },
    );
  }

  findById(id: string): Promise<IUser | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<IUser | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async create(data: ICreateUserImplParams): Promise<IUser> {
    const user = this.userRepository.create({
      ...data,
      role: data.role,
    });

    return this.userRepository.save(user);
  }
  update(user: IUser): Promise<IUser> {
    console.log(`Updating user:`, user);
    throw new Error('Method not implemented.');
  }
  delete(id: string): Promise<void> {
    console.log(`Deleting user by ID: ${id}`);
    throw new Error('Method not implemented.');
  }
}
