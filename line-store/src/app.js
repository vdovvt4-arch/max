const http = require('http');
const { initDatabase } = require('./db/database');
const { handlePublicRoutes } = require('./routes/publicRoutes');
const { handleAdminRoutes } = require('./routes/adminRoutes');
const { serveStatic } = require('./middleware/static');
const { AppError, json } = require('./utils/http');

function createApp() {
  initDatabase();

  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const pathname = url.pathname;
      const method = req.method;

      if (await handlePublicRoutes(req, res, method, pathname, url) !== false) return;
      if (await handleAdminRoutes(req, res, method, pathname) !== false) return;

      if (method === 'GET') return serveStatic(pathname, res);
      json(res, 405, { error: 'Method Not Allowed' });
    } catch (err) {
      if (err instanceof AppError) {
        return json(res, err.status, { error: err.message });
      }
      console.error('[Server Error]', err);
      json(res, 500, { error: 'حدث خطأ في الخادم' });
    }
  });
}

module.exports = { createApp };
