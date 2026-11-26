const productRepo = require('../db/repositories/productRepo');
const orderRepo = require('../db/repositories/orderRepo');
const customerRepo = require('../db/repositories/customerRepo');
const couponRepo = require('../db/repositories/couponRepo');
const settingsRepo = require('../db/repositories/settingsRepo');
const { rateLimit } = require('../middleware/rateLimit');
const { AppError, json, readBody } = require('../utils/http');
const { normPhone } = require('../utils/validators');

async function handlePublicRoutes(req, res, method, pathname, url) {
  if (method === 'GET' && pathname === '/api/health') {
    return json(res, 200, { ok: true, uptime: Math.round(process.uptime()) });
  }

  if (method === 'GET' && pathname === '/api/store') {
    const settings = settingsRepo.get();
    let products = productRepo.findPublished();
    if (settings.hide_sold_out) {
      products = products.filter(p => !p.sold_out);
    }
    return json(res, 200, { settings, products });
  }

  if (method === 'GET' && pathname === '/api/customer') {
    const phone = normPhone(url.searchParams.get('phone'));
    if (!phone) return json(res, 200, { found: false });
    const customer = customerRepo.findByPhone(phone);
    return json(res, 200, customer ? { found: true, ...customer } : { found: false });
  }

  if (method === 'GET' && pathname === '/api/orders/track') {
    const phone = normPhone(url.searchParams.get('phone'));
    if (!phone) throw new AppError(400, 'أدخل رقم هاتف صحيح (07xxxxxxxxx)');
    return json(res, 200, { orders: orderRepo.findByPhone(phone) });
  }

  if (method === 'GET' && pathname === '/api/coupons/check') {
    const code = url.searchParams.get('code');
    const subtotal = Math.max(0, Number(url.searchParams.get('subtotal')) || 0);
    const coupon = couponRepo.findByCode(code);
    if (!coupon || !coupon.active) {
      return json(res, 200, { valid: false, message: 'كود الخصم غير صالح أو متوقف' });
    }
    if (subtotal < Number(coupon.min_order || 0)) {
      return json(res, 200, { valid: false, message: `الحد الأدنى لاستخدام الكود هو ${coupon.min_order}` });
    }
    const discount = couponRepo.calculateDiscount(coupon, subtotal);
    return json(res, 200, {
      valid: true,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discount,
      message: `تم تطبيق كود ${coupon.code}`,
    });
  }

  if (method === 'POST' && pathname === '/api/orders') {
    if (!rateLimit(req, 'order', 10, 600000)) {
      throw new AppError(429, 'محاولات كثيرة، حاول بعد قليل');
    }

    const b = await readBody(req);
    const phone = normPhone(b.phone);
    if (!phone) throw new AppError(400, 'رقم الهاتف غير صحيح (مثال: 07xxxxxxxxx)');

    const name = String(b.name || '').trim();
    if (name.length < 2) throw new AppError(400, 'الرجاء كتابة الاسم');

    const settings = settingsRepo.get();
    const gov = String(b.governorate || '');
    if (!(gov in settings.delivery)) throw new AppError(400, 'اختر المحافظة');

    const address = String(b.address || '').trim();
    if (!address) throw new AppError(400, 'الرجاء كتابة العنوان');

    const rawItems = Array.isArray(b.items) && b.items.length
      ? b.items.slice(0, 20)
      : [{ product_id: b.product_id, size: b.size, color: b.color, qty: b.qty || 1 }];

    const verifiedItems = [];
    let subtotal = 0;
    let costTotal = 0;

    for (const item of rawItems) {
      const product = productRepo.findPublishedById(Number(item.product_id));
      if (!product) throw new AppError(404, 'أحد المنتجات غير متوفر حالياً');
      if (product.sold_out || product.stock <= 0) {
        throw new AppError(400, `المنتج غير متوفر حالياً: ${product.name}`);
      }

      const qty = Math.min(20, Math.max(1, parseInt(item.qty, 10) || 1));
      const size = String(item.size || '');
      if (product.sizes.length) {
        const sizeObj = product.sizes.find(s => s.size === size);
        if (!sizeObj) throw new AppError(400, `اختر القياس للمنتج: ${product.name}`);
        if (sizeObj.stock <= 0) throw new AppError(400, `القياس (${size}) غير متوفر حالياً من: ${product.name}`);
        if (qty > sizeObj.stock) {
          throw new AppError(400, `الكمية المتوفرة للقياس (${size}) من "${product.name}" هي ${sizeObj.stock} فقط`);
        }
      } else if (qty > product.stock) {
        throw new AppError(400, `الكمية المتوفرة من "${product.name}" هي ${product.stock} فقط`);
      }

      const color = String(item.color || '');
      if (product.colors.length && !product.colors.includes(color)) {
        throw new AppError(400, `اختر اللون للمنتج: ${product.name}`);
      }

      subtotal += product.final_price * qty;
      costTotal += (Number(product.cost_price) || 0) * qty;
      verifiedItems.push({
        product_id: product.id,
        product_name: product.name,
        size,
        color,
        qty,
        price: product.final_price,
        cost_price: Number(product.cost_price) || 0,
      });
    }

    if (settings.min_order_amount > 0 && subtotal < settings.min_order_amount) {
      throw new AppError(400, `الحد الأدنى للطلب هو ${settings.min_order_amount} ${settings.currency}`);
    }

    let couponCode = '';
    let discountAmount = 0;
    let usedCouponId = null;
    if (b.coupon_code) {
      const coupon = couponRepo.findByCode(b.coupon_code);
      if (!coupon || !coupon.active) throw new AppError(400, 'كود الخصم غير صالح أو متوقف');
      if (subtotal < Number(coupon.min_order || 0)) {
        throw new AppError(400, `الحد الأدنى لاستخدام الكود هو ${coupon.min_order} ${settings.currency}`);
      }
      couponCode = coupon.code;
      discountAmount = couponRepo.calculateDiscount(coupon, subtotal);
      usedCouponId = coupon.id;
    }

    const afterDiscount = Math.max(0, subtotal - discountAmount);
    const orderProfit = afterDiscount - costTotal;
    let fee = Number(settings.delivery[gov]) || 0;
    if (settings.free_delivery_over > 0 && afterDiscount >= settings.free_delivery_over) {
      fee = 0;
    }
    const total = afterDiscount + fee;

    const first = verifiedItems[0];
    const summaryName = verifiedItems.length > 1
      ? `${first.product_name} (+${verifiedItems.length - 1} منتجات)`
      : first.product_name;

    customerRepo.upsert({ phone, name, governorate: gov, address });

    const id = orderRepo.create({
      product_id: first.product_id,
      product_name: summaryName,
      size: first.size,
      color: first.color,
      items: JSON.stringify(verifiedItems),
      customer_name: name,
      phone,
      governorate: gov,
      address,
      measurements: '{}',
      sketch: '',
      note: String(b.note || '').trim().slice(0, 500),
      coupon_code: couponCode,
      discount_amount: discountAmount,
      price: subtotal,
      cost_total: costTotal,
      profit: orderProfit,
      delivery_fee: fee,
      total,
    });

    for (const item of verifiedItems) {
      productRepo.decrementStock(item.product_id, item.qty, item.size);
    }
    if (usedCouponId) couponRepo.incrementUses(usedCouponId);

    return json(res, 201, {
      id,
      price: subtotal,
      discount_amount: discountAmount,
      delivery_fee: fee,
      total,
      items: verifiedItems,
    });
  }

  return false;
}

module.exports = { handlePublicRoutes };
