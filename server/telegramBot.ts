import { nanoid } from "nanoid";
import type { Request, Response } from "express";
import { createRenderConversationOrder, getRenderConversationOrderByReference, getTelegramConversation, migrateTelegramBotDatabase, saveTelegramConversation, type TelegramConversationRecord } from "./renderDb";
import { notifyRenderOwner } from "./renderNotify";
import { contactMethodLabels, formatChildAgeRange, type OrderStatus } from "../shared/orderFlow";

const TELEGRAM_API = "https://api.telegram.org";
const OWNER_ID = process.env.TELEGRAM_OWNER_ID?.trim() ?? "";
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
const RAW_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET?.trim() ?? "";
// Telegram accepts only A-Z, a-z, 0-9, _ and - in secret_token.
const WEBHOOK_SECRET = RAW_WEBHOOK_SECRET.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 256);
if (RAW_WEBHOOK_SECRET && RAW_WEBHOOK_SECRET !== WEBHOOK_SECRET) console.warn("[Telegram] Webhook secret contained unsupported characters; sanitized automatically.");
const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL?.trim() ?? "";

const stages = ["welcome", "collect_name", "collect_age", "collect_interest", "confirm", "human_mode", "awaiting_photo"] as const;
type BotStage = (typeof stages)[number];

interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

