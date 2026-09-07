# نشر بطل قصتي على Render

هذه النسخة مستقلة عن بيئة التطوير السابقة. تستخدم خدمة Node واحدة لتقديم الموقع وواجهة طلبات tRPC، وقاعدة Neon PostgreSQL لحفظ طلبات بدء المحادثة، وWebhook اختياري في Discord لتنبيه المالك. لا تضع أي قيمة سرية داخل المستودع؛ أضفها من صفحة **Environment** في Render.

## الخدمات المطلوبة

| الخدمة | الغرض | الإعداد |
|---|---|---|
| Render Web Service | الموقع والخادم | الخدمة تعرفها `render.yaml` باسم `batal-story` وتعمل على الخطة المجانية |
| Neon PostgreSQL | حفظ طلبات بدء المحادثة | مشروع Neon مستقل؛ يضاف رابط الاتصال المشفّر منه إلى `DATABASE_URL` في Render |
| Discord Webhook | تنبيه فوري للمالك | أضف رابط الويب هوك في `DISCORD_WEBHOOK_URL` |

## خطوات النشر

1. اربط المستودع `AbuSalehBinshaq/p6fq` بحساب Render ثم استورد `render.yaml` بوصفه Blueprint.
2. أنشئ مشروع Neon مستقل، ثم انسخ رابط الاتصال من Neon إلى `DATABASE_URL` في Render فقط. لا تضع الرابط في Git أو ملف محلي.
3. اترك `DATABASE_SSL=true` لأن Neon يفرض اتصال PostgreSQL مشفّراً، ثم أضف `DISCORD_WEBHOOK_URL` من صفحة **Environment** للتنبيه الفوري.
4. تنفّذ الخدمة ترحيل قاعدة البيانات تلقائياً عند كل تشغيل، ثم افتح `/health` للتحقق من أن الخادم يعمل.
5. جرّب نموذج بداية المحادثة من متصفح فعلي وتأكد من وصوله إلى قاعدة البيانات وإشعار Discord إن كان مضبوطاً.

> رابط Neon خارجي ومشفّر؛ لذلك يبقى `DATABASE_SSL=true`. احتفظ بالرابط في متغيرات بيئة Render فقط ولا تشاركه في رسائل أو ملفات عامة.

> الخطة المجانية لخدمة Render مناسبة لاختبار الإطلاق، وقد تستغرق وقتاً قصيراً للاستيقاظ بعد الخمول. قاعدة Neon لا تعتمد على قاعدة Render التجريبية؛ تزال تلك القاعدة بعد تأكيد عمل Neon.

## أوامر Render

| الحقل | القيمة |
|---|---|
| Build Command | `pnpm install --frozen-lockfile && pnpm build:render` |
| Start Command | `pnpm start:render` |
| Health Check | `/health` |
| Node | `22` |

## ملاحظة انتقال مهمة

لوحة الطلبات التي كانت مرتبطة بتسجيل دخول البيئة السابقة غير مشمولة في نسخة Render. الموقع العام ومسار طلب بدء المحادثة يعملان باستقلالية. إن احتجت لوحة طلبات محمية على Render، نضيف تسجيل دخول مستقل في مرحلة تالية.

## المراجع

[1] [Render Web Services](https://render.com/docs/web-services)

[2] [Render Environment Variables and Secrets](https://render.com/docs/configure-environment-variables)

[3] [Render Blueprint YAML Reference](https://render.com/docs/blueprint-spec)
