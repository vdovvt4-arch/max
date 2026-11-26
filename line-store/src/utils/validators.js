const { MEASUREMENT_KEYS } = require('../config');

function normPhone(v) {
  let s = String(v || '')
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[\s-]/g, '');
  s = s.replace(/^\+?964/, '0');
  return /^07\d{9}$/.test(s) ? s : null;
}

function cleanMeasures(m) {
  const src = m && typeof m === 'object' ? m : {};
  return Object.fromEntries(MEASUREMENT_KEYS.map(k => [k, String(src[k] || '').trim().slice(0, 20)]));
}

function cleanSizes(arr) {
  return (Array.isArray(arr) ? arr : [])
    .filter(s => s && String(s.size || '').trim())
    .slice(0, 30)
    .map(s => ({
      ...Object.fromEntries(['size', ...MEASUREMENT_KEYS].map(k => [k, String(s[k] || '').trim().slice(0, 30)])),
      stock: Math.max(0, parseInt(s.stock ?? 5, 10) || 0),
    }));
}

function cleanProduct(b) {
  const colors = (Array.isArray(b.colors) ? b.colors : [])
    .map(c => String(c).trim())
    .filter(Boolean)
    .slice(0, 20);
  const images = (Array.isArray(b.images) ? b.images : [])
    .filter(i => typeof i === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(i) && i.length < 2e6)
    .slice(0, 6);

  const sizes = cleanSizes(b.sizes);
  const stock = sizes.length
    ? sizes.reduce((sum, s) => sum + s.stock, 0)
    : Math.max(0, parseInt(b.stock ?? 10, 10) || 0);
  const low_stock_threshold = Math.max(0, parseInt(b.low_stock_threshold ?? 3, 10) || 0);
  const sold_out = b.sold_out || stock <= 0 ? 1 : 0;

  return {
    name: String(b.name || '').trim().slice(0, 150),
    category: String(b.category || '').trim().slice(0, 60),
    description: String(b.description || '').trim().slice(0, 2000),
    price: Math.max(0, Number(b.price) || 0),
    cost_price: Math.max(0, Number(b.cost_price) || 0),
    discount_type: ['percent', 'fixed'].includes(b.discount_type) ? b.discount_type : 'none',
    discount_value: Math.max(0, Number(b.discount_value) || 0),
    stock,
    low_stock_threshold,
    colors: JSON.stringify(colors),
    sizes: JSON.stringify(sizes),
    images: JSON.stringify(images),
    published: b.published ? 1 : 0,
    sold_out,
  };
}

function finalPrice(p) {
  const price = Number(p.price) || 0;
  const v = Number(p.discount_value) || 0;
  if (p.discount_type === 'percent') return Math.max(0, Math.round(price * (1 - Math.min(v, 100) / 100)));
  if (p.discount_type === 'fixed') return Math.max(0, price - v);
  return price;
}

module.exports = { normPhone, cleanMeasures, cleanSizes, cleanProduct, finalPrice };
