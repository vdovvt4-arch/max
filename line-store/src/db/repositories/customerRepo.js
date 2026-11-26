const { db } = require('../database');

function findByPhone(phone) {
  return db.prepare('SELECT phone, name, governorate, address FROM customers WHERE phone=?').get(phone) || null;
}

function upsert({ phone, name, governorate, address }) {
  db.prepare(`
    INSERT INTO customers(phone, name, governorate, address) VALUES(?, ?, ?, ?)
    ON CONFLICT(phone) DO UPDATE SET
      name=excluded.name,
      governorate=excluded.governorate,
      address=excluded.address
  `).run(phone, name, governorate, address);
}

function findAllWithStats() {
  return db.prepare(`
    SELECT c.*, COUNT(o.id) AS orders_count,
           COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total ELSE 0 END), 0) AS total_spent
    FROM customers c
    LEFT JOIN orders o ON o.phone = c.phone
    GROUP BY c.phone
    ORDER BY c.created_at DESC
  `).all();
}

module.exports = { findByPhone, upsert, findAllWithStats };
