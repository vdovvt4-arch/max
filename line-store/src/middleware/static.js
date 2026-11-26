const fs = require('fs');
const path = require('path');
const { PUBLIC_DIR, MIME_TYPES } = require('../config');

function serveStatic(reqPath, res) {
  const rel = reqPath === '/'
    ? 'index.html'
    : reqPath === '/admin'
      ? 'admin.html'
      : reqPath.replace(/^\/+/, '');

  const full = path.resolve(PUBLIC_DIR, rel);
  if (!full.startsWith(PUBLIC_DIR + path.sep) && full !== PUBLIC_DIR) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Forbidden');
  }

  fs.readFile(full, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not Found');
    }
    const ext = path.extname(full).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(data);
  });
}

module.exports = { serveStatic };
