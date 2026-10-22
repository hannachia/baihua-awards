import fs from 'fs';
import path from 'path';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ---- Where uploaded videos and images are kept -------------------------------------------
//   STORAGE_DRIVER=local   (default) files stay on this computer's disk. Testing only.
//   STORAGE_DRIVER=s3      any S3-compatible service: Cloudflare R2, AWS S3, Backblaze B2,
//                          Alibaba Cloud OSS, Tencent COS, MinIO ... Set the S3_* values in .env.
// Visitors never get a permanent link: the server hands out short-lived signed links.
// -------------------------------------------------------------------------------------------

export const driver = () => (process.env.STORAGE_DRIVER || 'local').toLowerCase();

let client;
const s3 = () => (client ??= new S3Client({
  region: process.env.S3_REGION || 'auto',
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }
}));

// Takes the file multer saved on disk and moves it to the chosen storage.
// Returns what to remember in the database.
export async function saveUploaded(file) {
  if (driver() !== 's3') return { storage: 'local', path: file.path };
  const key = `entries/${path.basename(file.path)}`;
  await new Upload({
    client: s3(),
    params: { Bucket: process.env.S3_BUCKET, Key: key, Body: fs.createReadStream(file.path), ContentType: file.mimetype }
  }).done();
  fs.unlink(file.path, () => {});
  return { storage: 's3', key };
}

// A link that works for one hour. Use { download: true } to force a file download.
export function getDownloadUrl(file, { download = false } = {}) {
  const cmd = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: file.key,
    ResponseContentType: file.mimetype,
    ...(download ? { ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName || 'entry')}` } : {})
  });
  return getSignedUrl(s3(), cmd, { expiresIn: 3600 });
}

export function checkStorageConfig() {
  if (driver() !== 's3') return;
  for (const k of ['S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY']) {
    if (!process.env[k]) { console.error(`STORAGE_DRIVER=s3 needs ${k} in .env`); process.exit(1); }
  }
}
