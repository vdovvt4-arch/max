const fs = require('fs');
const path = require('path');

// تحميل متغيرات .env إن وجدت بدون مكتبات خارجية
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}

const { PORT } = require('./src/config');
const { createApp } = require('./src/app');

const server = createApp();

server.listen(PORT, () => {
  console.log(`LINE Store running at http://localhost:${PORT}`);
  console.log(`Admin dashboard at http://localhost:${PORT}/admin`);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    server.close(() => process.exit(0));
  });
}
