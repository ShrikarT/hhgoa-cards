/** GET /i/:file — streams private R2 card assets through the same Vercel domain. */
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const required = ['R2_ACCOUNT_ID','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_BUCKET'];
const ready = () => required.every((k) => process.env[k]);
const client = () => new S3Client({
  region:'auto',
  endpoint:'https://' + process.env.R2_ACCOUNT_ID + '.r2.cloudflarestorage.com',
  credentials:{ accessKeyId:process.env.R2_ACCESS_KEY_ID, secretAccessKey:process.env.R2_SECRET_ACCESS_KEY },
});

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end('GET only');
  if (!ready()) return res.status(503).end('Storage not configured');
  const file = String((req.query && req.query.file) || '');
  if (!/^[A-Za-z0-9_-]{10}\.(png|json)$/.test(file)) return res.status(400).end('Bad asset');

  try {
    const out = await client().send(new GetObjectCommand({ Bucket:process.env.R2_BUCKET, Key:'cards/' + file }));
    const bytes = Buffer.from(await out.Body.transformToByteArray());
    res.setHeader('Content-Type', file.endsWith('.png') ? 'image/png' : 'application/json; charset=utf-8');
    res.setHeader('Cache-Control','public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Content-Length',String(bytes.length));
    return res.status(200).end(bytes);
  } catch (err) {
    if (err && (err.$metadata?.httpStatusCode === 404 || err.name === 'NoSuchKey')) return res.status(404).end('Not found');
    console.error('media read failed',err);
    return res.status(500).end('Asset unavailable');
  }
}
