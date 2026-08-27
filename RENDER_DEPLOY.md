# نشر بطل قصتي على Render

هذه النسخة مستقلة عن بيئة التطوير السابقة. تستخدم خدمة Node واحدة لتقديم الموقع وواجهة طلبات tRPC، وقاعدة PostgreSQL لحفظ طلبات بدء المحادثة، وWebhook اختياري في Discord لتنبيه المالك. لا تضع أي قيمة سرية داخل المستودع؛ أضفها من صفحة **Environment** في Render.

## الخدمات المطلوبة

| الخدمة | الغرض | الإعداد |
|---|---|---|
| Render Web Service | الموقع والخادم | الخدمة تعرفها `render.yaml` باسم `batal-story` وتعمل على الخطة المجانية |
| Render Postgres | حفظ طلبات بدء المحادثة | يعرّفها `render.yaml` باسم `batal-story-db` ويربط رابطها الداخلي تلقائياً بـ`DATABASE_URL` |
| Discord Webhook | تنبيه فوري للمالك | أضف رابط الويب هوك في `DISCORD_WEBHOOK_URL` |

## خطوات النشر

1. اربط المستودع `AbuSalehBinshaq/p6fq` بحساب Render ثم استورد `render.yaml` بوصفه Blueprint.
2. راجع أن منطقة الخدمتين هي Frankfurt وأن الخطة المحددة **Free** قبل الإنشاء. يربط Blueprint رابط قاعدة البيانات الداخلي تلقائياً، فلا تنسخه إلى Git أو إلى ملف محلي.
3. أضف `DISCORD_WEBHOOK_URL` من صفحة **Environment** إن كنت تريد التنبيه الفوري؛ هذه القيمة سرية ولا تُحفظ في المستودع.
4. تنفّذ الخدمة ترحيل `pnpm db:migrate:render` تلقائياً عند كل تشغيل، ثم افتح `/health` للتحقق من أن الخادم يعمل.
5. جرّب نموذج بداية المحادثة من متصفح فعلي وتأكد من وصوله إلى قاعدة البيانات وإشعار Discord إن كان مضبوطاً.

> لا تستخدم `DATABASE_SSL=true` مع رابط Render الداخلي؛ اتركه `false`. لا تستخدم قيمة `DATABASE_URL` العامة إلا عند الحاجة إلى وصول خارجي، وعندها فعّل TLS وفق تعليمات مزود القاعدة.

> الخطة المجانية مناسبة لاختبار الإطلاق فقط. قاعدة PostgreSQL المجانية التي أنشأها Render تنتهي صلاحيتها بعد 30 يوماً ما لم تُرقّى إلى خطة مدفوعة، لذا يلزم اتخاذ قرار ترقية واضح قبل الاعتماد عليها كتشغيل تجاري مستمر.

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
