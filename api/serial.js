/** POST /api/serial — idempotent, globally unique six-digit certs within the R2 bucket. */
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'node:crypto';

const required = ['R2_ACCOUNT_ID','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_BUCKET'];
const ready = () => required.every((k) => process.env[k]);
const client = () => new S3Client({
  region:'auto',
  endpoint:'https://' + process.env.R2_ACCOUNT_ID + '.r2.cloudflarestorage.com',
  credentials:{ accessKeyId:process.env.R2_ACCESS_KEY_ID, secretAccessKey:process.env.R2_SECRET_ACCESS_KEY },
});
const bodyJson = async (body) => JSON.parse(Buffer.from(await body.transformToByteArray()).toString('utf8'));

export default async function handler(req,res){
  if (req.method !== 'POST') return res.status(405).json({ error:'POST only' });
  if (!ready()) return res.status(503).json({ error:'Serial registry is not configured' });
  const seed = String(req.body?.seed || '').trim().slice(0,180);
  const name = String(req.body?.name || '').replace(/[^\w .-]/g,'').slice(0,40);
  if (!seed) return res.status(400).json({ error:'Missing card seed' });

  const s3=client(), Bucket=process.env.R2_BUCKET;
  const seedId=crypto.createHash('sha256').update(seed).digest('hex').slice(0,32);
  const seedKey='registry/seeds/' + seedId + '.json';
  try {
    const existing=await s3.send(new GetObjectCommand({ Bucket, Key:seedKey }));
    const found=await bodyJson(existing.Body);
    if (/^HHG-26-\d{6}$/.test(found.serial || '')) return res.status(200).json(found);
  } catch(err){
    if (!(err && (err.$metadata?.httpStatusCode===404 || err.name==='NoSuchKey'))) console.warn('seed lookup',err?.name);
  }

  for (let attempt=0;attempt<12;attempt++){
    const serial='HHG-26-' + crypto.randomInt(100000,1000000);
    const payload={ serial, seedId, name };
    try {
      await s3.send(new PutObjectCommand({
        Bucket, Key:'registry/certs/' + serial + '.json', Body:Buffer.from(JSON.stringify(payload)),
        ContentType:'application/json; charset=utf-8', CacheControl:'no-store', IfNoneMatch:'*',
      }));
      await s3.send(new PutObjectCommand({
        Bucket, Key:seedKey, Body:Buffer.from(JSON.stringify(payload)),
        ContentType:'application/json; charset=utf-8', CacheControl:'no-store',
      }));
      return res.status(200).json(payload);
    } catch(err){
      if (err && (err.$metadata?.httpStatusCode===409 || err.$metadata?.httpStatusCode===412 || err.name==='PreconditionFailed')) continue;
      console.error('serial issue failed',err);
      return res.status(500).json({ error:'Could not issue cert' });
    }
  }
  return res.status(503).json({ error:'Cert pool busy — retry' });
}
