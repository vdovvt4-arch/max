const { db } = require('../database');
const { parseJsonSafe } = require('../../utils/http');

function mapOrder(r) {
  if (!r) return null;
  const items = parseJsonSafe(r.items, []);
  return {
    ...r,
    cost_total: Number(r.cost_total || 0),
    profit: Number(r.profit || 0),
    measurements: parseJsonSafe(r.measurements, {}),
    items: items.length ? items : [{
      product_id: r.product_id,
      product_name: r.product_name,
      size: r.size,
      color: r.color,
      qty: 1,
      price: r.price,
      cost_price: 0,
    }],
  };
}

function findAll() {
  return db.prepare('SELECT * FROM orders ORDER BY id DESC').all().map(mapOrder);
}

function findByPhone(phone) {
  return db.prepare(`
    SELECT id, product_name, size, color, items, governorate, coupon_code, discount_amount, price, delivery_fee, total, status, created_at
    FROM orders
    WHERE phone=?
    ORDER BY id DESC
    LIMIT 20
  `).all(phone).map(mapOrder);
}

function create(order) {
  const r = db.prepare(`
    INSERT INTO orders(product_id, product_name, size, color, items, customer_name, phone, governorate, address, measurements, sketch, note, coupon_code, discount_amount, price, cost_total, profit, delivery_fee, total)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    order.product_id,
    order.product_name,
    order.size,
    order.color,
    order.items,
    order.customer_name,
    order.phone,
    order.governorate,
    order.address,
    order.measurements,
    order.sketch,
    order.note,
    order.coupon_code || '',
    Number(order.discount_amount || 0),
    order.price,
    Number(order.cost_total || 0),
    Number(order.profit || 0),
    order.delivery_fee,
    order.total
  );
  return Number(r.lastInsertRowid);
}

function updateStatus(id, status) {
  const r = db.prepare('UPDATE orders SET status=? WHERE id=?').run(status, id);
  return r.changes > 0;
}

function remove(id) {
  const r = db.prepare('DELETE FROM orders WHERE id=?').run(id);
  return r.changes > 0;
}

module.exports = { findAll, findByPhone, create, updateStatus, remove };
