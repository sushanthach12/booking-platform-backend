import { IUser } from '../../interfaces/user.interface';
import { IUserRepository } from '../interfaces/user.repository.interface';

export class UserRepositoryImpl implements IUserRepository {
  constructor() {}

  findAll(): Promise<IUser[]> {
    throw new Error('Method not implemented.');
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
