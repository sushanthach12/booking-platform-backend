import { EUserRole } from '../../enums/user.enum';
import { IUser } from '../../interfaces/user.interface';

export interface ICreateUserImplParams {
  email: string;
  password: string;
  name: string;
  role: EUserRole;
}

export interface IUserRepository {
  findAll(): Promise<IUser[]>;
  findById(id: string): Promise<IUser | null>;
  findByEmail(email: string): Promise<IUser | null>;
  create(params: ICreateUserImplParams): Promise<IUser>;
  update(user: IUser): Promise<IUser>;
  delete(id: string): Promise<void>;
}
