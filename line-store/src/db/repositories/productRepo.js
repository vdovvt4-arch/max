const { db } = require('../database');
const { parseJsonSafe } = require('../../utils/http');
const { finalPrice } = require('../../utils/validators');

function mapProduct(r) {
  if (!r) return null;
  const rawSizes = parseJsonSafe(r.sizes, []);
  const sizes = rawSizes.map(s => ({
    ...s,
    stock: s.stock !== undefined ? Math.max(0, Number(s.stock) || 0) : Math.max(0, Number(r.stock ?? 0)),
  }));
  const stock = sizes.length
    ? sizes.reduce((sum, s) => sum + s.stock, 0)
    : Math.max(0, Number(r.stock ?? 0));
  const low = Math.max(0, Number(r.low_stock_threshold ?? 3));
  const soldOut = !!r.sold_out || stock <= 0;
  const fp = finalPrice(r);
  const cost = Math.max(0, Number(r.cost_price ?? 0));
  const unitProfit = fp - cost;
  return {
    ...r,
    cost_price: cost,
    stock,
    low_stock_threshold: low,
    published: !!r.published,
    sold_out: soldOut,
    available: !soldOut,
    low_stock: !soldOut && stock <= low,
    colors: parseJsonSafe(r.colors, []),
    sizes,
    images: parseJsonSafe(r.images, []),
    final_price: fp,
    unit_profit: unitProfit,
  };
}

function findPublished() {
  return db.prepare('SELECT * FROM products WHERE published=1 ORDER BY id DESC').all().map(mapProduct);
}

function findAll() {
  return db.prepare('SELECT * FROM products ORDER BY id DESC').all().map(mapProduct);
}

function findPublishedById(id) {
  return mapProduct(db.prepare('SELECT * FROM products WHERE id=? AND published=1').get(id));
}

function findById(id) {
  return mapProduct(db.prepare('SELECT * FROM products WHERE id=?').get(id));
}

function create(p) {
  const r = db.prepare(`
    INSERT INTO products (name, category, description, price, cost_price, discount_type, discount_value, stock, low_stock_threshold, colors, sizes, images, published, sold_out)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    p.name, p.category, p.description, p.price, p.cost_price, p.discount_type, p.discount_value,
    p.stock, p.low_stock_threshold, p.colors, p.sizes, p.images, p.published, p.sold_out
  );
  return findById(Number(r.lastInsertRowid));
}

function update(id, p) {
  const existing = db.prepare('SELECT id FROM products WHERE id=?').get(id);
  if (!existing) return null;

  db.prepare(`
    UPDATE products
    SET name=?, category=?, description=?, price=?, cost_price=?, discount_type=?, discount_value=?, stock=?, low_stock_threshold=?, colors=?, sizes=?, images=?, published=?, sold_out=?
    WHERE id=?
  `).run(
    p.name, p.category, p.description, p.price, p.cost_price, p.discount_type, p.discount_value,
    p.stock, p.low_stock_threshold, p.colors, p.sizes, p.images, p.published, p.sold_out, id
  );
  return findById(id);
}

function updateInventory(id, patch) {
  const cur = findById(id);
  if (!cur) return null;

  const stock = patch.stock !== undefined ? Math.max(0, parseInt(patch.stock, 10) || 0) : cur.stock;
  const low = patch.low_stock_threshold !== undefined ? Math.max(0, parseInt(patch.low_stock_threshold, 10) || 0) : cur.low_stock_threshold;
  let soldOut = patch.sold_out !== undefined ? (patch.sold_out ? 1 : 0) : (cur.sold_out ? 1 : 0);
  if (stock <= 0) soldOut = 1;
  else if (patch.stock !== undefined && patch.sold_out === undefined && cur.stock === 0 && stock > 0) soldOut = 0;

  const discountType = patch.discount_type !== undefined
    ? (['percent', 'fixed'].includes(patch.discount_type) ? patch.discount_type : 'none')
    : cur.discount_type;
  const discountValue = patch.discount_value !== undefined
    ? Math.max(0, Number(patch.discount_value) || 0)
    : cur.discount_value;

  db.prepare(`
    UPDATE products
    SET stock=?, low_stock_threshold=?, sold_out=?, discount_type=?, discount_value=?
    WHERE id=?
  `).run(stock, low, soldOut, discountType, discountValue, id);

  return findById(id);
}

function decrementStock(id, qty, size = '') {
  const cur = db.prepare('SELECT stock, sizes FROM products WHERE id=?').get(id);
  if (!cur) return;

  const sizes = parseJsonSafe(cur.sizes, []);
  if (sizes.length && size) {
    let changed = false;
    for (const s of sizes) {
      if (s.size === size) {
        const curSz = s.stock !== undefined ? Number(s.stock) : Number(cur.stock || 0);
        s.stock = Math.max(0, curSz - qty);
        changed = true;
      }
    }
    if (changed) {
      const nextTotal = sizes.reduce((sum, s) => sum + Math.max(0, Number(s.stock ?? 0)), 0);
      db.prepare('UPDATE products SET sizes=?, stock=?, sold_out=CASE WHEN ? <= 0 THEN 1 ELSE sold_out END WHERE id=?')
        .run(JSON.stringify(sizes), nextTotal, nextTotal, id);
      return;
    }
  }

  const next = Math.max(0, Number(cur.stock || 0) - qty);
  db.prepare('UPDATE products SET stock=?, sold_out=CASE WHEN ? <= 0 THEN 1 ELSE sold_out END WHERE id=?')
    .run(next, next, id);
}

function remove(id) {
  const r = db.prepare('DELETE FROM products WHERE id=?').run(id);
  return r.changes > 0;
}

module.exports = {
  findPublished, findAll, findPublishedById, findById,
  create, update, updateInventory, decrementStock, remove,
};
