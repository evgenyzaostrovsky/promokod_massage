const ALLOWED_ACTIONS = new Set([
  "Оформить VIP-доставку",
  "Перенести VIP-доставку",
  "Да",
  "Ок",
  "Хорошо",
  "Оформить выбранное",
  "Подтвердить время",
  "Подтвердить бронирование",
  "Забронировать Jenka Bar",
  "Выбрана VIP-доставка",
  "Выбран Jenka Bar",
  "Мини-игра пройдена",
  "Математика: верно",
  "Математика: неверно",
  "Квест переноса",
]);
const ALLOWED_ENTERTAINMENTS = new Set([
  "Море", "Душевные разговоры у костра", "Музыка", "Мангальная зона", "Кальян",
  "Алкоголь (вино, ром, пиво)", "Отопление", "Теплая одежда в стиле бомж-стайл",
  "Спальное место", "Приятное продолжение вечера",
]);

const ALLOWED_SERVICES = new Set([
  "Классический массаж",
  "Массаж ножек",
  "Эротический массаж",
  "Ролевые игры",
  "БДСМ-практики",
  "Светское сопровождение",
  "Кунилингус и ласки",
  "Психологическая поддержка и забота",
]);

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return response.status(503).json({ error: "Notifications are not configured" });
  }

  let body;
  try {
    body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
  } catch {
    return response.status(400).json({ error: "Invalid JSON" });
  }
  const action = String(body?.action || "").trim();
  const services = Array.isArray(body?.services)
    ? [...new Set(body.services.map((service) => String(service).trim()))].filter((service) =>
        ALLOWED_SERVICES.has(service)
      )
    : [];
  const deliveryTime = String(body?.deliveryTime || "").trim();
  const bookingDate = String(body?.bookingDate || "").trim();
  const mode = body?.mode === "jenka" ? "jenka" : "delivery";
  const entertainments = Array.isArray(body?.entertainments)
    ? [...new Set(body.entertainments.map((item) => String(item).trim()))].filter((item) => ALLOWED_ENTERTAINMENTS.has(item))
    : [];
  const preferences = String(body?.preferences || "").trim().slice(0, 500);
  const address = String(body?.address || "").trim().slice(0, 200);
  const questStep = Number(body?.questStep);

  if (!ALLOWED_ACTIONS.has(action)) {
    return response.status(400).json({ error: "Unknown action" });
  }
  if (action === "Квест переноса" && (!Number.isInteger(questStep) || questStep < 1 || questStep > 10)) {
    return response.status(400).json({ error: "Invalid quest step" });
  }

  const isConfirmation = action === "Подтвердить время" || action === "Подтвердить бронирование";
  const validBookingDate = /^\d{4}-\d{2}-\d{2}$/.test(bookingDate) &&
    !Number.isNaN(Date.parse(`${bookingDate}T00:00:00Z`)) &&
    new Date(`${bookingDate}T00:00:00Z`).toISOString().slice(0, 10) === bookingDate &&
    bookingDate >= new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  if (isConfirmation && (
    !(mode === "delivery" ? services.length : entertainments.length) && !preferences ||
    (mode === "delivery" && (action !== "Подтвердить время" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(deliveryTime) || !address || /[\r\n]/.test(address))) ||
    (mode === "jenka" && (action !== "Подтвердить бронирование" || !validBookingDate))
  )) {
    return response.status(400).json({ error: "Invalid order details" });
  }

  const timestamp = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date());

  const servicesText = services.length
    ? `\n\nВыбранные услуги:\n${services.map((service) => `• ${service}`).join("\n")}`
    : "";
  const deliveryTimeText = deliveryTime ? `\n${mode === "jenka" ? "🏡 Время бронирования" : "🛵 Время приезда"}: ${deliveryTime}` : "";
  const bookingDateText = bookingDate && mode === "jenka" ? `\n🏡 Дата бронирования: ${bookingDate.split("-").reverse().join(".")}` : "";
  const entertainmentsText = entertainments.length
    ? `\n\nРазвлечения:\n${entertainments.map((item) => `• ${item}`).join("\n")}` : "";
  const preferencesText = preferences ? `\n\nПредпочтения: ${preferences}` : "";
  const addressText = mode === "delivery" && address ? `\n📍 Адрес: г. Волгоград, ${address}` : "";

  const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: `🔥 ${isConfirmation ? mode === "delivery" ? "Новая VIP-доставка" : "Новая бронь Jenka Bar" : `Нажата кнопка: ${action}${action === "Квест переноса" ? ` · ${questStep}/10` : ""}`}${servicesText}${entertainmentsText}${preferencesText}${deliveryTimeText}${bookingDateText}${addressText}\n\n🕒 ${timestamp} МСК`,
    }),
  });

  if (!telegramResponse.ok) {
    return response.status(502).json({ error: "Telegram notification failed" });
  }

  return response.status(204).end();
}
