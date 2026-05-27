const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const NODE_VERSION = 'v22.16.0';
const PLATFORM = 'win-x64';
const ZIP_NAME = `node-${NODE_VERSION}-${PLATFORM}.zip`;
const DOWNLOAD_URL = `https://nodejs.org/dist/${NODE_VERSION}/${ZIP_NAME}`;
const TARGET_DIR = path.join(__dirname, '..', 'resources', 'node', PLATFORM);

if (fs.existsSync(path.join(TARGET_DIR, 'node.exe'))) {
  console.log(`Node.js already exists at ${TARGET_DIR}`);
  process.exit(0);
}

const ZIP_PATH = path.join(__dirname, '..', 'resources', 'node', ZIP_NAME);

console.log(`Downloading Node.js ${NODE_VERSION} ${PLATFORM}...`);

const file = fs.createWriteStream(ZIP_PATH);
https.get(DOWNLOAD_URL, (res) => {
  if (res.statusCode === 302 || res.statusCode === 301) {
    https.get(res.headers.location, (res2) => {
      const total = parseInt(res2.headers['content-length'], 10);
      let downloaded = 0;
      res2.on('data', (chunk) => {
        downloaded += chunk.length;
        process.stdout.write(`\r  ${((downloaded / total) * 100).toFixed(1)}% (${(downloaded / 1024 / 1024).toFixed(1)} MB)`);
      });
      res2.pipe(file);
      file.on('finish', () => { file.close(); onDownloaded(); });
    });
  } else {
    res.pipe(file);
    file.on('finish', () => { file.close(); onDownloaded(); });
  }
}).on('error', (err) => {
  fs.unlink(ZIP_PATH, () => {});
  console.error(`\nDownload failed: ${err.message}`);
  process.exit(1);
});

function onDownloaded() {
  console.log('\nExtracting...');
  const innerDir = `node-${NODE_VERSION}-${PLATFORM}`;
  const tempDir = path.join(__dirname, '..', 'resources', 'node', '_tmp');

  if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true });
  fs.mkdirSync(tempDir, { recursive: true });

  execSync(`unzip -q "${ZIP_PATH}" -d "${tempDir}"`, { stdio: 'inherit' });

  const extracted = path.join(tempDir, innerDir);
  if (fs.existsSync(TARGET_DIR)) fs.rmSync(TARGET_DIR, { recursive: true });
  fs.renameSync(extracted, TARGET_DIR);
  fs.rmSync(tempDir, { recursive: true });
  fs.unlinkSync(ZIP_PATH);

  console.log(`Node.js ${NODE_VERSION} ready at ${TARGET_DIR}`);
}
