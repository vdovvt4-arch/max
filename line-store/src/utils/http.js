const { MAX_BODY_BYTES } = require('../config');

class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function json(res, status, data) {
  if (res.headersSent) return;
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        req.destroy();
        reject(new AppError(413, 'حجم البيانات كبير جداً'));
        return;
      }
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new AppError(400, 'صيغة JSON غير صالحة'));
      }
    });
    req.on('error', reject);
  });
}

function parseJsonSafe(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

module.exports = { AppError, json, readBody, parseJsonSafe };
