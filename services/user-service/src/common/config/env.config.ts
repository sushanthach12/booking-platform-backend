import * as fs from 'fs';
import * as path from 'path';
import { NodeEnv } from '../enums/config.enum';

export const loadEnvConfig = (): void => {
  const nodeEnv = process.env.NODE_ENV || NodeEnv.DEVELOPMENT;
  console.log('nodeEnv', nodeEnv);

  // 1️⃣ For LOCAL or DEVELOPMENT – fall back to .env
  if (nodeEnv === NodeEnv.DEVELOPMENT) {
    const envPath = path.resolve(process.cwd(), `.env.local`);
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach((line) => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0 && !process.env[key]) {
            process.env[key] = valueParts.join('=').replace(/^["']|["']$/g, '');
          }
        }
      });
      console.log(`Loaded local environment file: ${envPath}`);
    } else {
      console.warn(`No local env file found for ${nodeEnv}`);
    }
    return;
  }

  // 3️⃣ Add defaults or computed environment variables
  if (!process.env.PORT) process.env.PORT = '8000';
  if (!process.env.CORS_ORIGIN) process.env.CORS_ORIGIN = '*';
  if (!process.env.API_PREFIX) process.env.API_PREFIX = 'api/platform';
  if (!process.env.API_VERSION) process.env.API_VERSION = 'v1';
};
