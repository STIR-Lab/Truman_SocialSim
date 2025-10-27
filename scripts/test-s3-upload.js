
// scripts/test-s3-upload.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { uploadFile, getFileStream } = require('../s3');

(async () => {
  try {
    // 1️⃣ Create a small temporary test file
    const tmpDir = path.join(__dirname, '..', '.tmp');
    fs.mkdirSync(tmpDir, { recursive: true });
    const filename = `s3-test-${Date.now()}.txt`;
    const filePath = path.join(tmpDir, filename);
    fs.writeFileSync(filePath, `hello s3 @ ${new Date().toISOString()}\n`, 'utf8');

    // 2️⃣ Upload using your helper (mimics multer's file object)
    console.log('Uploading test file...');
    const result = await uploadFile({ path: filePath, filename });
    console.log('✅ Uploaded:', result);

    // 3️⃣ Download it back
    console.log('Downloading it back...');
    const outPath = path.join(tmpDir, `downloaded-${filename}`);
    await new Promise((resolve, reject) => {
      const rs = getFileStream(filename);
      const ws = fs.createWriteStream(outPath);
      rs.on('error', reject);
      ws.on('error', reject);
      ws.on('finish', resolve);
      rs.pipe(ws);
    });
    console.log('✅ Downloaded to:', outPath);

    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
})();
