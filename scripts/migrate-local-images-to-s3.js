 require('dotenv').config();

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const S3 = require('aws-sdk/clients/s3');

// === Env mapping (your names → AWS expected) ===
const region = process.env.AWS_BUCKET_REGION || process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY;
const bucket = process.env.AWS_BUCKET_NAME || process.env.S3_BUCKET;
const makePublic = (process.env.MAKE_PUBLIC || 'true').toLowerCase() === 'true'; // public read for feed images

if (!region) throw new Error('AWS region missing (AWS_BUCKET_REGION)');
if (!bucket) throw new Error('Bucket missing (AWS_BUCKET_NAME)');
if (!accessKeyId || !secretAccessKey) throw new Error('AWS creds missing (AWS_ACCESS_KEY / AWS_SECRET_KEY)');

const s3 = new S3({ region, accessKeyId, secretAccessKey });

// Upload a single local file to S3 at the given key
async function putFile(localPath, key) {
  const Body = fs.createReadStream(localPath);
  const params = { Bucket: bucket, Key: key, Body };
  //if (makePublic) params.ACL = 'public-read';
  await s3.upload(params).promise();
  // URL style (virtual-hosted)
  const url = `https://${bucket}.s3.${region}.amazonaws.com/${encodeURI(key)}`;
  return url;
}

async function* walk(dir) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else yield full;
  }
}

async function main() {
  const roots = ['post_pictures', 'profile_pictures']
    .map(d => path.join(process.cwd(), d))
    .filter(d => fs.existsSync(d));

  if (roots.length === 0) {
    console.error('No post_pictures/ or profile_pictures/ folders found in project root.');
    process.exit(1);
  }

  const outDir = path.join(process.cwd(), '.tmp');
  await fsp.mkdir(outDir, { recursive: true });
  const map = {}; // oldPath -> newUrl

  let count = 0, errors = 0;
  for (const root of roots) {
    const prefix = path.basename(root); // 'post_pictures' or 'profile_pictures'
    for await (const file of walk(root)) {
      const rel = path.relative(process.cwd(), file);            // e.g. post_pictures/abc.png
      const key  = `${prefix}/${path.basename(file)}`;           // keep flat under each prefix
      try {
        const url = await putFile(file, key);
        map[`/${rel}`] = url;                                    // leading slash to match URLs in DB
        count++;
        if (count % 25 === 0) console.log(`Uploaded ${count}...`);
      } catch (e) {
        errors++;
        console.error(`Failed: ${rel} → ${key}: ${e.code || e.message}`);
      }
    }
  }

  const jsonPath = path.join(outDir, 'image-migration-map.json');
  const csvPath  = path.join(outDir, 'image-migration-map.csv');
  await fsp.writeFile(jsonPath, JSON.stringify(map, null, 2));
  await fsp.writeFile(
    csvPath,
    'old_path,new_url\n' + Object.entries(map).map(([k,v]) => `"${k}","${v}"`).join('\n')
  );

  console.log(`\n✅ Done. Uploaded: ${count}, Errors: ${errors}`);
  console.log(`📄 Map JSON: ${jsonPath}`);
  console.log(`📄 Map CSV : ${csvPath}`);
  if (makePublic) {
    console.log('🔓 Objects uploaded with ACL public-read (good for direct feed URLs).');
  } else {
    console.log('🔐 Objects are private. You must serve via presigned URLs or a proxy.');
  }
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});