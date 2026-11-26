const { db } = require('../database');

const VALID_CATEGORIES = ['rent', 'electricity', 'salary', 'marketing', 'other'];

function findAll() {
  return db.prepare('SELECT * FROM expenses ORDER BY expense_date DESC, id DESC').all();
}

function create(b) {
  const title = String(b.title || '').trim().slice(0, 120);
  const category = VALID_CATEGORIES.includes(b.category) ? b.category : 'other';
  const amount = Math.max(0, Number(b.amount) || 0);
  const note = String(b.note || '').trim().slice(0, 300);
  const expense_date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.expense_date || ''))
    ? b.expense_date
    : new Date().toISOString().slice(0, 10);

  const r = db.prepare(`
    INSERT INTO expenses (title, category, amount, note, expense_date)
    VALUES (?, ?, ?, ?, ?)
  `).run(title, category, amount, note, expense_date);

  return db.prepare('SELECT * FROM expenses WHERE id=?').get(Number(r.lastInsertRowid));
}

function remove(id) {
  const r = db.prepare('DELETE FROM expenses WHERE id=?').run(id);
  return r.changes > 0;
}

module.exports = { findAll, create, remove, VALID_CATEGORIES };
