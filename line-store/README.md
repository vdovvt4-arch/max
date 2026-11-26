# متجر أزياء لاين الرجالية (LINE Store)

متجر إلكتروني متكامل لمحل ملابس رجالية، مبني بهيكلة طبقية نظيفة بـ Node.js وSQLite المدمج بدون أي مكتبات خارجية.

## المتطلبات
- **Node.js 22.13+** (لاستخدام `node:sqlite` المدمج).

## التشغيل المحلي
1. (اختياري) انسخ `.env.example` إلى `.env` وعدّل كلمة المرور والمنفذ:
   ```powershell
   Copy-Item .env.example .env
   ```
2. شغّل الخادم:
   ```powershell
   node server.js
   ```
3. افتح المتصفح:
   - **المتجر:** `http://localhost:3000`
   - **لوحة الإدارة:** `http://localhost:3000/admin` (كلمة المرور الافتراضية: `line2026`)
   - **فحص صحة الخادم:** `http://localhost:3000/api/health`

## النشر على GitHub والربط بسيرفر مجاني (Render.com)
المشروع جاهز للنشر ومرفق معه ملف [`render.yaml`](render.yaml):

1. **رفع المشروع على GitHub:**
   - أنشئ مستودعاً جديداً (New Repository) على حسابك في [GitHub](https://github.com/new).
   - ارفع ملفات المشروع (أو استخدم Git):
     ```powershell
     git init
     git add .
     git commit -m "Initial commit - LINE Store"
     git branch -M main
     git remote add origin https://github.com/USERNAME/line-store.git
     git push -u origin main
     ```
     *(لا ترفع ملفات `line.db` أو `.env` — وهي مستثناة تلقائياً في `.gitignore`).*

2. **الربط بسيرفر مجاني على Render:**
   - سجّل الدخول في [Render](https://render.com) بحساب GitHub.
   - اختر **New +** ← **Blueprint** (أو **Web Service**)، واختر مستودع `line-store`.
   - سيتعرف Render تلقائياً على `render.yaml` (`NODE_VERSION=22.14.0`، وأمر التشغيل `node server.js`، وفحص الصحة `/api/health`).
   - أضف متغير البيئة `ADMIN_PASSWORD` بكلمة مرور قوية من لوحة Render.

> **ملاحظة مهمة للخطة المجانية:** في خطة Render المجانية لا يوجد قرص تخزين دائم، لذا أي بيانات تُحفظ في `line.db` قد تُعاد عند إعادة تشغيل/تحديث السيرفر. لحفظ البيانات بشكل دائم يمكن ربط Persistent Disk أو استخدام قاعدة بيانات خارجية لاحقاً.
