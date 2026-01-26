export interface IRegisterRequest {
  payload: {
    email: string;
    password: string;
    name: string;
  };
}

export interface IRegisterResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
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
