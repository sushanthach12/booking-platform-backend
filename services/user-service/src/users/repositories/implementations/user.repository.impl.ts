import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserEntity } from '../../entities/user.entity';
import { IUser } from '../../interfaces/user.interface';
import { IUserRepository } from '../interfaces/user.repository.interface';

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
    console.log(`Finding user by ID: ${id}`);
    throw new Error('Method not implemented.');
  }
  findByEmail(email: string): Promise<IUser | null> {
    console.log(`Finding user by email: ${email}`);
    throw new Error('Method not implemented.');
  }
  create(user: IUser): Promise<IUser> {
    console.log(`Creating user:`, user);
    throw new Error('Method not implemented.');
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
