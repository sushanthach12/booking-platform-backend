/**
 * One-time script: downloads seed property images from picsum.photos and uploads
 * them to your Cloudflare R2 bucket at seed/properties/{name}.jpg.
 *
 * Run from the backend directory:
 *   node scripts/upload-seed-images.mjs
 *
 * Requires .env.local with: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 *                            R2_BUCKET_NAME, R2_PUBLIC_BASE_URL
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(__dirname, '../.env.local');
  const content = readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key && rest.length > 0) {
      env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
  return env;
}

const SEED_IMAGE_NAMES = [
  'bandra-penthouse-1', 'bandra-penthouse-2', 'bandra-penthouse-3', 'bandra-penthouse-4',
  'jaipur-haveli-1', 'jaipur-haveli-2', 'jaipur-haveli-3', 'jaipur-haveli-4',
  'udaipur-villa-1', 'udaipur-villa-2', 'udaipur-villa-3', 'udaipur-villa-4',
  'pondy-villa-1', 'pondy-villa-2', 'pondy-villa-3',
  'colaba-studio-1', 'colaba-studio-2', 'colaba-studio-3',
  'hauz-khas-apt-1', 'hauz-khas-apt-2', 'hauz-khas-apt-3',
  'panjim-heritage-1', 'panjim-heritage-2', 'panjim-heritage-3',
  'fort-kochi-1', 'fort-kochi-2', 'fort-kochi-3',
  'delhi-penthouse-1', 'delhi-penthouse-2', 'delhi-penthouse-3', 'delhi-penthouse-4',
  'indiranagar-loft-1', 'indiranagar-loft-2', 'indiranagar-loft-3',
  'koramangala-townhouse-1', 'koramangala-townhouse-2', 'koramangala-townhouse-3', 'koramangala-townhouse-4',
  'juhu-villa-1', 'juhu-villa-2', 'juhu-villa-3', 'juhu-villa-4',
  'alleppey-cottage-1', 'alleppey-cottage-2', 'alleppey-cottage-3',
  'munnar-bungalow-1', 'munnar-bungalow-2', 'munnar-bungalow-3', 'munnar-bungalow-4',
  'manali-chalet-1', 'manali-chalet-2', 'manali-chalet-3',
  'varkala-cliff-1', 'varkala-cliff-2', 'varkala-cliff-3',
  'calangute-villa-1', 'calangute-villa-2', 'calangute-villa-3', 'calangute-villa-4',
  'anjuna-house-1', 'anjuna-house-2', 'anjuna-house-3',
  'rishikesh-retreat-1', 'rishikesh-retreat-2', 'rishikesh-retreat-3',
  'coorg-bungalow-1', 'coorg-bungalow-2', 'coorg-bungalow-3', 'coorg-bungalow-4',
];

async function main() {
  const env = loadEnv();

  const required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_BASE_URL'];
  for (const key of required) {
    if (!env[key]) throw new Error(`Missing env var: ${key}`);
  }

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  console.log(`Uploading ${SEED_IMAGE_NAMES.length} images to R2 bucket: ${env.R2_BUCKET_NAME}\n`);

  let success = 0;
  let failed = 0;

  for (const name of SEED_IMAGE_NAMES) {
    const picsumUrl = `https://picsum.photos/seed/${name}/1200/800`;
    const key = `uploads/general/${name}.jpg`;

    try {
      const response = await fetch(picsumUrl, { redirect: 'follow' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const buffer = Buffer.from(await response.arrayBuffer());

      await s3.send(new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: 'image/jpeg',
      }));

      console.log(`✓ ${name}`);
      success++;
    } catch (err) {
      console.error(`✗ ${name}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n─────────────────────────────────────────`);
  console.log(`Done: ${success} uploaded, ${failed} failed`);
  console.log(`Public base: ${env.R2_PUBLIC_BASE_URL}`);
  console.log(`Images accessible at: ${env.R2_PUBLIC_BASE_URL}/uploads/general/{name}.jpg`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
