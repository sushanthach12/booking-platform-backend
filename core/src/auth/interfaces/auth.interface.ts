import { EUserRole } from '../../users/enums/user.enum';

export interface IRegisterRequest {
  payload: {
    email: string;
    password: string;
    name: string;
    userType: EUserRole;
  };
}

export interface IRegisterResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface ILoginRequest {
  payload: {
    email: string;
    password: string;
  };
}

export interface ILoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
}
