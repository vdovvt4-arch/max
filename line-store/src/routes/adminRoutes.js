const { GOVERNORATES, ORDER_STATUSES } = require('../config');
const productRepo = require('../db/repositories/productRepo');
const orderRepo = require('../db/repositories/orderRepo');
const customerRepo = require('../db/repositories/customerRepo');
const couponRepo = require('../db/repositories/couponRepo');
const expenseRepo = require('../db/repositories/expenseRepo');
const settingsRepo = require('../db/repositories/settingsRepo');
const { createSession, requireAdmin, revokeSession } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');
const { AppError, json, readBody } = require('../utils/http');
const { cleanProduct } = require('../utils/validators');

async function handleAdminRoutes(req, res, method, pathname) {
  if (method === 'POST' && pathname === '/api/admin/login') {
    if (!rateLimit(req, 'login', 10, 600000)) {
      throw new AppError(429, 'محاولات دخول كثيرة، انتظر قليلاً');
    }
    const b = await readBody(req);
    const token = createSession(b.password);
    return json(res, 200, { token });
  }

  if (!pathname.startsWith('/api/admin/')) return false;

  requireAdmin(req);

  if (method === 'POST' && pathname === '/api/admin/logout') {
    revokeSession(req);
    return json(res, 200, { ok: true });
  }

  if (method === 'GET' && pathname === '/api/admin/bootstrap') {
    return json(res, 200, {
      products: productRepo.findAll(),
      orders: orderRepo.findAll(),
      customers: customerRepo.findAllWithStats(),
      coupons: couponRepo.findAll(),
      expenses: expenseRepo.findAll(),
      settings: settingsRepo.get(),
      governorates: GOVERNORATES,
    });
  }

  if (method === 'POST' && pathname === '/api/admin/products') {
    const b = await readBody(req);
    const p = cleanProduct(b);
    if (!p.name) throw new AppError(400, 'اسم المنتج مطلوب');
    return json(res, 201, productRepo.create(p));
  }

  const invMatch = pathname.match(/^\/api\/admin\/products\/(\d+)\/inventory$/);
  if (invMatch && method === 'PATCH') {
    const id = Number(invMatch[1]);
    const b = await readBody(req);
    const updated = productRepo.updateInventory(id, b);
    if (!updated) throw new AppError(404, 'المنتج غير موجود');
    return json(res, 200, updated);
  }

  const prodMatch = pathname.match(/^\/api\/admin\/products\/(\d+)$/);
  if (prodMatch) {
    const id = Number(prodMatch[1]);
    if (method === 'PUT') {
      const b = await readBody(req);
      const p = cleanProduct(b);
      if (!p.name) throw new AppError(400, 'اسم المنتج مطلوب');
      const updated = productRepo.update(id, p);
      if (!updated) throw new AppError(404, 'المنتج غير موجود');
      return json(res, 200, updated);
    }
    if (method === 'DELETE') {
      productRepo.remove(id);
      return json(res, 200, { ok: true });
    }
  }

  const orderMatch = pathname.match(/^\/api\/admin\/orders\/(\d+)$/);
  if (orderMatch) {
    const id = Number(orderMatch[1]);
    if (method === 'PATCH') {
      const b = await readBody(req);
      const status = String(b.status || '');
      if (!ORDER_STATUSES.includes(status)) throw new AppError(400, 'حالة غير صالحة');
      if (!orderRepo.updateStatus(id, status)) throw new AppError(404, 'الطلب غير موجود');
      return json(res, 200, { ok: true, status });
    }
    if (method === 'DELETE') {
      orderRepo.remove(id);
      return json(res, 200, { ok: true });
    }
  }

  if (method === 'POST' && pathname === '/api/admin/coupons') {
    const b = await readBody(req);
    if (!String(b.code || '').trim()) throw new AppError(400, 'كود الخصم مطلوب');
    try {
      return json(res, 201, couponRepo.create(b));
    } catch {
      throw new AppError(400, 'كود الخصم مستخدم مسبقاً');
    }
  }

  const couponMatch = pathname.match(/^\/api\/admin\/coupons\/(\d+)$/);
  if (couponMatch) {
    const id = Number(couponMatch[1]);
    if (method === 'PATCH') {
      const b = await readBody(req);
      return json(res, 200, couponRepo.toggle(id, !!b.active));
    }
    if (method === 'DELETE') {
      couponRepo.remove(id);
      return json(res, 200, { ok: true });
    }
  }

  if (method === 'POST' && pathname === '/api/admin/expenses') {
    const b = await readBody(req);
    if (!String(b.title || '').trim()) throw new AppError(400, 'وصف المصروف مطلوب');
    return json(res, 201, expenseRepo.create(b));
  }

  const expMatch = pathname.match(/^\/api\/admin\/expenses\/(\d+)$/);
  if (expMatch && method === 'DELETE') {
    expenseRepo.remove(Number(expMatch[1]));
    return json(res, 200, { ok: true });
  }

  if (method === 'PUT' && pathname === '/api/admin/settings') {
    const b = await readBody(req);
    return json(res, 200, settingsRepo.update(b));
  }

  throw new AppError(404, 'مسار غير موجود');
}

module.exports = { handleAdminRoutes };
