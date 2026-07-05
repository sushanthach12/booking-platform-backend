import { EUserRole } from '../../users/enums/user.enum';

export interface IRegisterRequest {
  payload: {
    email: string;
    password: string;
    name: string;
    userType: EUserRole;
  };
}

/**
 * Response for login/register: no tokens are issued until the emailed OTP is
 * verified via `POST /auth/verify-otp`.
 */
export interface IOtpChallengeResponse {
  message: string;
  otpRequired: true;
  email: string;
}

/** Payload kept in Redis while a signup awaits OTP verification. */
export interface IPendingSignup {
  email: string;
  name: string;
  hashedPassword: string;
  role: EUserRole;
}

/** Payload kept in Redis while a login awaits OTP verification. */
export interface IPendingLogin {
  userId: string;
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
