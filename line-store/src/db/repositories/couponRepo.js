const { db } = require('../database');

function mapCoupon(r) {
  return r ? { ...r, active: !!r.active } : null;
}

function findAll() {
  return db.prepare('SELECT * FROM coupons ORDER BY id DESC').all().map(mapCoupon);
}

function findByCode(code) {
  const norm = String(code || '').trim().toUpperCase();
  if (!norm) return null;
  return mapCoupon(db.prepare('SELECT * FROM coupons WHERE UPPER(code)=?').get(norm));
}

function calculateDiscount(coupon, subtotal) {
  if (!coupon || !coupon.active) return 0;
  if (subtotal < Number(coupon.min_order || 0)) return 0;
  const val = Number(coupon.value || 0);
  if (coupon.type === 'percent') return Math.min(subtotal, Math.round(subtotal * (Math.min(val, 100) / 100)));
  if (coupon.type === 'fixed') return Math.min(subtotal, Math.max(0, val));
  return 0;
}

function create({ code, type, value, min_order, active }) {
  const norm = String(code || '').trim().toUpperCase().slice(0, 30);
  const t = ['percent', 'fixed'].includes(type) ? type : 'percent';
  const v = Math.max(0, Number(value) || 0);
  const min = Math.max(0, Number(min_order) || 0);
  const act = active ? 1 : 0;

  const r = db.prepare(`INSERT INTO coupons (code, type, value, min_order, active) VALUES (?, ?, ?, ?, ?)`)
    .run(norm, t, v, min, act);
  return mapCoupon(db.prepare('SELECT * FROM coupons WHERE id=?').get(Number(r.lastInsertRowid)));
}

function toggle(id, active) {
  db.prepare('UPDATE coupons SET active=? WHERE id=?').run(active ? 1 : 0, id);
  return mapCoupon(db.prepare('SELECT * FROM coupons WHERE id=?').get(id));
}

function incrementUses(id) {
  db.prepare('UPDATE coupons SET uses_count = uses_count + 1 WHERE id=?').run(id);
}

function remove(id) {
  const r = db.prepare('DELETE FROM coupons WHERE id=?').run(id);
  return r.changes > 0;
}

module.exports = { findAll, findByCode, calculateDiscount, create, toggle, incrementUses, remove };
