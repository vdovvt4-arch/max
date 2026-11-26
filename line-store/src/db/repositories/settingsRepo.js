const { db } = require('../database');
const { DEFAULT_SETTINGS, GOVERNORATES } = require('../../config');
const { parseJsonSafe } = require('../../utils/http');

function cleanColor(val, fallback) {
  return /^#[0-9a-fA-F]{6}$/.test(String(val || '').trim()) ? String(val).trim() : fallback;
}

function cleanSlides(arr) {
  if (!Array.isArray(arr)) return null;
  return arr.slice(0, 8).map(s => ({
    title: String(s?.title || '').trim().slice(0, 100),
    subtitle: String(s?.subtitle || '').trim().slice(0, 200),
    badge: String(s?.badge || '').trim().slice(0, 40),
    image: typeof s?.image === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(s.image) && s.image.length < 2e6
      ? s.image
      : '',
  })).filter(s => s.title || s.subtitle || s.image);
}

function get() {
  const row = db.prepare("SELECT value FROM settings WHERE key='store'").get();
  if (!row) return { ...DEFAULT_SETTINGS };
  const parsed = parseJsonSafe(row.value, null);
  if (!parsed) return { ...DEFAULT_SETTINGS };
  return {
    ...DEFAULT_SETTINGS,
    ...parsed,
    delivery: { ...DEFAULT_SETTINGS.delivery, ...(parsed.delivery || {}) },
  };
}

function update(b) {
  const cur = get();
  const delivery = { ...cur.delivery };
  if (b.delivery && typeof b.delivery === 'object') {
    for (const g of GOVERNORATES) {
      if (g in b.delivery) delivery[g] = Math.max(0, Number(b.delivery[g]) || 0);
    }
  }

  const next = {
    name: String(b.name ?? cur.name).trim().slice(0, 80) || DEFAULT_SETTINGS.name,
    logo_text: String(b.logo_text ?? cur.logo_text).trim().slice(0, 12) || DEFAULT_SETTINGS.logo_text,
    tagline: String(b.tagline ?? cur.tagline).trim().slice(0, 120),
    currency: String(b.currency ?? cur.currency).trim().slice(0, 15) || DEFAULT_SETTINGS.currency,
    phone: String(b.phone ?? cur.phone).trim().slice(0, 30),
    whatsapp: String(b.whatsapp ?? cur.whatsapp).trim().slice(0, 30),
    address: String(b.address ?? cur.address).trim().slice(0, 200),
    hours: String(b.hours ?? cur.hours).trim().slice(0, 120),
    footer_note: String(b.footer_note ?? cur.footer_note).trim().slice(0, 200),
    announce: String(b.announce ?? cur.announce).trim().slice(0, 200),
    show_announce: b.show_announce !== undefined ? !!b.show_announce : cur.show_announce,
    hero_title: String(b.hero_title ?? cur.hero_title).trim().slice(0, 100),
    hero_subtitle: String(b.hero_subtitle ?? cur.hero_subtitle).trim().slice(0, 200),
    show_hero: b.show_hero !== undefined ? !!b.show_hero : cur.show_hero,
    show_slider: b.show_slider !== undefined ? !!b.show_slider : cur.show_slider,
    slides: cleanSlides(b.slides) ?? cur.slides ?? [],
    default_theme: ['dark', 'light'].includes(b.default_theme) ? b.default_theme : cur.default_theme,
    accent_1: cleanColor(b.accent_1, cur.accent_1),
    accent_2: cleanColor(b.accent_2, cur.accent_2),
    card_radius: [8, 18, 28].includes(Number(b.card_radius)) ? Number(b.card_radius) : cur.card_radius,
    grid_cols: ['auto', '2', '3', '4'].includes(String(b.grid_cols)) ? String(b.grid_cols) : cur.grid_cols,
    show_size_chart: b.show_size_chart !== undefined ? !!b.show_size_chart : cur.show_size_chart,
    show_stock: b.show_stock !== undefined ? !!b.show_stock : cur.show_stock,
    hide_sold_out: b.hide_sold_out !== undefined ? !!b.hide_sold_out : cur.hide_sold_out,
    enable_cart: b.enable_cart !== undefined ? !!b.enable_cart : cur.enable_cart,
    enable_track: b.enable_track !== undefined ? !!b.enable_track : cur.enable_track,
    free_delivery_over: Math.max(0, Number(b.free_delivery_over ?? cur.free_delivery_over) || 0),
    min_order_amount: Math.max(0, Number(b.min_order_amount ?? cur.min_order_amount) || 0),
    instagram: String(b.instagram ?? cur.instagram).trim().slice(0, 200),
    tiktok: String(b.tiktok ?? cur.tiktok).trim().slice(0, 200),
    delivery,
  };

  db.prepare(`
    INSERT INTO settings(key, value) VALUES('store', ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value
  `).run(JSON.stringify(next));

  return next;
}

module.exports = { get, update };
