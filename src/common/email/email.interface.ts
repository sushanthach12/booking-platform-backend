export interface ISendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface IEmailService {
  send(params: ISendEmailParams): Promise<void>;
}
