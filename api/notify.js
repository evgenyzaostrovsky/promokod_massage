const ALLOWED_ACTIONS = new Set([
  "Оформить VIP-доставку",
  "Перенести VIP-доставку",
  "Да",
  "Ок",
  "Хорошо",
  "Оформить выбранное",
  "Подтвердить время",
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

  if (!ALLOWED_ACTIONS.has(action)) {
    return response.status(400).json({ error: "Unknown action" });
  }

  if (action === "Подтвердить время" && (!services.length || !/^([01]\d|2[0-3]):[0-5]\d$/.test(deliveryTime))) {
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
  const deliveryTimeText = deliveryTime ? `\n🛵 Время приезда: ${deliveryTime}` : "";

  const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: `🔥 Нажата кнопка: ${action}${servicesText}${deliveryTimeText}\n\n🕒 ${timestamp} МСК`,
    }),
  });

  if (!telegramResponse.ok) {
    return response.status(502).json({ error: "Telegram notification failed" });
  }

  return response.status(204).end();
}
