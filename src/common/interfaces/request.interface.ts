import { Request } from 'express';

export interface ApiRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}
