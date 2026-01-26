import { UserRole } from '../enums/user.enum';

export interface IUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: string;
}

export interface ICreateUserParams {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}
