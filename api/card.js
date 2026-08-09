/** POST /api/card — persist a rendered slab and return its public unfurl URL. */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'node:crypto';

export const config = { api: { bodyParser: { sizeLimit: '8mb' } } };

const required = ['R2_ACCOUNT_ID','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_BUCKET'];
const ready = () => required.every((k) => process.env[k]);
const clean = (s, max) => String(s || '').replace(/[^\w .#@/-]/g, '').slice(0, max);
const baseFor = (req) => {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  return String(process.env.PUBLIC_BASE || (proto + '://' + req.headers.host)).replace(/\/$/, '');
};
const client = () => new S3Client({
  region:'auto',
  endpoint:'https://' + process.env.R2_ACCOUNT_ID + '.r2.cloudflarestorage.com',
  credentials:{
    accessKeyId:process.env.R2_ACCESS_KEY_ID,
    secretAccessKey:process.env.R2_SECRET_ACCESS_KEY,
  },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow','POST');
    return res.status(405).json({ error:'POST only' });
  }
  if (!ready()) return res.status(503).json({ error:'Share storage is not configured' });

  try {
    const { png, name, cls, tier, craft, serial, handle } = req.body || {};
    if (typeof png !== 'string' || !png.startsWith('data:image/png;base64,')) {
      return res.status(400).json({ error:'Invalid PNG payload' });
    }
    const bytes = Buffer.from(png.slice(png.indexOf(',') + 1), 'base64');
    if (!bytes.length || bytes.length > 6 * 1024 * 1024) {
      return res.status(413).json({ error:'Image must be under 6 MB' });
    }

    const id = crypto.createHash('sha256')
      .update(clean(serial,24) + '|' + clean(name,40) + '|' + bytes.length + '|' + bytes.subarray(0,64).toString('hex'))
      .digest('base64url').slice(0,10);
    const meta = {
      n:clean(name,40), c:clean(cls,48), t:clean(tier,20), k:clean(craft,30),
      s:clean(serial,24), h:clean(handle,24), v:3,
    };
    const s3 = client(), Bucket = process.env.R2_BUCKET;
    await Promise.all([
      s3.send(new PutObjectCommand({
        Bucket, Key:'cards/' + id + '.png', Body:bytes, ContentType:'image/png',
        CacheControl:'public, max-age=31536000, immutable',
      })),
      s3.send(new PutObjectCommand({
        Bucket, Key:'cards/' + id + '.json', Body:Buffer.from(JSON.stringify(meta)),
        ContentType:'application/json; charset=utf-8',
        CacheControl:'public, max-age=31536000, immutable',
      })),
    ]);

    const base = baseFor(req);
    return res.status(200).json({
      id, imageUrl:base + '/i/' + id + '.png', shareUrl:base + '/c/' + id,
    });
  } catch (err) {
    console.error('card upload failed', err);
    return res.status(500).json({ error:'Could not publish this card' });
  }
}
