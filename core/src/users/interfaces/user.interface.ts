import { EUserRole } from '../enums/user.enum';

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
  role: EUserRole;
}

export interface IGetProfileResponse {
  id: string;
  email: string;
  name: string;
  role: EUserRole;
}
