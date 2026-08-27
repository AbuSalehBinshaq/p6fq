# نشر بطل قصتي على Render

هذه النسخة مستقلة عن بيئة التطوير السابقة. تستخدم خدمة Node واحدة لتقديم الموقع وواجهة طلبات tRPC، وقاعدة PostgreSQL لحفظ طلبات بدء المحادثة، وWebhook اختياري في Discord لتنبيه المالك. لا تضع أي قيمة سرية داخل المستودع؛ أضفها من صفحة **Environment** في Render.

## الخدمات المطلوبة

| الخدمة | الغرض | الإعداد |
|---|---|---|
| Render Web Service | الموقع والخادم | الخدمة تعرفها `render.yaml` باسم `batal-story` |
| Render Postgres | حفظ طلبات بدء المحادثة | أنشئها في المنطقة نفسها وانسخ **Internal Database URL** إلى `DATABASE_URL` |
| Discord Webhook | تنبيه فوري للمالك | أضف رابط الويب هوك في `DISCORD_WEBHOOK_URL` |

## خطوات النشر

1. ارفع هذا المجلد إلى مستودع GitHub خاص، ثم اربط المستودع بحساب Render.
2. من Render أنشئ **PostgreSQL** في منطقة Frankfurt، ثم أنشئ **Web Service** من المستودع أو استورد `render.yaml` كـ Blueprint.
3. أضف `DATABASE_URL` باستخدام رابط قاعدة البيانات الداخلي، ثم أضف `DISCORD_WEBHOOK_URL` إن كنت تريد التنبيه الفوري.
4. من Shell الخدمة شغّل `pnpm db:migrate:render` مرة واحدة، ثم افتح `/health` للتحقق من أن الخادم يعمل.
5. جرّب نموذج بداية المحادثة من متصفح فعلي وتأكد من وصوله إلى قاعدة البيانات وإشعار Discord.

> لا تستخدم `DATABASE_SSL=true` مع رابط Render الداخلي؛ اتركه `false`. لا تستخدم قيمة `DATABASE_URL` العامة إلا عند الحاجة إلى وصول خارجي، وعندها فعّل TLS وفق تعليمات مزود القاعدة.

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
