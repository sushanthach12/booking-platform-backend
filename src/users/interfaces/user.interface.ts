import { EAuthProvider, EUserRole } from '../enums/user.enum';

export interface IUser {
  id: string;
  email: string;
  password?: string | null;
  name: string;
  role: string;
  phone?: string;
  auth_provider?: string;
  google_id?: string | null;
}

export interface ICreateUserParams {
  email: string;
  password?: string | null;
  name: string;
  role: EUserRole;
  auth_provider?: EAuthProvider;
  google_id?: string | null;
}

export interface IGetProfileResponse {
  id: string;
  email: string;
  name: string;
  role: EUserRole;
  phone?: string;
}