interface TelegramChat {
  id: number;
  type: string;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  text?: string;
  photo?: Array<{ file_id: string }>;
  document?: { file_id: string; file_name?: string };
  caption?: string;
  date: number;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

interface TelegramResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

type ReplyMarkup = {
  keyboard: Array<Array<{ text: string }>>;
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
  is_persistent?: boolean;
};

const mainKeyboard: ReplyMarkup = {
  keyboard: [[{ text: "أريد قصة لطفلي" }], [{ text: "كيف تعمل الخدمة؟" }, { text: "كم السعر؟" }], [{ text: "أشوف أمثلة" }, { text: "أريد موظفًا" }]],
  resize_keyboard: true,
};

const confirmKeyboard: ReplyMarkup = {
  keyboard: [[{ text: "نعم، ابدأ الطلب" }, { text: "أعدل البيانات" }], [{ text: "أريد موظفًا" }]],
  resize_keyboard: true,
  one_time_keyboard: true,
};

const contactKeyboard: ReplyMarkup = {
  keyboard: [[{ text: "أريد موظفًا" }], [{ text: "إلغاء" }]],
  resize_keyboard: true,
};

function isConfigured() {
  return Boolean(BOT_TOKEN && OWNER_ID);
}

function ownerChatId() {
  return OWNER_ID;
}

function displayName(message: TelegramMessage) {
  return [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" ") || "زائر تيليجرام";
}

function contactValue(conversation: TelegramConversationRecord) {
  return conversation.username ? `@${conversation.username}` : `tg:${conversation.chatId}`;
}

async function telegramCall<T>(method: string, body: Record<string, unknown>): Promise<T> {
  if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  const response = await fetch(`${TELEGRAM_API}/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json() as TelegramResponse<T>;
  if (!response.ok || !payload.ok) throw new Error(payload.description ?? `Telegram returned ${response.status}`);
  return payload.result as T;
}

async function sendMessage(chatId: string | number, text: string, replyMarkup?: ReplyMarkup) {
  return telegramCall("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup: replyMarkup,
    disable_web_page_preview: true,
  });
}

async function notifyOwner(text: string) {
  if (!OWNER_ID) return false;
  try {
    await sendMessage(OWNER_ID, text);
    return true;
  } catch (error) {
    console.error("[Telegram] Failed to notify owner:", error);
    return false;
  }
}

function helpText() {
  return [
    "أقدر أساعدك في معرفة الخدمة والسعر والأمثلة، أو أبدأ معك طلب قصة مخصصة.",
    "",
    "اختاري من الأزرار الموجودة، أو اكتبي «موظف» إذا تبين تتكلمين مع شخص مباشرة.",
  ].join("\n");
}

function serviceText() {
  return [
    "نجهز قصة عربية مخصصة باسم طفلك واهتمامه، وتصل كملف PDF جاهز للقراءة قبل النوم.",
    "",
    "نبدأ بفكرة بسيطة، نتفق على التفاصيل، ثم نطلب الصورة إذا احتجناها. تشوفين المعاينة قبل الدفع.",
  ].join("\n");
}

function priceText() {
  return [
    "الباقة الأساسية تبدأ من 17 د.إ وتشمل قصة PDF عربية مخصصة من 8 صفحات وغلافًا خاصًا.",
    "",
    "إذا رغبتِ بعدد صفحات أكبر أو إهداء أو تعديل إضافي، نوضح لك السعر قبل التنفيذ.",
  ].join("\n");
}

function examplesText() {
  return [
    "هذه أمثلة على الأسلوب والنتيجة:",
    "https://batal-story.onrender.com/#examples",
    "",
    "تقدرين تشوفين الصورة الأصلية ثم صفحات من القصة، وإذا أعجبك الأسلوب نبدأ فكرة طفلك.",
  ].join("\n");
}

function privacyText() {
  return "لا ترسلين صورة الطفل في البداية. نطلبها فقط بعد التفاهم المبدئي، ونستخدمها لإعداد القصة والمعاينة. لا نستخدمها للتسويق دون موافقة منفصلة.";
}

async function handoffToHuman(conversation: TelegramConversationRecord, reason = "طلب العميل التواصل مع موظف") {
  const updated = await saveTelegramConversation(conversation.chatId, {
    humanMode: true,
    stage: "human_mode",
    lastMessageAt: new Date(),
  });
  const summary = [
    "🔔 تحويل إلى موظف",
    `السبب: ${reason}`,
    `العميل: ${conversation.username ? `@${conversation.username}` : conversation.firstName}`,
    `المعرف: ${conversation.username ? `@${conversation.username}` : conversation.chatId}`,
    conversation.childName ? `اسم الطفل: ${conversation.childName}` : "اسم الطفل: لم يُجمع بعد",
    conversation.childAge ? `العمر: ${formatChildAgeRange(conversation.childAge)}` : "العمر: لم يُجمع بعد",
    conversation.childInterest ? `الاهتمام: ${conversation.childInterest}` : "الاهتمام: لم يُجمع بعد",
    "",
    `للرد استخدم: /reply ${conversation.chatId} نص الرد`,
  ].join("\n");
  await notifyOwner(summary);
  return updated;
}

async function createOrderFromConversation(conversation: TelegramConversationRecord) {
  if (!conversation.childName || !conversation.childAge || !conversation.childInterest) return null;
  const reference = `BS-${nanoid(7).toUpperCase()}`;
  await createRenderConversationOrder({
    reference,
    childName: conversation.childName,
    childAge: conversation.childAge,
    childInterest: conversation.childInterest,
    contactMethod: "telegram",
    contactValue: contactValue(conversation),
    privacyConsent: true,
    referralCode: conversation.referralCode,
  });
  await saveTelegramConversation(conversation.chatId, {
    orderReference: reference,
    stage: "human_mode",
    humanMode: true,
    lastMessageAt: new Date(),
  });
  const ownerNotified = await notifyRenderOwner({
    title: `طلب بوت جديد — ${reference}`,
    content: `الطفل: ${conversation.childName} (${formatChildAgeRange(conversation.childAge)})\nالاهتمام: ${conversation.childInterest}\nتيليجرام: ${contactValue(conversation)}\nالمصدر: ${conversation.referralCode ?? "بوت مباشر"}`,
  });
  if (ownerNotified) await saveTelegramConversation(conversation.chatId, { ownerNotifiedAt: new Date() });
  return reference;
}

async function handleOwnerCommand(message: TelegramMessage) {
  const text = message.text?.trim() ?? "";
  if (String(message.chat.id) !== ownerChatId()) return false;
  const replyMatch = text.match(/^\/reply\s+(\d+)\s+([\s\S]+)$/i);
  if (replyMatch) {
    const [, chatId, reply] = replyMatch;
    await sendMessage(chatId, reply);
    await sendMessage(ownerChatId(), "تم إرسال الرد للعميل.");
    return true;
  }
  const resumeMatch = text.match(/^\/(?:resume|استئناف)\s+(\d+)$/i);
  if (resumeMatch) {
    const chatId = resumeMatch[1];
    await saveTelegramConversation(chatId, { humanMode: false, stage: "welcome", lastMessageAt: new Date() });
    await sendMessage(chatId, "رجعنا للمساعدة الآلية. اختاري من القائمة أو اكتبي «موظف» في أي وقت.", mainKeyboard);
    await sendMessage(ownerChatId(), "تمت إعادة المحادثة للمساعدة الآلية.");
    return true;
  }
  if (text === "/admin" || text === "/owner") {
    await sendMessage(ownerChatId(), "أوامر الإدارة:\n/reply CHAT_ID نص الرد\n/resume CHAT_ID لإعادة الردود الآلية");
    return true;
  }
  return false;
}

async function handleMessage(message: TelegramMessage) {
  if (!message.from || message.chat.type !== "private") return;
  if (await handleOwnerCommand(message)) return;

  let conversation = await getTelegramConversation(String(message.chat.id));
  if (!conversation) {
    conversation = await saveTelegramConversation(String(message.chat.id), {
      telegramUserId: String(message.from.id),
      username: message.from.username ?? null,
      firstName: message.from.first_name ?? "زائر",
      stage: "welcome",
      humanMode: false,
      lastMessageAt: new Date(),
    });
  } else {
    conversation = await saveTelegramConversation(conversation.chatId, {
      telegramUserId: String(message.from.id),
      username: message.from.username ?? conversation.username,
      firstName: message.from.first_name ?? conversation.firstName,
      lastMessageAt: new Date(),
    });
  }

  const text = message.text?.trim() ?? "";
  const normalized = text.toLowerCase();
  const isResetCommand = normalized === "/start" || normalized.startsWith("/start ") || normalized === "/cancel" || text === "إلغاء";

  // Reset commands must always win over human mode; otherwise the bot keeps forwarding them.
  if (conversation.humanMode && !isResetCommand) {
    if (message.photo || message.document) {
      await telegramCall("forwardMessage", { chat_id: ownerChatId(), from_chat_id: message.chat.id, message_id: message.message_id });
      await notifyOwner(`📎 وصلت مرفقات من ${contactValue(conversation)}. راجع المحادثة وأرسل الرد عبر /reply ${conversation.chatId} نص الرد`);
      await sendMessage(message.chat.id, "وصلت المرفقات، وسأخلي صاحب المشروع يراجعها ويرد عليك.");
    } else {
      await telegramCall("forwardMessage", { chat_id: ownerChatId(), from_chat_id: message.chat.id, message_id: message.message_id });
      await sendMessage(message.chat.id, "وصلت رسالتك، وبيرد عليك صاحب المشروع قريبًا.");
    }
    return;
  }

  if (normalized === "/start" || normalized.startsWith("/start ")) {
    const startArgument = text.split(/\s+/)[1] ?? "";
    const linkedOrder = /^BS-[A-Z0-9_-]+$/i.test(startArgument) ? await getRenderConversationOrderByReference(startArgument.toUpperCase()) : null;
    if (linkedOrder) {
      const linkedConversation = await saveTelegramConversation(conversation.chatId, {
        childName: linkedOrder.childName,
        childAge: linkedOrder.childAge,
        childInterest: linkedOrder.childInterest,
        referralCode: linkedOrder.referralCode,
        orderReference: linkedOrder.reference,
        stage: "human_mode",
        humanMode: true,
        lastMessageAt: new Date(),
      });
      await notifyOwner(`🔗 فتح العميل رقم ${linkedOrder.reference} محادثة البوت.\nالعميل: ${contactValue(linkedConversation)}\nالطفل: ${linkedOrder.childName} (${formatChildAgeRange(linkedOrder.childAge)})`);
      await sendMessage(message.chat.id, `وصلني طلبك رقم ${linkedOrder.reference}. أرسلت التفاصيل لصاحب المشروع، وبيتواصل معك شخصيًا. لا ترسلين صورة الطفل الآن؛ نطلبها بعد التفاهم المبدئي.`, contactKeyboard);
      return;
    }
    const referralCode = startArgument || null;
    await saveTelegramConversation(conversation.chatId, { stage: "welcome", referralCode, humanMode: false, lastMessageAt: new Date() });
    await sendMessage(message.chat.id, "أهلًا بك في «بطل قصتي» 🌿\n\nأقدر أشرح لك الخدمة والسعر والأمثلة، أو أبدأ أجمع فكرة قصة طفلك. اختاري من الخيارات، وإذا تبين شخصًا من الفريق اكتبي «أريد موظفًا».", mainKeyboard);
    return;
  }

  if (normalized === "/help" || normalized === "مساعدة") {
    await sendMessage(message.chat.id, helpText(), mainKeyboard);
    return;
  }

  if (normalized === "/price" || text.includes("السعر") || text.includes("كم")) {
    await sendMessage(message.chat.id, priceText(), mainKeyboard);
    return;
  }

  if (text.includes("كيف تعمل") || text.includes("الخدمة")) {
    await sendMessage(message.chat.id, serviceText(), mainKeyboard);
    return;
  }

  if (text.includes("أمثلة") || normalized === "/examples") {
    await sendMessage(message.chat.id, examplesText(), mainKeyboard);
    return;
  }

  if (text.includes("موظف") || text.includes("بشري") || text.includes("شخص") || normalized === "/human") {
    await handoffToHuman(conversation, "طلب العميل التواصل مع شخص");
    await sendMessage(message.chat.id, "أكيد. أوقفت الردود الآلية وبأرسل تفاصيلك لصاحب المشروع، وبيتواصل معك شخصيًا. إذا عندك سؤال أو صورة، اكتبها هنا.", contactKeyboard);
    return;
  }

  if (text === "إلغاء" || normalized === "/cancel") {
    await saveTelegramConversation(conversation.chatId, { stage: "welcome", humanMode: false, childName: null, childAge: null, childInterest: null, lastMessageAt: new Date() });
    await sendMessage(message.chat.id, "تم الإلغاء. إذا حبيتي نبدأ من جديد اختاري «أريد قصة لطفلي».", mainKeyboard);
    return;
  }

  if (conversation.stage === "welcome") {
    await saveTelegramConversation(conversation.chatId, { stage: "collect_name", lastMessageAt: new Date() });
    await sendMessage(message.chat.id, "جميل. ما اسم الطفل الذي تحبين يظهر في القصة؟", contactKeyboard);
    return;
  }

  if (conversation.stage === "collect_name") {
    if (text.length < 2 || text.length > 80) {
      await sendMessage(message.chat.id, "اكتبي الاسم بين حرفين و80 حرفًا، أو اختاري «أريد موظفًا» إذا تفضلين المساعدة.", contactKeyboard);
      return;
    }
    await saveTelegramConversation(conversation.chatId, { childName: text, stage: "collect_age", lastMessageAt: new Date() });
    await sendMessage(message.chat.id, "كم عمر الطفل؟ اكتبي العمر بالسنوات، مثل: 5 أو 7.", contactKeyboard);
    return;
  }

  if (conversation.stage === "collect_age") {
    const age = Number.parseInt(text.replace(/[^0-9]/g, ""), 10);
    if (!Number.isInteger(age) || age < 2 || age > 14) {
      await sendMessage(message.chat.id, "اكتبي عمرًا بين سنتين و14 سنة، مثل: 6.", contactKeyboard);
      return;
    }
    await saveTelegramConversation(conversation.chatId, { childAge: age, stage: "collect_interest", lastMessageAt: new Date() });
    await sendMessage(message.chat.id, "وش يحب طفلك؟ أو ما الفكرة التي تتمنين تكون عنها القصة؟ اكتبيها بجملة بسيطة.", contactKeyboard);
    return;
  }

  if (conversation.stage === "collect_interest") {
    if (text.length < 2 || text.length > 180) {
      await sendMessage(message.chat.id, "اكتبي فكرة قصيرة بين حرفين و180 حرفًا، مثل: يحب الفضاء ويتمنى يكتشف كوكبًا جديدًا.", contactKeyboard);
      return;
    }
    const updated = await saveTelegramConversation(conversation.chatId, { childInterest: text, stage: "confirm", lastMessageAt: new Date() });
    const summary = [
      "ممتاز، هذه التفاصيل التي سجلتها:",
      `اسم الطفل: ${updated.childName}`,
      `العمر: ${updated.childAge} سنة`,
      `الفكرة: ${updated.childInterest}`,
      "",
      "الباقة الأساسية تبدأ من 17 د.إ لقصة PDF من 8 صفحات، ونرسل معاينة قبل الدفع.",
      "هل أرسلها لصاحب المشروع ليبدأ معك؟",
    ].join("\n");
    await sendMessage(message.chat.id, summary, confirmKeyboard);
    return;
  }

  if (conversation.stage === "confirm") {
    if (text.includes("أعدل")) {
      await saveTelegramConversation(conversation.chatId, { stage: "collect_name", lastMessageAt: new Date() });
      await sendMessage(message.chat.id, "تمام. ما اسم الطفل؟", contactKeyboard);
      return;
    }
    if (text.includes("نعم") || text.includes("ابدأ")) {
      const latest = await getTelegramConversation(conversation.chatId);
      if (!latest) return;
      const reference = await createOrderFromConversation(latest);
      await handoffToHuman(latest, "اكتمل جمع تفاصيل طلب جديد");
      await sendMessage(message.chat.id, `تم تسجيل البداية${reference ? ` برقم ${reference}` : ""}. أرسلت التفاصيل لصاحب المشروع، وبيتواصل معك شخصيًا. لا ترسلين صورة الطفل الآن؛ نطلبها بعد التفاهم المبدئي.`, contactKeyboard);
      return;
    }
    await sendMessage(message.chat.id, "اختاري «نعم، ابدأ الطلب» لإرسال التفاصيل، أو «أعدل البيانات» لتغييرها.", confirmKeyboard);
    return;
  }

  await sendMessage(message.chat.id, helpText(), mainKeyboard);
}

export async function handleTelegramWebhook(req: Request, res: Response) {
  if (!isConfigured()) {
    res.status(503).json({ error: "Telegram bot is not configured" });
    return;
  }
  if (WEBHOOK_SECRET && req.get("x-telegram-bot-api-secret-token") !== WEBHOOK_SECRET) {
    res.status(401).json({ error: "Unauthorized webhook" });
    return;
  }
  const update = req.body as TelegramUpdate;
  res.status(200).json({ ok: true });
  try {
    if (update.message) await handleMessage(update.message);
  } catch (error) {
    console.error("[Telegram] Failed to process update:", error);
    if (update.message?.chat?.id) {
      try { await sendMessage(update.message.chat.id, "صار عندي عطل مؤقت. اكتبي «أريد موظفًا» أو حاولي بعد قليل."); } catch { /* keep webhook successful */ }
    }
  }
}

export async function initializeTelegramBot() {
  await migrateTelegramBotDatabase();
  if (!isConfigured()) {
    console.warn("[Telegram] Bot disabled: TELEGRAM_BOT_TOKEN or TELEGRAM_OWNER_ID is missing.");
    return;
  }
  try {
    const bot = await telegramCall<{ username?: string }>("getMe", {});
    await telegramCall("setMyCommands", {
      commands: [
        { command: "start", description: "بدء المحادثة" },
        { command: "price", description: "معرفة الأسعار" },
        { command: "examples", description: "مشاهدة الأمثلة" },
        { command: "human", description: "التواصل مع موظف" },
        { command: "help", description: "المساعدة" },
      ],
    });
    if (WEBHOOK_URL) {
      await telegramCall("setWebhook", {
        url: WEBHOOK_URL,
        allowed_updates: ["message"],
        ...(WEBHOOK_SECRET ? { secret_token: WEBHOOK_SECRET } : {}),
      });
      console.log(`[Telegram] Bot ready${bot.username ? ` @${bot.username}` : ""}; webhook configured.`);
    } else {
      console.log(`[Telegram] Bot ready${bot.username ? ` @${bot.username}` : ""}; TELEGRAM_WEBHOOK_URL is not configured.`);
    }
  } catch (error) {
    console.error("[Telegram] Bot setup failed:", error);
  }
}

export async function sendTelegramTestMessage(text: string) {
  if (!isConfigured()) return false;
  await sendMessage(ownerChatId(), text);
  return true;
}

export type { BotStage, OrderStatus };
