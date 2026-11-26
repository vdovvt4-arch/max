const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../..');

const GOVERNORATES = [
  'بغداد', 'البصرة', 'نينوى', 'أربيل', 'السليمانية', 'دهوك',
  'كركوك', 'ديالى', 'الأنبار', 'بابل', 'كربلاء', 'النجف',
  'واسط', 'صلاح الدين', 'ذي قار', 'المثنى', 'القادسية', 'ميسان',
];

const ORDER_STATUSES = ['new', 'confirmed', 'preparing', 'shipping', 'delivered', 'cancelled'];
const MEASUREMENT_KEYS = ['chest', 'waist', 'length', 'shoulder', 'sleeve'];

const DEFAULT_SETTINGS = {
  name: 'أزياء لاين الرجالية',
  logo_text: 'LINE',
  tagline: 'أناقة الرجل العصري | جودة وتفاصيل مميزة',
  currency: 'د.ع',
  phone: '07890277454',
  whatsapp: '07890277454',
  address: 'كربلاء - حي الحسين - خدمي مستشفى الحجة',
  hours: 'يومياً من 10 صباحاً إلى 10 مساءً',
  footer_note: 'جميع الحقوق محفوظة لمتجر أزياء لاين الرجالية',
  announce: 'تشكيلة الملابس الرجالية الجديدة ✨ استخدم كود LINE10 لخصم 10%',
  show_announce: true,
  hero_title: 'تشكيلة الموسم للرجال',
  hero_subtitle: 'بدلات رسمية، قمصان، بنطلونات، وتيشيرتات مختارة بعناية',
  show_hero: true,
  show_slider: true,
  slides: [
    {
      title: 'عروض البدلات الرسمية',
      subtitle: 'خصم 15% لفترة محدودة على أحدث القصات التركية',
      badge: 'خصم 15%',
      image: '',
    },
    {
      title: 'تشكيلة الصيف الرجالية',
      subtitle: 'قمصان كتان وتيشيرتات بولو بألوان عصرية',
      badge: 'وصل حديثاً',
      image: '',
    },
    {
      title: 'توصيل سريع لجميع المحافظات',
      subtitle: 'استخدم كود LINE10 واحصل على خصم إضافي 10%',
      badge: 'كود: LINE10',
      image: '',
    },
  ],
  default_theme: 'dark',
  accent_1: '#d4af37',
  accent_2: '#1f6feb',
  card_radius: 18,
  grid_cols: 'auto',
  show_size_chart: true,
  show_stock: true,
  hide_sold_out: false,
  enable_cart: true,
  enable_track: true,
  free_delivery_over: 0,
  min_order_amount: 0,
  instagram: 'https://www.instagram.com/l600.n',
  tiktok: 'https://www.tiktok.com/@linebrand',
  delivery: Object.fromEntries(GOVERNORATES.map(g => [g, g === 'كربلاء' ? 3000 : 5000])),
};

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

module.exports = {
  PORT: Number(process.env.PORT) || 3000,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'line2026',
  DB_PATH: path.resolve(ROOT_DIR, process.env.DB_PATH || 'line.db'),
  PUBLIC_DIR: path.join(ROOT_DIR, 'public'),
  SESSION_TTL_MS: Number(process.env.SESSION_TTL_MS) || 1000 * 60 * 60 * 12,
  MAX_BODY_BYTES: 15 * 1024 * 1024,
  GOVERNORATES,
  ORDER_STATUSES,
  MEASUREMENT_KEYS,
  DEFAULT_SETTINGS,
  MIME_TYPES,
};
