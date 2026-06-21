import { EAuthProvider, EUserRole } from '../../enums/user.enum';
import { IUser } from '../../interfaces/user.interface';

export interface ICreateUserImplParams {
  email: string;
  password?: string | null;
  name: string;
  role: EUserRole;
  auth_provider?: EAuthProvider;
  google_id?: string | null;
}

export interface IUserRepository {
  findAll(): Promise<IUser[]>;
  findById(id: string): Promise<IUser | null>;
  findByEmail(email: string): Promise<IUser | null>;
  create(params: ICreateUserImplParams): Promise<IUser>;
  update(user: IUser): Promise<IUser>;
  delete(id: string): Promise<void>;
}
