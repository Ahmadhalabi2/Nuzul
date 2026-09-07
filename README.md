<div align="center">

# نُزُل — Nuzul

### منصة حجز الفنادق السورية

**React 18 + TypeScript · Laravel 11 · MySQL**

</div>

---

## نظرة عامة

نُزُل منصة متكاملة لحجز الفنادق السورية، تضم لوحة تحكم إدارية كاملة وتجربة مستخدم سلسة. المشروع مبني على فرونتاند React مع باكاند Laravel يوفر REST API موثوق.

---

## التقنيات

| الطبقة | التقنية |
|--------|---------|
| Frontend | React 18، TypeScript، React Router v6 |
| State | Zustand |
| Charts | Recharts |
| Icons | Lucide React |
| Backend | Laravel 11 (PHP 8.2) |
| Auth | Laravel Sanctum (API Tokens) |
| Database | MySQL |
| Email | Laravel Mail + SMTP |
| AI Chatbot | Google Gemini API |

---

## هيكل المشروع

```
Nuzul/
├── src/                          # React Frontend
│   ├── components/
│   │   ├── HotelBookingFlow.tsx  # منطق الحجز الموحّد
│   │   ├── LiveBookingBar.tsx    # شريط الحجوزات الحية
│   │   ├── ChatbotWidget.tsx     # مساعد AI
│   │   ├── HotelFormModal.tsx    # نموذج إضافة/تعديل فندق
│   │   ├── RatingModal.tsx       # تقييم الفنادق
│   │   └── Layout.tsx            # الهيكل العام
│   ├── pages/
│   │   ├── home/
│   │   │   ├── HomePageUser.tsx  # الصفحة الرئيسية للمستخدم
│   │   │   └── HomePageAdmin.tsx # لوحة التحكم الإدارية
│   │   ├── hotels/               # إدارة الفنادق
│   │   ├── bookings/             # إدارة الحجوزات (أدمن)
│   │   ├── my-bookings/          # حجوزاتي (مستخدم)
│   │   ├── book-hotel/           # استكمال الحجز
│   │   ├── analytics/            # التحليلات والإحصائيات
│   │   ├── support/              # الدعم الفني
│   │   ├── notifications/        # الإشعارات
│   │   ├── users/                # إدارة المستخدمين
│   │   ├── revenue/              # الإيرادات
│   │   └── settings/             # الإعدادات
│   ├── services/
│   │   └── api.ts                # كل الـ API calls مركّزة
│   └── store/
│       └── authStore.ts          # حالة المصادقة
│
└── laravel-backend/              # Laravel API
    ├── app/
    │   ├── Http/Controllers/API/
    │   │   ├── AuthController.php
    │   │   ├── BookingController.php
    │   │   ├── HotelController.php
    │   │   ├── NotificationController.php
    │   │   ├── RatingController.php
    │   │   ├── SupportController.php
    │   │   ├── ChatbotController.php
    │   │   └── UploadController.php
    │   └── Models/
    ├── database/
    │   ├── migrations/
    │   └── seeders/
    └── routes/
        └── api.php
```

---

## الميزات

### المصادقة والأدوار
- تسجيل حساب جديد مع OTP عبر البريد الإلكتروني
- تسجيل دخول بـ Token (Laravel Sanctum)
- إعادة تعيين كلمة المرور عبر OTP

| الدور | الصلاحيات |
|-------|-----------|
| `superadmin` | لوحة التحكم الكاملة، إدارة الفنادق والحجوزات والمستخدمين، التحليلات |
| `user` | حجز الفنادق، متابعة الحجوزات، الدعم الفني، التقييمات |

### إدارة الحجوزات
- دورة حياة كاملة: `pending_admin` → `accepted` → `paid` → `completed`
- إشعار فوري للمستخدم عند كل تغيير بالحالة
- إرسال إيميل تأكيد HTML للمستخدم
- تصدير الحجوزات كـ CSV

### الفنادق
- إضافة وتعديل وحذف الفنادق مع رفع الصور
- فلترة حسب المحافظة والمدينة والسعر والتقييم
- عروض خاصة وتسعير مرن

### Live Social Proof
- شريط **نبضات الحجز** يعرض آخر الحجوزات المؤكدة في الوقت الفعلي
- يزيد الثقة ويحفز على الحجز الفوري

### الدعم الفني
- محادثات مباشرة بين المستخدمين والأدمن
- نظام Feedback للجلسات المنتهية

### مساعد AI
- Chatbot مدعوم بـ Google Gemini
- يجيب على أسئلة الحجز والفنادق

### التحليلات
- إحصائيات الإيرادات والحجوزات
- رسوم بيانية تفاعلية

---

## تشغيل المشروع محلياً

### المتطلبات
- Node.js 18+
- PHP 8.2+
- Composer
- MySQL

### الفرونتاند

```bash
npm install
npm start
```

### الباكاند

```bash
cd laravel-backend
composer install
cp .env.example .env
php artisan key:generate
# عدّل .env بمعلومات قاعدة البيانات والبريد
php artisan migrate --seed
php artisan serve
```

---

## متغيرات البيئة (laravel-backend/.env)

```env
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=nuzul
DB_USERNAME=root
DB_PASSWORD=

MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_FROM_NAME="نُزُل - Nuzul"

GEMINI_API_KEY=your_gemini_key

FRONTEND_URL=http://localhost:3000
```

---

## النشر

| الجزء | المنصة المقترحة |
|-------|----------------|
| Frontend | Vercel / Netlify |
| Backend | Railway / Render |
| Database | PlanetScale / Railway MySQL |

---

<div align="center">

صُنع بـ ❤️ لخدمة السياحة السورية

</div>
