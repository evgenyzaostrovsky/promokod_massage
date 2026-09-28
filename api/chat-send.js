const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return response.status(503).json({ error: "Chat is not configured" });

  let body;
  try { body = typeof request.body === "string" ? JSON.parse(request.body) : request.body; }
  catch { return response.status(400).json({ error: "Invalid JSON" }); }

  const conversationId = String(body?.conversationId || "").trim();
  const phone = String(body?.phone || "").replace(/\D/g, "");
  const text = String(body?.text || "").trim().slice(0, 1000);
  if (!UUID_PATTERN.test(conversationId) || !/^7\d{10}$/.test(phone) || !text) {
    return response.status(400).json({ error: "Invalid message" });
  }

  const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: `💬 Сообщение из приложения\nКлиент: +${phone}\n\n${text}\n\n[CHAT:${conversationId}]`,
    }),
  });
  if (!telegramResponse.ok) return response.status(502).json({ error: "Telegram send failed" });
  const result = await telegramResponse.json();
  return response.status(200).json({ messageId: result.result?.message_id || null });
}
